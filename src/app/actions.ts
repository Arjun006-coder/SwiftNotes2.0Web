"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, auth } from "@clerk/nextjs/server";

export async function syncUser() {
    const user = await currentUser();
    if (!user) return null;

    const { data, error } = await supabaseAdmin
        .from("User")
        .upsert({
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
            name: user.fullName,
            avatar: user.imageUrl,
            updatedAt: new Date().toISOString(),
        }, { onConflict: "clerkId" })
        .select()
        .single();

    if (error) {
        console.error("Error syncing user:", error.message);
        return null;
    }

    return data;
}

export async function getNotebooks() {
    const user = await currentUser();
    if (!user) return [];

    // First ensure user is synced
    const dbUser = await syncUser();
    if (!dbUser) return [];

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .select("*")
        .eq("userId", dbUser.id)
        .order("updatedAt", { ascending: false });

    if (error) {
        console.error("Error fetching notebooks:", error.message);
        return [];
    }

    return data;
}

export async function createNotebook(title: string, coverColor: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("User not authenticated");

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .insert({
            userId: dbUser.id,
            title,
            coverColor,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating notebook:", error.message);
        throw new Error(error.message);
    }

    return data;
}

export async function getNotebook(id: string) {
    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .select("*, pages:NotePage(*, snaps:Snap(*))")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching notebook:", error.message);
        return null;
    }

    return data;
}

export async function updateNotePageContent(pageId: string, content: string) {
    const { data, error } = await supabaseAdmin
        .from("NotePage")
        .update({ content })
        .eq("id", pageId)
        .select()
        .single();

    if (error) {
        console.error("Error updating page content:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function updateNotePageDrawing(pageId: string, drawingData: string) {
    const { data, error } = await supabaseAdmin
        .from("NotePage")
        .update({ drawingData })
        .eq("id", pageId)
        .select()
        .single();

    if (error) {
        console.error("Error updating page drawing:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function createNotePage(notebookId: string, pageNumber: number) {
    const { data, error } = await supabaseAdmin
        .from("NotePage")
        .insert({
            notebookId,
            pageNumber,
            content: "",
            drawingData: null
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            // Unique constraint violation (likely React Strict Mode double-invocation)
            const { data: existing } = await supabaseAdmin
                .from("NotePage")
                .select()
                .eq("notebookId", notebookId)
                .eq("pageNumber", pageNumber)
                .single();
            if (existing) return existing;
        }
        console.error("Error creating note page:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function updateSnapPosition(snapId: string, x: number, y: number) {
    const { error } = await supabaseAdmin
        .from("Snap")
        .update({ x, y })
        .eq("id", snapId);
    if (error) console.error("updateSnapPosition error:", error.message);
}

export async function createSnap(pageId: string, imageUrl: string, caption: string = "") {
    const { data, error } = await supabaseAdmin
        .from("Snap")
        .insert({
            notePageId: pageId,   // matches existing DB schema column name
            imageUrl,
            caption,
            x: 50,
            y: 80,
            rotation: Math.floor(Math.random() * 14) - 7
        })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function toggleNotebookPrivacy(notebookId: string, isPublic: boolean) {
    // If publishing, validate that tags are set
    if (isPublic) {
        const { data: nb } = await supabaseAdmin
            .from("Notebook")
            .select("tags")
            .eq("id", notebookId)
            .single();
        if (!nb?.tags || nb.tags.length === 0) {
            throw new Error("Please add at least one tag before publishing to the community.");
        }
    }
    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ isPublic, updatedAt: new Date().toISOString() })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) {
        console.error("Error toggling privacy:", error.message);
        throw new Error(error.message);
    }
    return data;
}

export async function addNotebookVideo(notebookId: string, url: string, title: string = "") {
    // Fetch existing videos array
    const { data: nb } = await supabaseAdmin
        .from("Notebook")
        .select("videos, youtubeUrl")
        .eq("id", notebookId)
        .single();

    const existingVideos: string[] = nb?.videos || [];

    // Extract videoId
    let videoId = "";
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) videoId = u.searchParams.get("v") || "";
        else if (u.hostname === "youtu.be") videoId = u.pathname.slice(1).split("?")[0];
    } catch { videoId = url; }

    // Avoid duplicates
    const alreadyAdded = existingVideos.some(v => { try { return JSON.parse(v).videoId === videoId; } catch { return false; } });
    if (alreadyAdded) return nb;

    const entry = JSON.stringify({ url, title: title || `Video ${existingVideos.length + 1}`, videoId });
    const updatedVideos = [...existingVideos, entry];

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ videos: updatedVideos, youtubeUrl: url, updatedAt: new Date().toISOString() })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function removeNotebookVideo(notebookId: string, videoId: string) {
    const { data: nb } = await supabaseAdmin
        .from("Notebook")
        .select("videos")
        .eq("id", notebookId)
        .single();

    const existingVideos: string[] = nb?.videos || [];
    const updatedVideos = existingVideos.filter(v => {
        try { return JSON.parse(v).videoId !== videoId; } catch { return true; }
    });

    // Update youtubeUrl to the last remaining video or null
    let lastUrl: string | null = null;
    if (updatedVideos.length > 0) {
        try { lastUrl = JSON.parse(updatedVideos[updatedVideos.length - 1]).url; } catch { }
    }

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ videos: updatedVideos, youtubeUrl: lastUrl, updatedAt: new Date().toISOString() })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function updateNotebookVideoAINotes(notebookId: string, videoId: string, aiNotes: any) {
    const { data: nb } = await supabaseAdmin
        .from("Notebook")
        .select("videos")
        .eq("id", notebookId)
        .single();

    const existingVideos: string[] = nb?.videos || [];
    const updatedVideos = existingVideos.map(vStr => {
        try {
            const v = JSON.parse(vStr);
            if (v.videoId === videoId) {
                // Merge existing aiNotes with new aiNotes
                v.aiNotes = { ...(v.aiNotes || {}), ...aiNotes };
                return JSON.stringify(v);
            }
        } catch { }
        return vStr;
    });

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ videos: updatedVideos, updatedAt: new Date().toISOString() })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

// Keep compatibility alias
export async function updateNotebookYoutubeUrl(notebookId: string, youtubeUrl: string | null) {
    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ youtubeUrl })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function deleteNotePage(pageId: string) {
    const { data, error } = await supabaseAdmin
        .from("NotePage")
        .delete()
        .eq("id", pageId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function deleteNotebook(notebookId: string) {
    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .delete()
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function getCommunityNotebooks(search: string = "", tagFilter: string = "") {
    try {
        let query = supabaseAdmin
            .from("Notebook")
            .select(`
                id, title, description, tags, likes, "isPublic",
                "coverColor", "createdAt", "updatedAt", "userId",
                user:User(id, name, email, avatar)
            `)
            .eq("isPublic", true)
            .order("likes", { ascending: false })
            .order("updatedAt", { ascending: false })
            .limit(50);

        // Text search across title and description
        if (search.trim()) {
            // .or() for dual-field ilike
            query = query.or(
                `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
            );
        }

        // Tag filter
        if (tagFilter && tagFilter !== "All") {
            query = query.contains("tags", [tagFilter]);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error("Community fetch error:", error.message);
        return null;
    }
}

export async function getUserProfileStats() {
    try {
        const dbUser = await syncUser();
        if (!dbUser) return null;

        const { data: notebooks, error: notebookError } = await supabaseAdmin
            .from("Notebook")
            .select("id")
            .eq("userId", dbUser.id);

        if (notebookError) throw notebookError;

        let totalPages = 0;
        if (notebooks && notebooks.length > 0) {
            const notebookIds = notebooks.map(n => n.id);
            const { count } = await supabaseAdmin
                .from("NotePage")
                .select('*', { count: 'exact', head: true })
                .in("notebookId", notebookIds);
            totalPages = count || 0;
        }

        const stats = await getUserStats();

        const studyMins = stats?.studyTimeMinutes || 0;
        const studyHours = Math.floor(studyMins / 60);
        // Fall back to targetHours if studyTimeMinutes not yet populated
        const studyDisplay = studyMins > 0
            ? (studyHours >= 1 ? `${studyHours}h` : `${studyMins}m`)
            : stats?.targetHours ? `${stats.targetHours * (stats.streakCount || 1)}h` : "0h";

        return {
            totalNotebooks: notebooks?.length || 0,
            pagesWritten: totalPages,
            studyTime: studyDisplay,
            reputation: stats?.reputation || 0,
            streak: stats?.streakCount || 0
        };
    } catch (error: any) {
        console.error("Stats fetch error:", error.message);
        return null;
    }
}

// ==========================================
// SNAP MANAGEMENT
// ==========================================

export async function deleteSnap(snapId: string) {
    // 1. Fetch snap to get imageUrl
    const { data: snap } = await supabaseAdmin
        .from("Snap")
        .select("imageUrl")
        .eq("id", snapId)
        .single();

    // 2. Delete the database row
    const { error } = await supabaseAdmin
        .from("Snap")
        .delete()
        .eq("id", snapId);
    if (error) throw new Error(error.message);

    // 3. Clean up Supabase Storage if it was an uploaded file
    try {
        if (snap?.imageUrl && snap.imageUrl.includes("/storage/v1/object/public/snap-media/")) {
            const path = snap.imageUrl.split("/snap-media/")[1];
            if (path) {
                await supabaseAdmin.storage.from("snap-media").remove([path]);
            }
        }
    } catch (err) {
        console.error("Failed to delete storage object:", err);
    }

    return true;
}

// ==========================================
// NOTEBOOK METADATA
// ==========================================

export async function updateNotebook(notebookId: string, fields: { description?: string; tags?: string[]; isPublic?: boolean }) {
    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ ...fields, updatedAt: new Date().toISOString() })
        .eq("id", notebookId)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

// ==========================================
// OTP LIVE ROOMS & PRODUCTIVITY
// ==========================================

export async function generateNotebookOTP(notebookId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .update({ otp })
        .eq("id", notebookId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function joinNotebookByOTP(otp: string) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .select("id")
        .eq("otp", otp)
        .single();

    if (error || !data) throw new Error("Invalid or Expired OTP");

    return data.id;
}

export async function getUserStats() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get internal DB user
    let { data: user } = await supabaseAdmin
        .from("User")
        .select("id")
        .eq("clerkId", userId)
        .single();
    if (!user) return null;

    // Use the Postgres function to atomically update the streak
    // This also writes a StreakHistory row for date tracking
    const { data: stats, error } = await supabaseAdmin
        .rpc("update_user_streak", { p_user_id: user.id });

    if (error) {
        console.error("Streak RPC error:", error.message);
        // Fallback: just fetch current stats without updating
        const { data: fallback } = await supabaseAdmin
            .from("UserStats")
            .select("*")
            .eq("userId", user.id)
            .single();
        return fallback;
    }

    return stats;
}

export async function getNotebookIdByOTP(otp: string) {
    if (!otp || otp.length < 6) return null;
    const { data } = await supabaseAdmin
        .from("Notebook")
        .select("id")
        .order("updatedAt", { ascending: false })
        .limit(1000); // Efficient client-side lookup for MVP without schema changes

    if (!data) return null;
    const match = data.find(n => n.id.substring(0, 6).toUpperCase() === otp.toUpperCase());
    return match ? match.id : null;
}
