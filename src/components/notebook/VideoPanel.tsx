"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Youtube, X, Plus, Camera, ExternalLink, Loader2, PictureInPicture2, List, Check } from "lucide-react";
import { addNotebookVideo, removeNotebookVideo } from "@/app/actions";

export interface VideoEntry { url: string; title: string; videoId: string; }

interface VideoPanelProps {
    notebookId: string;
    videos: VideoEntry[];
    isOpen: boolean;
    onToggle: () => void;
    onVideosChange: () => void;
    onTranscriptsUpdate: (transcripts: { videoId: string; title: string; text: string }[]) => void;
    onTimestampSnap: (videoId: string, videoUrl: string, seconds: number, label: string, frameBase64?: string | null) => void;
    seekVideoRef?: React.MutableRefObject<((videoId: string, seconds: number) => void) | null>;
    canAddVideos?: boolean;
}

function extractVideoId(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || url;
        if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    } catch { }
    return url;
}

function fmtTime(secs: number) {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function VideoPanel({
    notebookId, videos, isOpen, onToggle,
    onVideosChange, onTranscriptsUpdate, onTimestampSnap, seekVideoRef, canAddVideos
}: VideoPanelProps) {
    const [showList, setShowList] = useState(true);
    const [newUrl, setNewUrl] = useState("");
    const [addingVideo, setAddingVideo] = useState(false);
    const [addError, setAddError] = useState("");
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
    const [speed, setSpeed] = useState(1);
    const [transcripts, setTranscripts] = useState<Map<string, string>>(new Map());
    const [fetchingTranscript, setFetchingTranscript] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<any>(null); // YT.Player instance

    const activeVideo = videos.find(v => v.videoId === activeVideoId);

    // Load YouTube IFrame API once
    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).YT) return;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
    }, []);

    // Build YT.Player when a video is selected
    useEffect(() => {
        if (!activeVideoId || !isOpen) return;
        const tryBuild = () => {
            const YT = (window as any).YT;
            if (!YT?.Player) { setTimeout(tryBuild, 300); return; }
            // Destroy existing
            try { playerRef.current?.destroy?.(); } catch { }
            playerRef.current = new YT.Player(`yt-player-${activeVideoId}`, {
                videoId: activeVideoId,
                playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
                events: {
                    onReady: (e: any) => {
                        e.target.setPlaybackRate(speed);
                    },
                },
            });
        };
        tryBuild();
    }, [activeVideoId, isOpen]); // eslint-disable-line

    // Apply speed changes
    useEffect(() => {
        try { playerRef.current?.setPlaybackRate?.(speed); } catch { }
    }, [speed]);

    // seekVideoRef for polaroid double-click
    useEffect(() => {
        if (!seekVideoRef) return;
        seekVideoRef.current = (videoId: string, seconds: number) => {
            setShowList(false);
            setActiveVideoId(videoId);
            setTimeout(() => {
                try { playerRef.current?.seekTo?.(seconds, true); playerRef.current?.playVideo?.(); }
                catch { }
            }, 800);
        };
    }, [seekVideoRef]);

    // Fetch transcript when video activates
    const fetchTranscript = useCallback(async (video: VideoEntry) => {
        if (transcripts.has(video.videoId)) return;
        setFetchingTranscript(video.videoId);
        try {
            const res = await fetch("/api/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: video.url }),
            });
            const data = await res.json();
            if (res.ok && data.text) {
                setTranscripts(prev => {
                    const next = new Map(prev);
                    next.set(video.videoId, data.text);
                    return next;
                });
                
                // Build the updated parent payload directly using closure context + new data
                const updatedTranscripts = videos
                    .filter(v => transcripts.has(v.videoId) || v.videoId === video.videoId)
                    .map(v => ({ 
                        videoId: v.videoId, 
                        title: v.title, 
                        text: v.videoId === video.videoId ? data.text : transcripts.get(v.videoId)! 
                    }));
                
                // Push the state update to the Parent explicitly outside the current Rendering Cycle macro-task
                setTimeout(() => onTranscriptsUpdate(updatedTranscripts), 0);
            }
        } catch (e) { console.error(e); }
        setFetchingTranscript(null);
    }, [transcripts, videos, onTranscriptsUpdate]);

    useEffect(() => {
        if (activeVideo) fetchTranscript(activeVideo);
    }, [activeVideoId]); // eslint-disable-line

    const handleAddVideo = async () => {
        if (!canAddVideos || !newUrl.trim()) return;
        setAddingVideo(true); setAddError("");
        try {
            const videoId = extractVideoId(newUrl.trim());
            let title = `Video ${videos.length + 1}`;
            try {
                const oe = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(newUrl)}&format=json`);
                if (oe.ok) { const d = await oe.json(); title = d.title || title; }
            } catch { }
            await addNotebookVideo(notebookId, newUrl.trim(), title);
            onVideosChange();
            setNewUrl("");
            setActiveVideoId(videoId);
            setShowList(false);
        } catch (e: any) { setAddError(e.message || "Failed to add video"); }
        setAddingVideo(false);
    };

    const handleRemoveVideo = async (videoId: string) => {
        if (!canAddVideos) return;
        try {
            await removeNotebookVideo(notebookId, videoId);
            onVideosChange();
            if (activeVideoId === videoId) setActiveVideoId(null);
        } catch (e) { console.error(e); }
    };

    const [snapping, setSnapping] = useState(false);

    const handleSnap = async () => {
        if (!activeVideo || snapping) return;
        try {
            const secs = playerRef.current?.getCurrentTime?.() || 0;
            const label = `${fmtTime(secs)} · ${activeVideo.title}`;
            setSnapping(true);

            // Try to get real video frame via server-side yt-dlp + ffmpeg
            let frameBase64: string | null = null;
            try {
                const res = await fetch("https://multigranular-darrin-nonartistical.ngrok-free.dev/snapshot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: activeVideo.url, seconds: secs }),
                    signal: AbortSignal.timeout(28000),
                });
                if (res.ok) {
                    const data = await res.json();
                    frameBase64 = data.frameBase64 || null;
                }
            } catch (e) {
                console.warn("Frame extraction failed (yt-dlp/ffmpeg not installed?), falling back to timestamp snap:", e);
            }

            if (frameBase64) {
                // Save the real frame image directly as an image snap
                onTimestampSnap(activeVideo.videoId, activeVideo.url, secs, label, frameBase64);
            } else {
                // Fallback: timestamp metadata snap (shows YT thumbnail + timestamp badge)
                onTimestampSnap(activeVideo.videoId, activeVideo.url, secs, label, null);
            }
        } catch (e) {
            console.error("Snap error:", e);
        }
        setSnapping(false);
    };

    const handlePiP = async () => {
        // Try to find the YouTube iframe and get its inner video element for PiP
        try {
            const iframe = document.querySelector<HTMLIFrameElement>(`iframe[id^="yt-player"]`);
            if (!iframe) return;
            // Modern browsers: can access video inside iframe only if same-origin (won't work for YouTube)
            // Instead, use the native browser PiP on whatever video element is currently playing
            const videos = document.querySelectorAll("video");
            if (videos.length > 0) {
                const vid = Array.from(videos).find(v => !v.paused) || videos[0];
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await vid.requestPictureInPicture();
                }
            }
        } catch (e) {
            console.warn("PiP not supported for this video:", e);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="absolute top-16 left-4 z-40 w-[390px] bg-[#0a0a14]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
            style={{ maxHeight: "calc(100vh - 80px)" }}
        >
            {/* Header (Drag Handle) */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/4 border-b border-white/8 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 text-white/90 text-xs font-semibold">
                    <Youtube size={14} className="text-red-400" />
                    <span>Video Library ({videos.length})</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowList(v => !v)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition" title="Toggle list">
                        <List size={13} />
                    </button>
                    <button onClick={onToggle} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/80 transition">
                        <X size={13} />
                    </button>
                </div>
            </div>

            {/* Video list */}
            {showList && (
                <div className="border-b border-white/8" style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {videos.length === 0 && (
                        <p className="text-center text-white/30 text-xs py-5">No videos yet — add one below</p>
                    )}
                    {videos.map(v => (
                        <div
                            key={v.videoId}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition border-b border-white/5 group ${activeVideoId === v.videoId ? "bg-primary/15 border-l-2 border-l-primary" : "hover:bg-white/5"}`}
                            onClick={() => { setActiveVideoId(v.videoId); setShowList(false); }}
                        >
                            <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt={v.title} className="w-16 h-11 object-cover rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate">{v.title}</p>
                                {transcripts.has(v.videoId) && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded-full mt-0.5 inline-block">✓ Transcript ready</span>
                                )}
                                {fetchingTranscript === v.videoId && (
                                    <span className="text-[9px] text-yellow-400 flex items-center gap-1 mt-0.5">
                                        <Loader2 size={8} className="animate-spin" /> Fetching transcript...
                                    </span>
                                )}
                            </div>
                            {activeVideoId === v.videoId && <Check size={12} className="text-primary shrink-0" />}
                            {canAddVideos && (
                                <button
                                    className="p-1 rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1"
                                    onClick={e => { e.stopPropagation(); handleRemoveVideo(v.videoId); }}
                                    title="Remove"
                                ><X size={11} /></button>
                            )}
                        </div>
                    ))}

                    {/* Add video row */}
                    {canAddVideos && (
                        <div className="p-3 flex gap-2">
                            <input
                                type="text"
                                placeholder="Paste YouTube URL..."
                                value={newUrl}
                                onChange={e => setNewUrl(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleAddVideo(); }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-red-400/50 transition"
                            />
                            <button
                                onClick={handleAddVideo}
                                disabled={addingVideo || !newUrl.trim()}
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shrink-0"
                            >
                                {addingVideo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                            </button>
                        </div>
                    )}
                    {addError && <p className="text-red-400 text-[10px] px-3 pb-2">{addError}</p>}
                </div>
            )}

            {/* Player */}
            {activeVideo ? (
                <>
                    {/* YouTube Iframe — the div gets replaced by YT.Player */}
                    <div className="relative bg-black shrink-0" style={{ aspectRatio: "16/9" }}>
                        <div id={`yt-player-${activeVideoId}`} style={{ width: "100%", height: "100%" }} />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between px-3 py-2 bg-black/50 shrink-0">
                        {/* Speed */}
                        <div className="flex gap-1">
                            {[0.5, 1, 1.25, 1.5, 2].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${speed === s ? "bg-primary text-white" : "text-white/40 hover:text-white hover:bg-white/10"}`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handlePiP} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Picture-in-Picture">
                                <PictureInPicture2 size={14} />
                            </button>
                            <button
                                onClick={handleSnap}
                                className="flex items-center gap-1 bg-primary hover:bg-primary/80 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                                title="Snap Timestamp Polaroid"
                            >
                                <Camera size={11} /> Snap
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 px-3 pb-3 shrink-0">
                        <button
                            onClick={() => setShowList(v => !v)}
                            className="flex-1 text-[10px] text-white/40 hover:text-white/80 py-1.5 border border-white/8 rounded-lg hover:bg-white/5 transition flex items-center justify-center gap-1"
                        >
                            <List size={10} /> {showList ? "Hide list" : "Switch video"}
                        </button>
                        <a href={activeVideo.url} target="_blank" rel="noreferrer" className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded-lg transition" title="Open on YouTube">
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-white/30 gap-2">
                    <Youtube size={32} className="text-white/10" />
                    <p className="text-xs">Select a video from the list above</p>
                </div>
            )}
        </motion.div>
    );
}
