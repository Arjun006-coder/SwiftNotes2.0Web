"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, FileText, Music, Pin, Clock } from "lucide-react";

interface PolaroidProps {
    id?: string;
    imageUrl?: string;
    url?: string;
    caption?: string;
    defaultX?: number;
    defaultY?: number;
    rotation?: number;
    onSavePosition?: (snapId: string, x: number, y: number) => void;
    onDelete?: (snapId: string) => void;
    /** Legacy: called with plain seconds when double-clicking old timestamp snaps */
    onSeekTo?: (seconds: number) => void;
    /** New: called with the raw imageUrl so parent can decode {videoId, seconds} */
    onSnapSeek?: (imageUrl: string) => void;
    readOnly?: boolean;
}

type MediaType = "image" | "audio" | "pdf" | "timestamp";

function detectMediaType(src: string, caption: string = ""): MediaType {
    if (src.startsWith("data:text/timestamp")) return "timestamp";
    const s = src.toLowerCase();
    const c = caption.toLowerCase();
    if (s.startsWith("data:audio") || /\.(mp3|wav|ogg|m4a|aac)$/.test(s) || /\.(mp3|wav|ogg|m4a|aac)$/.test(c)) return "audio";
    if (s.startsWith("data:application/pdf") || /\.pdf$/.test(s) || /\.pdf$/.test(c)) return "pdf";
    return "image";
}

function extractSecondsFromTimestamp(src: string): number {
    try {
        const b64 = src.split(",")[1];
        const ts = atob(b64); // e.g. "3:42"
        const parts = ts.split(":").map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } catch { }
    return 0;
}

export default function PolaroidSnap({
    id, imageUrl, url, caption = "",
    defaultX = 100, defaultY = 100, rotation = -3,
    onSavePosition, onDelete, onSeekTo, onSnapSeek, readOnly
}: PolaroidProps) {
    const src = imageUrl || url || "";
    const mediaType = detectMediaType(src, caption);
    const [pos, setPos] = useState({ x: defaultX, y: defaultY });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const isDragging = useRef(false);

    // 🟢 SYNCHRONIZED POSITION TRACKING (Fixes Live-Sync jump glitches)
    useEffect(() => {
        if (!isDragging.current) {
            setPos({ x: defaultX, y: defaultY });
        }
    }, [defaultX, defaultY]);

    const handleClick = () => {
        if (mediaType !== "timestamp") return;
        if (clickTimer.current) {
            // double click
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            // Try new JSON format first (has videoId)
            if (onSnapSeek) {
                onSnapSeek(src);
            } else {
                // Legacy: extract plain seconds
                const secs = extractSecondsFromTimestamp(src);
                onSeekTo?.(secs);
            }
        } else {
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
            }, 300);
        }
    };

    // Timestamp display — try JSON format first, then plain time string
    const tsLabel = mediaType === "timestamp"
        ? (() => {
            try {
                const b64 = src.split(",")[1];
                const parsed = JSON.parse(atob(b64));
                if (parsed.label) return parsed.label;
                return atob(b64);
            } catch {
                try { return atob(src.split(",")[1]); } catch { return "0:00"; }
            }
        })()
        : "";

    return (
        <>
            <motion.div
                drag={!isPinned && !readOnly}
                dragMomentum={false}
                initial={{ x: defaultX, y: defaultY, rotate: rotation, scale: 0.8, opacity: 0 }}
                animate={{ x: pos.x - defaultX, y: pos.y - defaultY, rotate: rotation, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                onDragStart={() => isDragging.current = true}
                onDragEnd={(_, info) => {
                    isDragging.current = false;
                    const newX = pos.x + info.offset.x;
                    const newY = pos.y + info.offset.y;
                    setPos({ x: newX, y: newY });
                    if (id && onSavePosition && !readOnly) onSavePosition(id, newX, newY);
                }}
                whileDrag={{ scale: 1.08, rotate: 0, zIndex: 99, cursor: "grabbing" }}
                className="absolute w-44 bg-white p-2.5 pb-8 shadow-xl hover:shadow-2xl rounded-sm cursor-grab z-20 border border-black/8 group"
                style={{ left: defaultX, top: defaultY, rotate: `${rotation}deg` }}
                onClick={handleClick}
            >
                {/* Tape decoration */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-14 h-6 bg-amber-100/80 rotate-[-2deg] shadow-sm z-30" />

                {/* Controls */}
                <div className="absolute top-1 right-1 z-40 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {mediaType === "image" && (
                        <button
                            className="w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                            onClick={e => { e.stopPropagation(); setIsFullscreen(true); }}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            <ZoomIn size={12} />
                        </button>
                    )}
                    <button
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition ${isPinned ? "bg-primary text-white" : "bg-black/50 text-white hover:bg-black/70"}`}
                        onClick={e => { e.stopPropagation(); setIsPinned(p => !p); }}
                        onPointerDown={e => e.stopPropagation()}
                        title={isPinned ? "Unpin" : "Pin in place"}
                    >
                        <Pin size={11} className={isPinned ? "fill-white" : ""} />
                    </button>
                    {id && onDelete && !readOnly && (
                        <button
                            className="w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition"
                            onClick={e => { e.stopPropagation(); onDelete(id); }}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            <X size={11} />
                        </button>
                    )}
                </div>

                {/* Media content area */}
                <div className="w-full aspect-square bg-gray-50 overflow-hidden relative rounded-sm">
                    {mediaType === "timestamp" ? (
                        (() => {
                            // Decode to get videoId and time for thumbnail
                            let videoId = "";
                            let timeLabel = "";
                            let titleLabel = "";
                            let customImage = "";
                            try {
                                const b64 = src.split(",")[1];
                                const parsed = JSON.parse(atob(b64));
                                videoId = parsed.videoId || "";
                                customImage = parsed.image || "";
                                const s = Math.floor(parsed.seconds || 0);
                                const m = Math.floor(s / 60);
                                timeLabel = `${m}:${String(s % 60).padStart(2, "0")}`;
                                titleLabel = parsed.label?.split("·")[1]?.trim() || "";
                            } catch { timeLabel = tsLabel; }
                            return (
                                <div className="w-full h-full relative select-none cursor-pointer" onDoubleClick={handleClick}>
                                    {customImage ? (
                                        <img src={customImage} alt={titleLabel} className="w-full h-full object-cover" draggable={false} />
                                    ) : videoId ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                            alt={titleLabel}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (target.src.includes('maxresdefault.jpg')) {
                                                    target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                } else if (target.src.includes('hqdefault.jpg')) {
                                                    target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                                }
                                            }}
                                        />

                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                            <Clock size={28} className="text-white/50" />
                                        </div>
                                    )}
                                    {/* Timestamp badge */}
                                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm">
                                        ▶ {timeLabel}
                                    </div>
                                    {/* Play hint overlay on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group/snap">
                                        <div className="w-10 h-10 rounded-full bg-white/0 group-hover/snap:bg-white/90 flex items-center justify-center transition-all">
                                            <svg className="w-5 h-5 text-gray-900 opacity-0 group-hover/snap:opacity-100 transition-all ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : mediaType === "pdf" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 p-2">
                            <FileText size={32} className="mb-1 opacity-70" />
                            <span className="text-xs font-bold text-red-700 text-center truncate w-full px-1">PDF Document</span>
                            <a
                                href={src.startsWith("data:") ? "#" : src}
                                target={src.startsWith("data:") ? undefined : "_blank"}
                                rel="noreferrer"
                                className="text-[10px] underline mt-1 text-blue-500 hover:text-blue-700 pointer-events-auto"
                                onClick={(e) => {
                                    if (src.startsWith("data:")) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        fetch(src)
                                            .then(res => res.blob())
                                            .then(blob => {
                                                const url = URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            });
                                    }
                                }}
                                onPointerDown={e => e.stopPropagation()}
                            >Open ↗</a>
                        </div>
                    ) : mediaType === "audio" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 p-2 gap-2">
                            <Music size={32} className="text-violet-500 opacity-70" />
                            <span className="text-xs font-bold text-violet-800 text-center truncate w-full px-1">Voice Note</span>
                            <div className="absolute bottom-2 left-1 right-1 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                                <audio controls className="w-full h-7" src={src} controlsList="nodownload noplaybackrate" />
                            </div>
                        </div>
                    ) : (
                        <img
                            src={src} alt={caption}
                            className="w-full h-full object-cover pointer-events-none select-none"
                        />
                    )}
                </div>

                {/* Caption */}
                <p className="font-sans text-[10px] text-center text-black/70 mt-2.5 font-medium leading-tight truncate px-1">
                    {caption || "Snap"}
                </p>
            </motion.div>

            {/* Fullscreen lightbox */}
            <AnimatePresence>
                {isFullscreen && mediaType === "image" && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <motion.img
                            initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                            src={src} alt={caption}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                        <button
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                            onClick={() => setIsFullscreen(false)}
                        >
                            <X size={20} />
                        </button>
                        {caption && (
                            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-4 py-1.5 rounded-full">
                                {caption}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
