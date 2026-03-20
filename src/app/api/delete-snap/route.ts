import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * DELETE /api/delete-snap?id=<snapId>
 * API route instead of Server Action — avoids AbortError when component unmounts.
 */
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const snapId = searchParams.get("id");
        if (!snapId) return NextResponse.json({ error: "id required" }, { status: 400 });

        // Fetch imageUrl first
        const { data: snap } = await supabaseAdmin
            .from("Snap")
            .select("imageUrl")
            .eq("id", snapId)
            .single();

        // Delete row
        const { error } = await supabaseAdmin.from("Snap").delete().eq("id", snapId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Clean up storage if it was a storage upload
        try {
            if (snap?.imageUrl?.includes("/storage/v1/object/public/snap-media/")) {
                const path = snap.imageUrl.split("/snap-media/")[1];
                if (path) await supabaseAdmin.storage.from("snap-media").remove([path]);
            }
        } catch { /* non-critical */ }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
