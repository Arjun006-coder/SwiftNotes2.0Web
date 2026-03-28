"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    ChevronLeft, Pencil, Image as ImageIcon, FileText, Mic, Plus,
    MoreHorizontal, Trash2, Globe, Youtube, Users, Sparkles,
    Tag, AlignLeft, Lock, Unlock, Copy, Shield, ShieldAlert, Check, X,
    Search, Settings, Library
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const PageFlipEngine = dynamic(() => import("@/components/notebook/PageFlipEngine"), { ssr: false });
import AISidebar from "@/components/notebook/AISidebar";
import KnowledgeHub from "@/components/notebook/KnowledgeHub";
import VideoPanel, { VideoEntry } from "@/components/notebook/VideoPanel";
import { useParams, useSearchParams } from "next/navigation";
import {
    getNotebook, updateNotePageContent, updateNotePageDrawing, createNotePage,
    updateSnapPosition, deleteNotePage, createSnap, toggleNotebookPrivacy,
    updateNotebook, checkNotebookAccess, getAllRoomRequests,
    requestEditAccess, approveEditAccess, rejectEditAccess, revokeEditAccess
} from "@/app/actions";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense, useOthers, useBroadcastEvent, useEventListener, useSelf, useRoom } from "@liveblocks/react/suspense";
import { useUser } from "@clerk/nextjs";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- LIVEBLOCKS MULTIPLAYER AVATARS ---
function ActiveUsers({ isPublic }: { isPublic: boolean }) {
    const others = useOthers();
    const activeCount = others.length;

    if (activeCount === 0) return null;

    return (
        <div className="flex items-center gap-2 mr-2">
            <div className="flex -space-x-2">
                {others.slice(0, 3).map(o => (
                    <div key={o.connectionId} className="w-6 h-6 rounded-full border border-background bg-primary/20 flex items-center justify-center overflow-hidden" title={o.info?.name}>
                        {o.info?.avatar ? (
                            <img src={o.info.avatar} alt={o.info.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[9px] font-bold text-primary">{o.info?.name?.[0]?.toUpperCase() || "A"}</span>
                        )}
                    </div>
                ))}
                {activeCount > 3 && (
                    <div className="w-6 h-6 rounded-full border border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                        +{activeCount - 3}
                    </div>
                )}
            </div>
            {isPublic && (
                <span className="text-[10px] text-green-500 font-medium animate-pulse flex items-center gap-1 hidden sm:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
                </span>
            )}
        </div>
    );
}

// --- LIVEROOM EPHEMERAL EVENT MANAGER ---
function GuestEventReceiver() {
    const self = useSelf();
    useEventListener(({ event }) => {
        const e = event as Record<string, any>;
        if (e.type === "ACCESS_GRANTED" && e.userId === self.id) {
            alert("The Notebook Owner granted you Temporary Edit Access!");
            window.location.reload(); // Re-authenticates JWT to inject FULL_ACCESS
        } else if (e.type === "ACCESS_REJECTED" && e.userId === self.id) {
            alert("Your request to edit was declined.");
            // Status re-render handled passively or requires manual window reload if pending is locally cached
        } else if (e.type === "ACCESS_REVOKED" && e.userId === self.id) {
            alert("Your edit access was revoked by the Owner.");
            window.location.reload();
        }
    });
    return null;
}

function LiveRoomManager({ notebookId, isOwner, otp }: { notebookId: string; isOwner: boolean; otp: string }) {
    const broadcast = useBroadcastEvent();
    const self = useSelf();
    const room = useRoom();
    const others = useOthers();
    const [requests, setRequests] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadRequests = useCallback(async () => {
        if (!isOwner) return;
        const reqs = await getAllRoomRequests(notebookId);
        setRequests(reqs);
    }, [isOwner, notebookId]);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    // WebSocket Listeners for the Host
    useEventListener(({ event }) => {
        const e = event as Record<string, any>;
        if (e.type === "REQUEST_ACCESS" && isOwner) {
            alert(`${e.name || "A guest"} is asking for Edit Access! Check your Live Room Manager.`);
            loadRequests();
        }
    });

    const handleApprove = async (userId: string) => {
        await approveEditAccess(notebookId, userId);
        broadcast({ type: "ACCESS_GRANTED", userId });
        loadRequests();
    };

    const handleReject = async (userId: string) => {
        await rejectEditAccess(notebookId, userId);
        broadcast({ type: "ACCESS_REJECTED", userId });
        loadRequests();
    };

    const handleRevoke = async (userId: string) => {
        await revokeEditAccess(notebookId, userId);
        broadcast({ type: "ACCESS_REVOKED", userId });
        loadRequests();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(otp);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOwner) return null;

    const pending = requests.filter(r => r.status === "pending");
    const approvedMap = new Set(requests.filter(r => r.status === "approved").map(r => r.userId));

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(v => !v)}
                className={`relative p-2 rounded-full transition shadow-sm ${isOpen ? "bg-primary/20 text-primary border border-primary/30" : "text-primary hover:bg-primary/10 border border-transparent"}`}
                title="Live Room Manager"
            >
                <Users size={18} />
                {pending.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-md">{pending.length}</span>}
                {pending.length === 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm" />}
            </button>
            
            {isOpen && (
                <div className="absolute top-12 right-0 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="p-3 bg-primary/5 border-b border-border/30 flex items-center justify-between">
                        <h3 className="font-semibold text-xs text-foreground flex items-center gap-2">🌐 Live Room Manager</h3>
                    </div>

                    <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* 1. ROOM PIN */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Room PIN</label>
                            <div className="flex items-center justify-between p-2.5 bg-background border border-border/40 rounded-xl">
                                <span className="text-xl font-mono text-primary font-bold tracking-widest">{otp}</span>
                                <button onClick={handleCopy} className={`p-1.5 rounded-md transition flex items-center gap-1.5 text-xs font-semibold ${copied ? "bg-green-500/20 text-green-500" : "bg-primary/10 hover:bg-primary/20 text-primary"}`}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* 2. ACTIVE PEOPLE IN ROOM */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
                                <span>Active Participants ({others.length})</span>
                            </label>
                            {others.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic p-2 text-center bg-background/30 rounded-lg border border-border/20">No one else is here yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {others.map(o => {
                                        const isEditor = approvedMap.has(o.id);
                                        return (
                                            <div key={o.connectionId} className="flex items-center justify-between p-2 bg-background border border-border/40 rounded-xl">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {o.info?.avatar ? <img src={o.info.avatar} className="w-7 h-7 rounded-full shrink-0 border border-border/50" /> : <div className="w-7 h-7 rounded-full bg-primary/20 shrink-0 border border-border/50" />}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-semibold truncate text-foreground leading-tight">{o.info?.name || "Anonymous"}</span>
                                                        <span className={`text-[9px] font-bold ${isEditor ? "text-green-500" : "text-muted-foreground"}`}>{isEditor ? "Can Edit" : "Read Only"}</span>
                                                    </div>
                                                </div>
                                                {isEditor ? (
                                                    <button onClick={() => o.id && handleRevoke(o.id)} className="shrink-0 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition" title="Revoke Edit Access">
                                                        <ShieldAlert size={14} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => o.id && handleApprove(o.id)} className="shrink-0 p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-md transition" title="Grant Edit Access">
                                                        <Shield size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 3. PENDING REQUESTS */}
                        {pending.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-border/30">
                                <label className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Needs Approval ({pending.length})</label>
                                <div className="space-y-2">
                                    {pending.map(p => (
                                        <div key={p.userId} className="flex flex-col gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded-xl">
                                            <div className="flex items-center gap-2.5">
                                                {p.User.avatar ? <img src={p.User.avatar} className="w-6 h-6 rounded-full shrink-0" /> : <div className="w-6 h-6 rounded-full bg-primary/20 shrink-0" />}
                                                <span className="text-xs font-medium truncate text-foreground">{p.User.name || "User"}</span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleApprove(p.userId)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg text-[10px] font-bold transition flex justify-center items-center gap-1"><Check size={12}/> Approve</button>
                                                <button onClick={() => handleReject(p.userId)} className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-1.5 rounded-lg text-[10px] font-bold transition flex justify-center items-center gap-1"><X size={12}/> Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ASK TO EDIT BUTTON OVERLAY ---
function AskToEditButton({ notebookId, hasRequested: initial }: { notebookId: string; hasRequested: boolean }) {
    const broadcast = useBroadcastEvent();
    const self = useSelf();
    const [status, setStatus] = useState<"idle" | "requested">(initial ? "requested" : "idle");

    const handleReq = async () => {
        try {
            await requestEditAccess(notebookId);
            broadcast({ type: "REQUEST_ACCESS", userId: self.id, name: self.info?.name || "User" });
            setStatus("requested");
        } catch (e: any) { alert("Error: " + e.message); }
    };

    if (status === "requested") {
        return <span className="px-3 py-1.5 bg-border/40 text-muted-foreground text-[11px] font-medium rounded-full border border-white/5 flex items-center gap-1.5">⏳ Request Pending</span>;
    }

    return (
        <button onClick={handleReq} className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold rounded-full transition shadow-lg shadow-primary/20 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
            ✋ Ask to Edit
        </button>
    );
}

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
    const searchParams = useSearchParams();
    const isOtpJoin = !!searchParams.get("otp");
    const { user } = useUser();
    const [notebook, setNotebook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [mode, setMode] = useState<"text" | "draw">("text");
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editTags, setEditTags] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);
    
    // Explicit dual-page context target
    const [activePageId, setActivePageId] = useState<string | null>(null);

    // Click outside settings hooks...DB resolves
    const [canEdit, setCanEdit] = useState(true); // Default TRUE until DB resolves
    const [isHost, setIsHost] = useState(false); // Validated owner state from DB
    const [hasPendingRequest, setHasPendingRequest] = useState(false);

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
            // Execute Access Control Evaluation
            const access = await checkNotebookAccess(id as string);
            setIsHost(access.isOwner);
            // STRICT SECURITY ENFORCEMENT: Even if DB somehow returns true, unless user has the ephemeral ?otp code in URL they are forced into ReadOnly.
            setCanEdit(access.isOwner || (access.isCollaborator && isOtpJoin));

            // Determine if they previously clicked "Ask to Edit" and are still waiting
            if (!access.isOwner && !access.isCollaborator && user?.id) {
                const reqs = await getAllRoomRequests(id as string);
                const amIWaiting = reqs.some((r: any) => r.userId === user?.id && r.status === "pending");
                setHasPendingRequest(amIWaiting);
            }

            setLoading(false);
        }
        load();

        // 🟢 GLOBAL REAL-TIME WEBSOCKET SYNC INJECTION
        // Automatically fetch new strokes implicitly whenever another peer mutates the DB
        const channel = supabaseClient
            .channel(`notebook-sync-${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "NotePage" }, () => refreshNotebook())
            .on("postgres_changes", { event: "*", schema: "public", table: "Snap" }, () => refreshNotebook())
            .subscribe();

        return () => { supabaseClient.removeChannel(channel); };
    }, [id, user?.id, refreshNotebook]);

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
                snaps: (p.snaps || [])
                    .sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                    .map((s: any, i: number) => ({
                        id: s.id,
                        imageUrl: s.imageUrl,
                        caption: s.caption,
                        defaultX: s.x,
                        defaultY: s.y,
                        rotation: s.rotation || 0,
                    }))
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
        const targetId = activePageId || pages[currentPageIndex]?.id;
        if (!file || !targetId) return;
        e.target.value = "";

        const pageId = targetId;

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
            // Auto-save currently typed tags/desc before toggling so DB validation passes perfectly!
            const tags = Array.from(new Set(editTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)));
            await updateNotebook(notebook.id, { description: editDescription, tags });
            
            await toggleNotebookPrivacy(notebook.id, !notebook.isPublic);
            await refreshNotebook();
        } catch (e: any) { alert(e.message || "Error"); }
    };

    const handleSaveSettings = async () => {
        if (!notebook?.id) return;
        setSavingSettings(true);
        try {
            const tags = Array.from(new Set(editTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)));
            await updateNotebook(notebook.id, { description: editDescription, tags });
            await refreshNotebook();
            setSettingsOpen(false);
        } catch (e) { console.error(e); }
        setSavingSettings(false);
    };

    // Timestamp snap: stores videoId+seconds encoded in the imageUrl
    const handleTimestampSnap = async (videoId: string, videoUrl: string, seconds: number, label: string, frameBase64?: string | null) => {
        const targetId = activePageId || pages[currentPageIndex]?.id;
        if (!targetId) return;
        try {
            // Encode the real HQ image AND the timestamp as JSON inside a special data URI
            const payload = btoa(JSON.stringify({ videoId, videoUrl, seconds, label, image: frameBase64 || undefined }));
            const caption = `⏱ ${label}`;
            await createSnap(targetId, `data:text/timestamp;base64,${payload}`, caption);
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
                    <GuestEventReceiver />
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

                            {/* Center: Mode switcher (Hidden if Read-Only) */}
                            {canEdit ? (
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
                            ) : (
                                isOtpJoin && (
                                    <div className="flex justify-center bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/5 mx-auto">
                                        <AskToEditButton notebookId={notebook.id} hasRequested={hasPendingRequest} />
                                    </div>
                                )
                            )}

                            {/* Right: Tools */}
                            <div className="flex items-center gap-1">
                                <ActiveUsers isPublic={notebook?.isPublic} />

                                {canEdit && (
                                    <>
                                        <div className="w-px h-5 bg-border/50 mx-1 hidden sm:block" />
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
                                    </>
                                )}

                                {/* YouTube button — Accessible to everyone */}
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

                                {/* Spark AI button — Accessible to everyone */}
                                <button
                                    onClick={() => setSidebarOpen(v => !v)}
                                    className={`p-2 rounded-full transition ${isSidebarOpen ? "bg-primary text-white shadow-[var(--glow-primary)]" : "text-foreground hover:bg-white/5"}`}
                                    title="Spark AI"
                                >
                                    <Sparkles size={20} />
                                </button>

                                {/* Knowledge Hub button — Multi-Video Intelligence */}
                                <button
                                    onClick={() => setIsHubOpen(v => !v)}
                                    className={`p-2 rounded-full transition ${isHubOpen ? "bg-accent text-white shadow-[var(--glow-accent)]" : "text-foreground hover:bg-white/5"}`}
                                    title="Knowledge Hub & Playlists"
                                >
                                    <Library size={20} />
                                </button>

                                {canEdit && (
                                    <>
                                        <button
                                            onClick={handleTogglePrivacy}
                                            className={`p-2 rounded-full transition ${notebook?.isPublic ? "text-green-400 bg-green-400/10" : "text-muted-foreground hover:bg-white/8"}`}
                                            title={notebook?.isPublic ? "Make Private" : "Publish to Community"}
                                        >
                                            {notebook?.isPublic ? <Unlock size={18} /> : <Lock size={18} />}
                                        </button>

                                        {/* Unified Live Room Manager */}
                                        <LiveRoomManager notebookId={notebook?.id} isOwner={isHost} otp={otp} />

                                        <div className="w-px h-5 bg-border/50 mx-0.5" />

                                        <button onClick={handleNewPage} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition" title="New Page">
                                            <Plus size={20} />
                                        </button>
                                        <button onClick={promptDeletePage} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition" title="Delete Page">
                                            <Trash2 size={20} />
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
                                                            {editTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean).map((tag, i) => (
                                                                <span key={`${tag}-${i}`} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20">{tag}</span>
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
                                    </>
                                )}
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
                                    readOnly={!canEdit}
                                    activePageId={activePageId}
                                    onPageClick={(id) => setActivePageId(id)}
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
                                    canAddVideos={canEdit}
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
                            readOnly={!canEdit}
                        />

                        <ConfirmModal
                            isOpen={deleteModalOpen}
                            title="Delete Page"
                            description="Are you sure you want to delete this page? This action cannot be undone."
                            onConfirm={confirmDeletePage}
                            onClose={() => setDeleteModalOpen(false)}
                            isDestructive
                        />

                        {/* Floating Knowledge Hub (Playlist Intelligence) */}
                        <KnowledgeHub isOpen={isHubOpen} onToggle={() => setIsHubOpen(false)} />
                    </div>
                </ClientSideSuspense>
            </RoomProvider>
        </LiveblocksProvider>
    );
}
