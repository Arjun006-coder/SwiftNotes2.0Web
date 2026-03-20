import { Liveblocks } from "@liveblocks/node";
import { currentUser } from "@clerk/nextjs/server";

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

            const session = liveblocks.prepareSession(user.id, {
                userInfo: {
                    name: user.fullName || user.emailAddresses[0]?.emailAddress || "Anonymous",
                    avatar: user.imageUrl || "",
                },
            });

            const { room } = await request.json();

            // Give the user full access to the requested room
            session.allow(room, session.FULL_ACCESS);

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
