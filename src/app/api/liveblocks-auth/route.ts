import { Liveblocks } from "@liveblocks/node";
import { currentUser } from "@clerk/nextjs/server";
import { checkNotebookAccess, syncUser } from "@/app/actions";

export const maxDuration = 10; // 10 second max — fail fast instead of 16-min hang

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY || "sk_test_dummy_key_please_replace",
});

export async function POST(request: Request) {
    // Wrap entire auth in a 8-second timeout so the page doesn't hang
    const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Liveblocks auth timeout")), 8000)
    );

    const authPromise = (async (): Promise<Response> => {
        try {
            const user = await currentUser();

            if (!user) {
                return new Response("Unauthorized", { status: 401 });
            }

            const dbUser = await syncUser();
            if (!dbUser) return new Response("Unauthorized", { status: 401 });

            const session = liveblocks.prepareSession(dbUser.id, {
                userInfo: {
                    name: user.fullName || user.emailAddresses[0]?.emailAddress || "Anonymous",
                    avatar: user.imageUrl || "",
                },
            });

            const { room } = await request.json();
            const notebookId = room.replace("notebook-", "");

            const access = await checkNotebookAccess(notebookId);
            const canEdit = access.isOwner || access.isCollaborator;

            // Protect the room: Owners & OTP-Collaborators get FULL Edit, random Community Visitors get READ_ACCESS
            session.allow(room, canEdit ? session.FULL_ACCESS : session.READ_ACCESS);

            const { status, body } = await session.authorize();
            return new Response(body, { status });
        } catch (error) {
            console.error("Liveblocks Auth Error:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    })();

    try {
        return await Promise.race([authPromise, timeoutPromise]);
    } catch {
        // Timeout — return a clean error so the page doesn't hang
        console.warn("Liveblocks auth timed out after 8s, returning 503");
        return new Response("Service temporarily unavailable", { status: 503 });
    }
}
