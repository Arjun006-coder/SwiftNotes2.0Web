"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function getCommunityNotebooks(search: string = "", tagFilters: string[] = [], sortOption: string = "trending") {
    try {
        let query = supabaseAdmin
            .from("Notebook")
            .select(`
                id, title, description, tags, likes, "isPublic",
                "coverColor", "createdAt", "updatedAt", "userId",
                user:User(id, name, email, avatar),
                comments:NotebookComment(count)
            `)
            .eq("isPublic", true);

        // Reddit-Style Sorting Filters
        if (sortOption === "newest") {
            query = query.order("createdAt", { ascending: false });
        } else if (sortOption === "topWeek") {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query = query.gte("createdAt", lastWeek.toISOString()).order("likes", { ascending: false });
        } else if (sortOption === "topAllTime") {
            query = query.order("likes", { ascending: false }).order("updatedAt", { ascending: false });
        } else {
            query = query.order("likes", { ascending: false }).order("updatedAt", { ascending: false });
        }

        query = query.limit(50);

        const actualTags = tagFilters.filter((t: string) => t && t !== "All");

        if (search.trim() || actualTags.length > 0) {
            let orQueries = [];
            const safeSearch = search.trim().replace(/,/g, ' ');

            if (safeSearch) {
                orQueries.push(`title.ilike.%${safeSearch}%`);
                orQueries.push(`description.ilike.%${safeSearch}%`);
                
                // Advanced Semantic Search Engine via Gemini
                try {
                    // Pre-fetch all global exact tags efficiently
                    const { data: dbTags } = await supabaseAdmin.from("Notebook").select("tags");
                    const allTags = Array.from(new Set(dbTags?.flatMap(n => n.tags || []) || []));
                    const globalTags = allTags.filter(t => t);

                    if (globalTags.length > 0 && process.env.GEMINI_API_KEY) {
                        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                        const prompt = `You are a semantic NLP search engine. 
Given the user's search query "${safeSearch}", find up to 10 most semantically related tags from this exact list of available database tags.
Available distinct tags in database: ${JSON.stringify(globalTags)}
Analyze the search intent. Return a JSON array of up to 20 strictly exact tags from the provided list that are semantically identical or highly relevant. Output ONLY a raw JSON array of strings ([ "tag1", "tag2" ]), no markdown blocks, no text.`;
                        
                        const result = await model.generateContent(prompt);
                        const aiResp = result.response.text().replace(/[\s\S]*?(\[[\s\S]*\])[\s\S]*/, "$1").trim();
                        if (aiResp.startsWith("[") && aiResp.endsWith("]")) {
                            const semanticTags = JSON.parse(aiResp);
                            if (semanticTags.length > 0) {
                                // Add AI exact-match tags to the OR query payload
                                const mappedAiTags = semanticTags.map((t: string) => `"${t.replace(/"/g, '')}"`).join(',');
                                orQueries.push(`tags.ov.{${mappedAiTags}}`);
                            }
                        }
                    }
                } catch (e) { console.warn("Gemini semantic fallback failed", e); }
                
                // Final fallback if AI failed: check the search string natively in tags
                orQueries.push(`tags.cs.{"${safeSearch}"}`);
            }

            if (actualTags.length > 0) {
                const safeTags = actualTags.map((t: string) => `"${t.replace(/"/g, '')}"`).join(',');
                orQueries.push(`tags.ov.{${safeTags}}`);
            }

            query = query.or(orQueries.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Clean up the Supabase array-count syntax globally
        if (data && data.length > 0) {
            data.forEach((n: any) => {
                n.commentCount = n.comments?.[0]?.count || 0;
                delete n.comments;
            });
        }
        
        // Hydrate personal interactions if user is logged in
        const dbUser = await syncUser();
        if (dbUser && data && data.length > 0) {
            const notebookIds = data.map((n: any) => n.id);
            
            // 1. Fetch Bookmarks
            const { data: favs } = await supabaseAdmin.from("UserFavorite").select("notebookId").eq("userId", dbUser.id).in("notebookId", notebookIds);
            const favSet = new Set(favs?.map(f => f.notebookId) || []);
            
            // 2. Fetch Votes
            const { data: votes } = await supabaseAdmin.from("NotebookVote").select("notebookId, value").eq("userId", dbUser.id).in("notebookId", notebookIds);
            const voteMap = new Map((votes || []).map(v => [v.notebookId, v.value]));

            return data.map((nb: any) => ({
                ...nb,
                isBookmarked: favSet.has(nb.id),
                myVote: voteMap.get(nb.id) || 0
            }));
        }

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
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
        .from("Notebook")
        .select("id")
        .eq("otp", otp)
        .single();

    if (error || !data) throw new Error("Invalid or Expired OTP");

    // Begin the Ephemeral Request Flow automatically upon OTP usage
    try {
        await supabaseAdmin
            .from("RoomAccessRequest")
            .upsert({ notebookId: data.id, userId: dbUser.id, status: 'pending' }, { onConflict: 'notebookId,userId' });
    } catch {
        // Ignores if they already requested
    }

    return data.id;
}

export async function checkNotebookAccess(notebookId: string) {
    const dbUser = await syncUser();
    if (!dbUser) return { isOwner: false, isCollaborator: false };

    const { data: notebook } = await supabaseAdmin
        .from("Notebook")
        .select("userId")
        .eq("id", notebookId)
        .single();

    if (!notebook) return { isOwner: false, isCollaborator: false };

    if (notebook.userId === dbUser.id) return { isOwner: true, isCollaborator: true };

    const { data: request } = await supabaseAdmin
        .from("RoomAccessRequest")
        .select("status")
        .eq("notebookId", notebookId)
        .eq("userId", dbUser.id)
        .maybeSingle();

    return { isOwner: false, isCollaborator: request?.status === "approved" };
}

// --- EPHEMERAL ROOM ACCESS MANAGEMENT ---

export async function requestEditAccess(notebookId: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
        .from("RoomAccessRequest")
        .upsert({ notebookId, userId: dbUser.id, status: 'pending' }, { onConflict: 'notebookId,userId' });
    if (error) throw new Error(error.message);
}

export async function getAllRoomRequests(notebookId: string) {
    const { userId } = await auth();
    if (!userId) return [];
    
    // To be perfectly safe, verify notebook ownership first
    const dbUser = await syncUser();
    const { data: nb } = await supabaseAdmin.from("Notebook").select("userId").eq("id", notebookId).single();
    if (nb?.userId !== dbUser?.id) return [];

    const { data } = await supabaseAdmin
        .from("RoomAccessRequest")
        .select(`
            userId,
            status,
            User:userId ( id, email, name, avatar )
        `)
        .eq("notebookId", notebookId)
        .order("createdAt", { ascending: false });

    return data || [];
}

export async function approveEditAccess(notebookId: string, guestUserId: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");
    const { data: nb } = await supabaseAdmin.from("Notebook").select("userId").eq("id", notebookId).single();
    if (nb?.userId !== dbUser.id) throw new Error("Forbidden"); // Only owner can approve

    await supabaseAdmin
        .from("RoomAccessRequest")
        .upsert({ notebookId, userId: guestUserId, status: 'approved' }, { onConflict: 'notebookId,userId' });
}

export async function rejectEditAccess(notebookId: string, guestUserId: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");
    const { data: nb } = await supabaseAdmin.from("Notebook").select("userId").eq("id", notebookId).single();
    if (nb?.userId !== dbUser.id) throw new Error("Forbidden");

    await supabaseAdmin
        .from("RoomAccessRequest")
        .delete()
        .eq("notebookId", notebookId)
        .eq("userId", guestUserId);
}

export async function revokeEditAccess(notebookId: string, guestUserId: string) {
    // Both Owner and Guest can revoke (e.g., Guest drops presence -> Auto Purge)
    await supabaseAdmin
        .from("RoomAccessRequest")
        .delete()
        .eq("notebookId", notebookId)
        .eq("userId", guestUserId);
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

export async function getFavoriteNotebooks() {
    const dbUser = await syncUser();
    if (!dbUser) return [];

    const { data, error } = await supabaseAdmin
        .from("UserFavorite")
        .select(`
            notebookId,
            notebook:Notebook(
                id, title, description, tags, likes, "isPublic",
                "coverColor", "createdAt", "updatedAt", "userId"
            )
        `)
        .eq("userId", dbUser.id)
        .order("createdAt", { ascending: false });

    if (error) {
        console.error("Failed to fetch favorites:", error.message);
        return [];
    }

    // Extract the nested structured notebook objects
    return data.map((fav: any) => fav.notebook).filter(Boolean);
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

// ==========================================
// REDDIT-STYLE COMMUNITY FEATURES
// ==========================================

export async function voteNotebook(notebookId: string, value: 1 | -1 | 0) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");

    // Fetch previous vote to calculate pure atomic payload
    const { data: previous } = await supabaseAdmin
        .from("NotebookVote")
        .select("value")
        .eq("notebookId", notebookId)
        .eq("userId", dbUser.id)
        .single();
    
    const prevValue = previous ? previous.value : 0;
    const delta = value - prevValue;

    if (value === 0) {
        await supabaseAdmin.from("NotebookVote").delete().eq("notebookId", notebookId).eq("userId", dbUser.id);
    } else {
        await supabaseAdmin
            .from("NotebookVote")
            .upsert({ notebookId, userId: dbUser.id, value }, { onConflict: "notebookId,userId" });
    }

    // Mutate the physical likes metric natively and atomically
    const { data: notebook } = await supabaseAdmin.from("Notebook").select("likes").eq("id", notebookId).single();
    const currentLikes = notebook ? (notebook.likes || 0) : 0;
    const newScore = currentLikes + delta;
    
    await supabaseAdmin.from("Notebook").update({ likes: newScore }).eq("id", notebookId);

    return newScore;
}

export async function toggleBookmark(notebookId: string, isBookmarked: boolean) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");

    if (isBookmarked) {
        await supabaseAdmin.from("UserFavorite").upsert({ notebookId, userId: dbUser.id }, { onConflict: "notebookId,userId" });
    } else {
        await supabaseAdmin.from("UserFavorite").delete().eq("notebookId", notebookId).eq("userId", dbUser.id);
    }
}

export async function getNotebookComments(notebookId: string) {
    const dbUser = await syncUser();
    const { data } = await supabaseAdmin
        .from("NotebookComment")
        .select(`id, content, "parentId", createdAt, userId, User:userId ( id, name, email, avatar )`) // Using raw SQL column directly natively
        .eq("notebookId", notebookId)
        .order("createdAt", { ascending: true });
    
    return (data || []).map((c: any) => ({
        ...c,
        isOwner: dbUser ? c.userId === dbUser.id : false
    }));
}

export async function addNotebookComment(notebookId: string, content: string, parentId?: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");
    if (!content.trim()) throw new Error("Comment cannot be completely empty.");

    const payload: any = { notebookId, userId: dbUser.id, content: content.trim() };
    if (parentId) payload.parentId = parentId; // Direct SQL mapped column

    const { data: inserted, error: insertError } = await supabaseAdmin
        .from("NotebookComment")
        .insert(payload)
        .select()
        .single();
    
    if (insertError) throw new Error(insertError.message);

    const { data } = await supabaseAdmin
        .from("NotebookComment")
        .select(`id, content, "parentId", createdAt, userId, User:userId ( id, name, email, avatar )`)
        .eq("id", inserted.id)
        .single();

    return data;
}

export async function editNotebookComment(commentId: string, newContent: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");
    if (!newContent.trim()) throw new Error("Comment cannot be empty.");

    const { data: comment } = await supabaseAdmin.from("NotebookComment").select("userId").eq("id", commentId).single();
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== dbUser.id) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("NotebookComment").update({ content: newContent.trim() }).eq("id", commentId);
    if (error) throw new Error(error.message);
}

export async function deleteNotebookComment(commentId: string) {
    const dbUser = await syncUser();
    if (!dbUser) throw new Error("Unauthorized");

    const { data: comment } = await supabaseAdmin.from("NotebookComment").select("userId").eq("id", commentId).single();
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== dbUser.id) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("NotebookComment").delete().eq("id", commentId);
    if (error) throw new Error(error.message);
}

export async function logNotebookView(notebookId: string) {
    // Highly efficient read-modify-write for views without custom RPC
    try {
        const { data } = await supabaseAdmin.from("Notebook").select("views").eq("id", notebookId).single();
        if (data !== null) {
            await supabaseAdmin.from("Notebook").update({ views: (data.views || 0) + 1 }).eq("id", notebookId);
        }
    } catch { }
}
