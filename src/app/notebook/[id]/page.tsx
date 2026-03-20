"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    ChevronLeft, Pencil, Image as ImageIcon, FileText, Mic, Plus,
    MoreHorizontal, Trash2, Globe, Youtube, Users, Sparkles,
    Tag, AlignLeft, Lock, Unlock
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const PageFlipEngine = dynamic(() => import("@/components/notebook/PageFlipEngine"), { ssr: false });
import AISidebar from "@/components/notebook/AISidebar";
import VideoPanel, { VideoEntry } from "@/components/notebook/VideoPanel";
import { useParams } from "next/navigation";
import {
    getNotebook, updateNotePageContent, updateNotePageDrawing, createNotePage,
    updateSnapPosition, deleteNotePage, createSnap, toggleNotebookPrivacy,
    updateNotebook
} from "@/app/actions";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Parses the notebook.videos TEXT[] column
function parseVideos(raw: string[] | null | undefined): VideoEntry[] {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map(v => {
        try { return JSON.parse(v) as VideoEntry; }
        catch { return { url: v, title: v, videoId: v }; }
    }).filter(Boolean);
}

export default function NotebookView() {
    const { id } = useParams();
    const [notebook, setNotebook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [mode, setMode] = useState<"text" | "draw">("text");
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editTags, setEditTags] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);

    // Video panel state
    const [videoPanelOpen, setVideoPanelOpen] = useState(false);
    const [videoTranscripts, setVideoTranscripts] = useState<{ videoId: string; title: string; text: string }[]>([]);
    // Ref used by PolaroidSnap to seek a specific video
    const seekVideoRef = useRef<((videoId: string, seconds: number) => void) | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    // Close settings popover on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const refreshNotebook = useCallback(async () => {
        if (!id) return;
        const data = await getNotebook(id as string);
        setNotebook(data);
    }, [id]);

    useEffect(() => {
        if (!id) return;
        async function load() {
            const data = await getNotebook(id as string);
            if (data && (!data.pages || data.pages.length === 0)) {
                await createNotePage(data.id, 1);
                await createNotePage(data.id, 2);
                const updated = await getNotebook(id as string);
                setNotebook(updated);
            } else {
                setNotebook(data);
            }
            setLoading(false);
        }
        load();
    }, [id]);

    useEffect(() => {
        if (notebook) {
            setEditDescription(notebook.description || "");
            setEditTags((notebook.tags || []).join(", "));
        }
    }, [notebook?.id]); // eslint-disable-line

    const pages = notebook?.pages?.length > 0
        ? notebook.pages
            .sort((a: any, b: any) => a.pageNumber - b.pageNumber)
            .map((p: any) => ({
                id: p.id,
                content: p.content || "",
                drawingData: p.drawingData || null,
                snaps: p.snaps?.map((s: any) => ({
                    id: s.id,
                    imageUrl: s.imageUrl,
                    caption: s.caption,
                    defaultX: s.x,
                    defaultY: s.y,
                    rotation: s.rotation || 0,
                })) || []
            }))
        : [];

    const videos: VideoEntry[] = parseVideos(notebook?.videos);
    const notebookText = pages.map((p: any) => {
        const div = typeof document !== 'undefined' ? document.createElement('div') : null;
        if (div) { div.innerHTML = p.content || ''; return div.textContent || ''; }
        return p.content || '';
    }).join("\n\n");

    const fullAIContext = [
        notebookText,
        ...videoTranscripts.map(t => `--- TRANSCRIPT: ${t.title} ---\n${t.text}`)
    ].filter(Boolean).join("\n\n");

    // ---------- handlers ----------

    const handleSaveContent = async (pageId: string, content: string) => {
        if (!pageId) return;
        try { await updateNotePageContent(pageId, content); } catch (e) { console.error(e); }
    };

    const handleSaveDrawing = async (pageId: string, drawingData: string) => {
        if (!pageId) return;
        try { await updateNotePageDrawing(pageId, drawingData); } catch (e) { console.error(e); }
    };

    const handleSaveSnap = async (snapId: string, x: number, y: number) => {
        if (!snapId) return;
        try { await updateSnapPosition(snapId, x, y); } catch (e) { console.error(e); }
    };

    const handleDeleteSnap = async (snapId: string) => {
        if (!snapId) return;
        try {
            // Use API route instead of Server Action — Server Actions abort on component re-render
            await fetch(`/api/delete-snap?id=${snapId}`, { method: "DELETE" });
            await refreshNotebook();
        } catch (e) { console.error("Delete snap error:", e); }
    };

    const handleNewPage = async () => {
        if (!notebook) return;
        // Map from the raw notebook.pages to ensure we get real page numbers
        const maxPage = Math.max(...notebook.pages.map((p: any) => p.pageNumber || 0), 0);
        try { await createNotePage(notebook.id, maxPage + 1); await refreshNotebook(); } catch (e) { console.error(e); }
    };

    const promptDeletePage = () => setDeleteModalOpen(true);
    const confirmDeletePage = async () => {
        const pageId = pages[currentPageIndex]?.id;
        if (!pageId || pages.length <= 1) return;
        try {
            await deleteNotePage(pageId);
            await refreshNotebook();
            setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
        } catch (e) { console.error(e); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pages[currentPageIndex]?.id) return;
        e.target.value = "";

        const pageId = pages[currentPageIndex].id;

        try {
            // Upload directly to Supabase Storage — avoid passing large base64 through Server Actions
            const { createClient } = await import("@supabase/supabase-js");
            const sb = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const ext = file.name.split(".").pop() || "bin";
            const path = `snaps/${pageId}/${Date.now()}.${ext}`;
            const { error: upErr } = await sb.storage.from("snap-media").upload(path, file, { upsert: true });

            let mediaUrl: string;
            if (upErr) {
                // Fallback: use base64 for small files only
                if (file.size > 500_000) {
                    alert("File too large. Please use a file under 500KB.");
                    return;
                }
                const b64 = await new Promise<string>((res, rej) => {
                    const r = new FileReader();
                    r.onload = ev => res(ev.target?.result as string);
                    r.onerror = rej;
                    r.readAsDataURL(file);
                });
                mediaUrl = b64;
            } else {
                const { data: urlData } = sb.storage.from("snap-media").getPublicUrl(path);
                mediaUrl = urlData.publicUrl;
            }

            await createSnap(pageId, mediaUrl, file.name);
            await refreshNotebook();
        } catch (err: any) {
            console.error("File upload error:", err);
            alert("Upload failed: " + (err?.message || err));
        }
    };

    const handleTogglePrivacy = async () => {
        if (!notebook) return;
        try {
            await toggleNotebookPrivacy(notebook.id, !notebook.isPublic);
            await refreshNotebook();
        } catch (e: any) { alert(e.message || "Error"); }
    };

    const handleSaveSettings = async () => {
        if (!notebook?.id) return;
        setSavingSettings(true);
        try {
            const tags = editTags.split(",").map(t => t.trim()).filter(Boolean);
            await updateNotebook(notebook.id, { description: editDescription, tags });
            await refreshNotebook();
            setSettingsOpen(false);
        } catch (e) { console.error(e); }
        setSavingSettings(false);
    };

    // Timestamp snap: stores videoId+seconds encoded in the imageUrl
    const handleTimestampSnap = async (videoId: string, videoUrl: string, seconds: number, label: string, frameBase64?: string | null) => {
        if (!pages[currentPageIndex]?.id) return;
        try {
            // Encode the real HQ image AND the timestamp as JSON inside a special data URI
            const payload = btoa(JSON.stringify({ videoId, videoUrl, seconds, label, image: frameBase64 || undefined }));
            const caption = `⏱ ${label}`;
            await createSnap(pages[currentPageIndex].id, `data:text/timestamp;base64,${payload}`, caption);
            await refreshNotebook();
        } catch (e) { console.error(e); }
    };

    // When PolaroidSnap is double-clicked, decode and seek
    const handleSeekTo = (seconds: number) => {
        // Legacy support for old timestamp format (plain seconds)
        seekVideoRef.current?.("", seconds);
    };

    // Decode timestamp snap for new format
    const handleSnapSeek = (imageUrl: string) => {
        try {
            const b64 = imageUrl.split(",")[1];
            const { videoId, seconds } = JSON.parse(atob(b64));
            if (seekVideoRef.current) {
                seekVideoRef.current(videoId, seconds);
                setVideoPanelOpen(true);
            }
        } catch {
            // legacy format: plain "M:SS" encoded
            try {
                const b64 = imageUrl.split(",")[1];
                const ts = atob(b64);
                const [m, s] = ts.split(":").map(Number);
                const secs = (m || 0) * 60 + (s || 0);
                seekVideoRef.current?.("", secs);
            } catch { }
        }
    };

    const otp = notebook?.id ? notebook.id.substring(0, 6).toUpperCase() : "";

    if (loading) return (
        <div className="h-screen w-full bg-background flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground animate-pulse text-sm">Loading your notebook...</p>
        </div>
    );

    return (
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider id={`notebook-${id}`} initialPresence={{ cursor: null }}>
                <ClientSideSuspense fallback={
                    <div className="h-screen w-full bg-background flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    </div>
                }>
                    <div className="h-screen w-full bg-background flex flex-col relative overflow-hidden">

                        {/* ═══ HEADER ═══ */}
                        <header className="h-14 border-b border-border/30 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 z-40 shrink-0 shadow-sm">
                            {/* Left */}
                            <div className="flex items-center gap-3 min-w-0">
                                <Link href="/dashboard" className="shrink-0 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition p-1.5 rounded-lg hover:bg-white/5">
                                    <ChevronLeft size={20} />
                                    <span className="text-sm font-medium hidden sm:inline">Back</span>
                                </Link>
                                <div className="w-px h-5 bg-border/50 hidden sm:block" />
                                <h1 className="text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-xs">
                                    {notebook?.title || "Notebook"}
                                </h1>
                                {notebook?.isPublic && (
                                    <span className="shrink-0 flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-medium">
                                        <Globe size={9} /> Public
                                    </span>
                                )}
                            </div>

                            {/* Center: Mode switcher */}
                            <div className="flex items-center gap-1 bg-black/20 rounded-full p-1 border border-white/5">
                                <button
                                    onClick={() => setMode("text")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === "text" ? "bg-primary/80 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    ✏️ Text
                                </button>
                                <button
                                    onClick={() => setMode("draw")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${mode === "draw" ? "bg-primary/80 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <Pencil size={11} /> Draw
                                </button>
                            </div>

                            {/* Right: Tools */}
                            <div className="flex items-center gap-1">
                                {/* File inputs hidden */}
                                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleFileUpload} />
                                <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={handleFileUpload} />
                                <input type="file" accept="audio/*" className="hidden" ref={audioInputRef} onChange={handleFileUpload} />

                                <div className="hidden sm:flex items-center gap-0.5">
                                    <button onClick={() => imageInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition" title="Add Image Polaroid">
                                        <ImageIcon size={18} />
                                    </button>
                                    <button onClick={() => pdfInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition" title="Add PDF Polaroid">
                                        <FileText size={18} />
                                    </button>
                                    <button onClick={() => audioInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition" title="Add Audio Note">
                                        <Mic size={18} />
                                    </button>
                                    <div className="w-px h-5 bg-border/50 mx-1" />
                                </div>

                                {/* YouTube button — shows video count badge */}
                                <button
                                    onClick={() => setVideoPanelOpen(v => !v)}
                                    className={`relative p-2 rounded-full transition ${videoPanelOpen ? "text-red-400 bg-red-400/15" : "text-muted-foreground hover:bg-white/8"}`}
                                    title="Video Library"
                                >
                                    <Youtube size={18} />
                                    {videos.length > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {videos.length}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={handleTogglePrivacy}
                                    className={`p-2 rounded-full transition ${notebook?.isPublic ? "text-green-400 bg-green-400/10" : "text-muted-foreground hover:bg-white/8"}`}
                                    title={notebook?.isPublic ? "Make Private" : "Publish to Community"}
                                >
                                    {notebook?.isPublic ? <Unlock size={18} /> : <Lock size={18} />}
                                </button>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(otp);
                                        alert(`Live Room Code: ${otp}\n\nCopied! Share with friends.`);
                                    }}
                                    className="relative p-2 text-primary hover:bg-primary/10 rounded-full transition"
                                    title="Go Live"
                                >
                                    <Users size={18} />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                </button>

                                <div className="w-px h-5 bg-border/50 mx-0.5" />

                                <button onClick={handleNewPage} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition" title="New Page">
                                    <Plus size={20} />
                                </button>
                                <button onClick={promptDeletePage} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition" title="Delete Page">
                                    <Trash2 size={20} />
                                </button>

                                <button
                                    onClick={() => setSidebarOpen(v => !v)}
                                    className={`p-2 rounded-full transition ${isSidebarOpen ? "bg-primary text-white shadow-[var(--glow-primary)]" : "text-foreground hover:bg-white/5"}`}
                                    title="Spark AI"
                                >
                                    <Sparkles size={20} />
                                </button>

                                {/* Three-dots Settings */}
                                <div className="relative" ref={settingsRef}>
                                    <button
                                        onClick={() => setSettingsOpen(v => !v)}
                                        className={`p-2 rounded-full transition ${settingsOpen ? "bg-white/10" : "text-muted-foreground hover:bg-white/8"}`}
                                        title="Notebook Settings"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {settingsOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border/40 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">⚙️ Notebook Settings</h3>

                                            <div className="space-y-1.5">
                                                <label className="text-xs text-muted-foreground flex items-center gap-1"><AlignLeft size={11} /> Description</label>
                                                <textarea
                                                    className="w-full bg-background/50 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/50 transition"
                                                    rows={2}
                                                    placeholder="What is this notebook about?"
                                                    value={editDescription}
                                                    onChange={e => setEditDescription(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={11} /> Tags (comma-separated)</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-background/50 border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition"
                                                    placeholder="math, calculus, physics..."
                                                    value={editTags}
                                                    onChange={e => setEditTags(e.target.value)}
                                                />
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {editTags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between py-2 border-t border-border/20">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Community Visibility</p>
                                                    <p className="text-xs text-muted-foreground">{notebook?.isPublic ? "Visible to everyone" : "Private — only you"}</p>
                                                </div>
                                                <button
                                                    onClick={handleTogglePrivacy}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${notebook?.isPublic ? "bg-green-500" : "bg-muted"}`}
                                                >
                                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notebook?.isPublic ? "right-1" : "left-1"}`} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleSaveSettings}
                                                disabled={savingSettings}
                                                className="w-full bg-primary hover:bg-primary/80 text-white rounded-xl py-2 text-sm font-semibold transition shadow-[var(--glow-primary)] disabled:opacity-50"
                                            >
                                                {savingSettings ? "Saving..." : "Save Settings"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* ═══ NOTEBOOK PAGES ═══ */}
                        <main className="flex-1 w-full relative z-10 flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5">
                            {mounted && (
                                <PageFlipEngine
                                    pages={pages}
                                    mode={mode}
                                    onSaveText={handleSaveContent}
                                    onSaveDrawing={handleSaveDrawing}
                                    onSaveSnap={handleSaveSnap}
                                    onDeleteSnap={handleDeleteSnap}
                                    onSeekTo={(seconds) => handleSeekTo(seconds)}
                                    onSnapSeek={handleSnapSeek}
                                    onFlip={(idx) => setCurrentPageIndex(idx)}
                                />
                            )}
                        </main>

                        {/* ═══ VIDEO PANEL ═══ */}
                        {mounted && (
                            <VideoPanel
                                notebookId={notebook?.id || ""}
                                videos={videos}
                                onVideosChange={refreshNotebook}
                                onTranscriptsUpdate={setVideoTranscripts}
                                onTimestampSnap={handleTimestampSnap}
                                seekVideoRef={seekVideoRef}
                                isOpen={videoPanelOpen}
                                onToggle={() => setVideoPanelOpen(v => !v)}
                            />
                        )}

                        {/* ═══ AI SIDEBAR ═══ */}
                        <AISidebar
                            isOpen={isSidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            notebookText={fullAIContext}
                            videos={videos}
                            videoTranscripts={videoTranscripts}
                            notebookId={notebook?.id}
                            onAINotesUpdated={refreshNotebook}
                        />

                        <ConfirmModal
                            isOpen={deleteModalOpen}
                            title="Delete Page"
                            description="Are you sure you want to delete this page? This action cannot be undone."
                            onConfirm={confirmDeletePage}
                            onClose={() => setDeleteModalOpen(false)}
                            isDestructive
                        />
                    </div>
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}
