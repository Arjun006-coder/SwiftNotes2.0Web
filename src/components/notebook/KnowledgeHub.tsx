"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Library, Search, X, Loader2, Play, CheckCircle2, MessageSquare, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface VideoMetadata {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
}

interface KnowledgeHubProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function KnowledgeHub({ isOpen, onToggle }: KnowledgeHubProps) {
    const [playlistUrl, setPlaylistUrl] = useState("");
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [playlistData, setPlaylistData] = useState<{ title: string; videos: VideoMetadata[] } | null>(null);
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
    
    // Reasoning State
    const [query, setQuery] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const fetchPlaylistInfo = async () => {
        if (!playlistUrl.trim()) return;
        setLoadingMetadata(true);
        setResult(null);
        try {
            const res = await fetch("https://multigranular-darrin-nonartistical.ngrok-free.dev/playlist-info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: playlistUrl.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setPlaylistData(data);
                setSelectedVideoIds(new Set(data.videos.map((v: any) => v.id))); // Select all by default
            }
        } catch (e) {
            console.error(e);
        }
        setLoadingMetadata(false);
    };

    const toggleVideo = (id: string) => {
        const next = new Set(selectedVideoIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedVideoIds(next);
    };

    const runBulkAnalysis = async () => {
        if (!playlistData || selectedVideoIds.size === 0 || !query.trim()) return;
        setAnalyzing(true);
        try {
            // First, fetch transcripts for all selected videos (in parallel)
            const selectedVideos = playlistData.videos.filter(v => selectedVideoIds.has(v.id));
            
            const transcriptPromises = selectedVideos.map(async (v) => {
                const res = await fetch("/api/youtube", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: v.url }),
                });
                const d = await res.json();
                return { title: v.title, text: d.text || "", url: v.url };
            });

            const transcripts = await Promise.all(transcriptPromises);
            
            // Now run the multi-video reasoning
            const res = await fetch("https://multigranular-darrin-nonartistical.ngrok-free.dev/multi-video-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcripts, query: query.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.text);
            }
        } catch (e) {
            console.error(e);
        }
        setAnalyzing(false);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="absolute bottom-4 right-4 z-50 w-[450px] bg-[#0c0c1e]/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-3xl flex flex-col overflow-hidden"
            style={{ height: "600px" }}
        >
            {/* Header */}
            <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl text-primary">
                        <Library size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Playlist Intelligence</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Bulk reasoning hub</p>
                    </div>
                </div>
                <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Input Area */}
                {!playlistData ? (
                    <div className="space-y-4">
                        <p className="text-xs text-white/50 leading-relaxed italic">
                            Enter a YouTube Channel or Playlist URL to extract knowledge across multiple high-value videos.
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                <input
                                    type="text"
                                    placeholder="Paste Playlist/Channel URL..."
                                    value={playlistUrl}
                                    onChange={(e) => setPlaylistUrl(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-primary/50"
                                />
                            </div>
                            <button
                                onClick={fetchPlaylistInfo}
                                disabled={loadingMetadata || !playlistUrl.trim()}
                                className="px-6 py-3 bg-primary text-white text-xs font-bold rounded-2xl disabled:opacity-50 hover:scale-105 transition-all"
                            >
                                {loadingMetadata ? <Loader2 className="animate-spin" size={16} /> : "Fetch"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Video Selection List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    Source: {playlistData.title}
                                </p>
                                <button 
                                    onClick={() => setPlaylistData(null)}
                                    className="text-[10px] text-primary font-bold hover:underline"
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                {playlistData.videos.map((vid, idx) => (
                                    <div
                                        key={`${vid.id}-${idx}`}
                                        onClick={() => toggleVideo(vid.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer",
                                            selectedVideoIds.has(vid.id) 
                                                ? "bg-primary/10 border-primary/30" 
                                                : "bg-white/5 border-white/5 opacity-50"
                                        )}
                                    >
                                        <img src={vid.thumbnail} className="w-12 h-8 object-cover rounded-lg" />
                                        <p className="flex-1 text-[10px] text-white font-medium truncate">{vid.title}</p>
                                        {selectedVideoIds.has(vid.id) && <CheckCircle2 size={12} className="text-primary" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reasoning UI */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-primary">
                                <Brain size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Cross-Video Analysis</span>
                            </div>
                            <textarea
                                placeholder="Ask a question across all selected videos (e.g., 'Summarize the core theme shared by these clips')"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-primary/50 resize-none"
                            />
                            <button
                                onClick={runBulkAnalysis}
                                disabled={analyzing || !query.trim() || selectedVideoIds.size === 0}
                                className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-[var(--glow-primary)] transition-all"
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        <MessageSquare size={16} />
                                        Run Knowledge Sythesis
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Result Area */}
                        {result && (
                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                                <div className="text-xs text-white/90 font-sans leading-relaxed prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{result}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
