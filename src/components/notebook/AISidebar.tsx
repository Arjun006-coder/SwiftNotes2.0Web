"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send, BrainCircuit, Network, Youtube, FileText, Zap, BookOpen, FlaskConical, ChevronRight, ArrowLeft, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import { updateNotebookVideoAINotes } from "@/app/actions";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MindMap = dynamic(() => import("./MindMap"), { ssr: false });
import type { VideoEntry } from "./VideoPanel";

interface Message { role: "user" | "assistant"; text: string; }
interface VideoCache { summary?: string; formulae?: string; cheatsheet?: string; flashcards?: string; theory?: string; }

const TABS = [
    { id: "qna",        label: "Q&A",        icon: BrainCircuit },
    { id: "summary",    label: "Summary",     icon: BookOpen },
    { id: "formulae",   label: "Formulae",    icon: FlaskConical },
    { id: "cheatsheet", label: "Cheatsheet",  icon: FileText },
    { id: "flashcards", label: "Flashcards",  icon: Zap },
    { id: "visualize",  label: "Mind Map",    icon: Network },
];

export default function AISidebar({ isOpen, onClose, notebookText, videos: rawVideos, videoTranscripts, notebookId, onAINotesUpdated, readOnly }: {
    isOpen: boolean;
    onClose: () => void;
    notebookText?: string;
    videos?: VideoEntry[];
    videoTranscripts?: { videoId: string; title: string; text: string }[];
    notebookId?: string;
    onAINotesUpdated?: () => void;
    readOnly?: boolean;
}) {
    // Step 1: pick a video. Step 2: use AI tabs
    const [step, setStep] = useState<"pick" | "ai">("pick");
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [ytUrl, setYtUrl] = useState("");
    const [addingVideo, setAddingVideo] = useState(false);

    const [activeTab, setActiveTab] = useState("qna");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", text: "Ask me anything about this video or your notes!" }
    ]);
    const [query, setQuery] = useState("");
    const [loadingChat, setLoadingChat] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatingTab, setGeneratingTab] = useState<string | null>(null);
    const [tabErrors, setTabErrors] = useState<Record<string, string>>({});
    const [cache, setCache] = useState<Record<string, VideoCache>>({});
    const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
    const [loadingGraph, setLoadingGraph] = useState(false);
    const [fetchingTranscript, setFetchingTranscript] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [loadingPhaseText, setLoadingPhaseText] = useState("Initializing Pipeline...");

    useEffect(() => {
        if (!generatingAll) return;
        setLoadingPhaseText("Downloading YouTube Video (~5s)...");
        const phases = [
            { time: 5000, text: "Extracting Visual Keyframes (~10s)..." },
            { time: 15000, text: "Uploading Video to Google AI (~15s)..." },
            { time: 30000, text: "Processing Neural Networks (~20s)..." },
            { time: 45000, text: "Executing Jitter Rate Limit (~20s)..." },
            { time: 65000, text: "Parallel Extracting 5 AI Tabs (~30s)..." },
            { time: 95000, text: "Finalizing Markdown Structures..." }
        ];
        const timeouts = phases.map(phase => 
            setTimeout(() => setLoadingPhaseText(phase.text), phase.time)
        );
        return () => timeouts.forEach(clearTimeout);
    }, [generatingAll]);

    // Local transcript store — fetched directly by AI sidebar, not requiring VideoPanel
    const [localTranscripts, setLocalTranscripts] = useState<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Merge raw video list + fetched transcripts into unified picker entries
    // rawVideos comes from DB (always has titles/ids), transcripts come after fetch
    const transcriptMap = new Map((videoTranscripts || []).map(t => [t.videoId, t]));
    const allVideos: { videoId: string; title: string; text?: string }[] = (
        rawVideos && rawVideos.length > 0
            ? rawVideos.map(v => ({ videoId: v.videoId, title: v.title, text: transcriptMap.get(v.videoId)?.text }))
            : (videoTranscripts || [])
    );
    const selectedVideo = allVideos.find(v => v.videoId === selectedVideoId);

    // Reset to pick step when sidebar opens fresh
    useEffect(() => {
        if (isOpen && allVideos.length === 0) setStep("pick");
    }, [isOpen]); // eslint-disable-line

    // Pre-populate cache from DB's aiNotes if they exist
    useEffect(() => {
        if (!rawVideos) return;
        setCache(prev => {
            const next = { ...prev };
            rawVideos.forEach((v: any) => {
                if (v.aiNotes) {
                    next[v.videoId] = { ...next[v.videoId], ...v.aiNotes };
                }
            });
            return next;
        });
    }, [rawVideos]);


    // When videos list grows (first video synced), auto-select if nothing selected
    useEffect(() => {
        if (allVideos.length > 0 && !selectedVideoId) {
            setSelectedVideoId(allVideos[0].videoId);
        }
    }, [allVideos.length]); // eslint-disable-line

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const context = () => {
        const parts: string[] = [];
        if (notebookText?.trim()) parts.push(`NOTES:\n${notebookText}`);
        // Check local (AI sidebar fetched), then VideoPanel transcripts
        const transcript = localTranscripts[selectedVideoId || ""]
            || selectedVideo?.text
            || transcriptMap.get(selectedVideoId || "")?.text;
        if (transcript) parts.push(`VIDEO TRANSCRIPT (${selectedVideo?.title}):\n${transcript}`);
        // If still empty but we have a selected video, at minimum use the title
        if (parts.length === 0 && selectedVideo) {
            parts.push(`Topic: ${selectedVideo.title}\n(Transcript not yet available — generate content based on this topic title)`);
        }
        return parts.join("\n\n");
    };

    // Fetch transcript directly in AI sidebar (VideoPanel may not have fetched it yet)
    const fetchTranscriptForVideo = async (videoId: string, videoUrl: string) => {
        if (localTranscripts[videoId] || transcriptMap.has(videoId)) return; // already have it
        setFetchingTranscript(true);
        try {
            const url = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
            const res = await fetch("/api/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.text) {
                    setLocalTranscripts(prev => ({ ...prev, [videoId]: data.text }));
                }
            } else {
                setTabErrors(prev => ({ ...prev, [activeTab]: data.error || "Failed to fetch transcript." }));
            }
        } catch (e: any) {
            console.error("Transcript fetch failed:", e);
            setTabErrors(prev => ({ ...prev, [activeTab]: e.message || "Network error fetching transcript." }));
        }
        setFetchingTranscript(false);
    };

    const callAI = async (promptType: string, ctx: string) => {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [], notebookText: ctx, promptType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI error");
        return data.text as string;
    };

    const handleSelectVideo = (vid: typeof allVideos[0]) => {
        setSelectedVideoId(vid.videoId);
        setStep("ai");
        setMessages([{ role: "assistant", text: `Ready to analyze **${vid.title}**. Ask me anything or click a tab!` }]);
        setTabErrors({});
        // Auto-fetch transcript if not available
        const videoUrl = rawVideos?.find((v: any) => v.videoId === vid.videoId)?.url || `https://www.youtube.com/watch?v=${vid.videoId}`;
        fetchTranscriptForVideo(vid.videoId, videoUrl);
    };

    const handleTabClick = async (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === "qna" || tabId === "visualize") return;

        const videoCache = selectedVideoId ? cache[selectedVideoId] : null;
        if (videoCache?.[tabId as keyof VideoCache]) return; // already cached

        // If analyzing a video, wait for Map-Reduce "Generate AI Analysis" button. Don't auto-fetch per tab!
        if (selectedVideoId) return;

        const ctx = context();
        if (!ctx.trim()) {
            setTabErrors(prev => ({ ...prev, [tabId]: "No context available. Please add notes to your notebook first." }));
            return;
        }

        setGeneratingTab(tabId);
        setTabErrors(prev => ({ ...prev, [tabId]: "" }));
        try {
            const result = await callAI(tabId, ctx);
            if (selectedVideoId) {
                setCache(prev => ({ ...prev, [selectedVideoId]: { ...prev[selectedVideoId], [tabId]: result } }));
                if (notebookId) {
                    updateNotebookVideoAINotes(notebookId, selectedVideoId, { [tabId]: result })
                        .then(() => onAINotesUpdated && onAINotesUpdated())
                        .catch(e => console.error("Failed to persist AI notes", e));
                }
            } else {
                // No video — store under "notes" key
                setCache(prev => ({ ...prev, __notes__: { ...prev.__notes__, [tabId]: result } }));
            }
        } catch (e: any) {
            setTabErrors(prev => ({ ...prev, [tabId]: e.message || "AI generation failed" }));
        }
        setGeneratingTab(null);
    };

    const handleGenerateVideoKnowledge = async () => {
        if (!selectedVideoId || !notebookId || generatingAll) return;
        
        // Safely extract the transcript (or use an empty string) so referencing it below doesn't throw a fatal ReferenceError JS Crash
        const safeTranscript = localTranscripts[selectedVideoId] || selectedVideo?.text || transcriptMap.get(selectedVideoId)?.text || "";
        
        setGeneratingAll(true);
        setTabErrors({});
        try {
            const videoUrl = rawVideos?.find((v: any) => v.videoId === selectedVideoId)?.url || `https://www.youtube.com/watch?v=${selectedVideoId}`;
            
            const res = await fetch("https://multigranular-darrin-nonartistical.ngrok-free.dev/extract", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true" 
                },
                body: JSON.stringify({ url: videoUrl })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.detail || "Map-Reduce AI generation failed");
            
            // Persist the massive AI chunk array natively to Supabase
            await updateNotebookVideoAINotes(notebookId, selectedVideoId, data);
            
            // Update cache locally for all tabs natively without blowing out memory
            setCache(prev => ({ ...prev, [selectedVideoId]: { ...prev[selectedVideoId], ...data } }));
            if (onAINotesUpdated) onAINotesUpdated();
        } catch (e: any) {
            setTabErrors(prev => ({ ...prev, [activeTab]: e.message || "Failed to generate AI pipeline." }));
        }
        setGeneratingAll(false);
    };

    // Auto-trigger video knowledge pipeline if nothing is cached yet
    useEffect(() => {
        if (!isOpen || !selectedVideoId || generatingAll) return;
        
        const videoCache = cache[selectedVideoId];
        const hasAnyCachedData = videoCache?.summary || videoCache?.cheatsheet || videoCache?.flashcards || videoCache?.formulae || videoCache?.theory;

        // Strict Loop Guard: If we crashed and have an error for this active tab, DO NOT immediately retry fetching! Otherwise React enters an infinite loop
        if (!hasAnyCachedData && !tabErrors[activeTab]) {
            handleGenerateVideoKnowledge();
        }
    }, [isOpen, selectedVideoId, localTranscripts, selectedVideo, transcriptMap, cache, generatingAll, fetchingTranscript]); // eslint-disable-line

    const handleSendChat = async () => {
        if (!query.trim() || loadingChat) return;
        const newMsg: Message = { role: "user", text: query };
        setMessages(prev => [...prev, newMsg]);
        setQuery("");
        setLoadingChat(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, newMsg], notebookText: context(), promptType: "qna" }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: "assistant", text: res.ok ? data.text : `❌ ${data.error}` }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Network error." }]);
        }
        setLoadingChat(false);
    };

    const getCached = (tabId: string) => {
        if (selectedVideoId) return cache[selectedVideoId]?.[tabId as keyof VideoCache];
        return (cache.__notes__ as any)?.[tabId];
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 220 }}
                    className="fixed top-0 right-0 h-screen w-[100vw] md:w-[420px] z-50 bg-[#0d0d1a]/97 backdrop-blur-xl border-l border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.5)] flex flex-col"
                >
                    {/* ── Header ── */}
                    <div className="p-4 border-b border-white/8 flex items-center justify-between bg-white/3 shrink-0">
                        <div className="flex items-center gap-2.5">
                            {step === "ai" && (
                                <button
                                    onClick={() => setStep("pick")}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition text-white/60 hover:text-white mr-1"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-white leading-none">Spark AI</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {step === "pick" ? "Choose a video to analyze" : (selectedVideo?.title || "AI Analysis")}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── STEP 1: Video Picker ── */}
                    {step === "pick" && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                            <p className="text-xs text-muted-foreground mb-2">Select a synced video to start AI analysis</p>

                            {allVideos.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                                    <Youtube size={40} className="text-white/10" />
                                    <p className="text-sm">No videos synced yet</p>
                                    <p className="text-xs text-white/30">Add a YouTube video in the notebook first using the 🎬 icon</p>
                                </div>
                            )}

                            {allVideos.map(v => (
                                <button
                                    key={v.videoId}
                                    onClick={() => handleSelectVideo(v)}
                                    className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-primary/30 rounded-2xl transition group text-left"
                                >
                                    <div className="relative shrink-0">
                                        <img
                                            src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                                            alt={v.title}
                                            className="w-20 h-14 object-cover rounded-xl"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-xl transition">
                                            <div className="w-7 h-7 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition">
                                                <svg className="w-3.5 h-3.5 text-gray-900 opacity-0 group-hover:opacity-100 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        </div>
                                        {v.text && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check size={8} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{v.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {v.text ? `✓ Transcript ready · ${Math.round(v.text.length / 4)} tokens` : "Transcript loading..."}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-white/20 group-hover:text-primary shrink-0 transition" />
                                </button>
                            ))}

                            {/* "Just use notes" option when no video needed */}
                            {notebookText?.trim() && (
                                <button
                                    onClick={() => { setSelectedVideoId(null); setStep("ai"); setMessages([{ role: "assistant", text: "Using your notebook notes. Ask me anything!" }]); }}
                                    className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/8 border border-dashed border-white/10 hover:border-white/20 rounded-2xl transition text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                                        <BookOpen size={16} className="text-white/50" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/70 font-medium">Use notebook notes only</p>
                                        <p className="text-[10px] text-muted-foreground">No video — analyze written notes</p>
                                    </div>
                                    <ChevronRight size={14} className="text-white/20 ml-auto shrink-0" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: AI Tabs ── */}
                    {step === "ai" && (
                        <>
                            {/* Transcript fetching banner */}
                            {fetchingTranscript && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-primary shrink-0">
                                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                                    Fetching transcript... AI tabs will unlock shortly.
                                </div>
                            )}

                            {/* Tab bar */}
                            <div className="px-4 pt-3 pb-0 border-b border-white/8 shrink-0">
                                {/* Change Video row */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                        {selectedVideo?.title || "Notebook notes"}
                                    </span>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {!readOnly && selectedVideoId && cache[selectedVideoId] && (
                                            <button
                                                onClick={() => {
                                                    // Clear all cached components for this video so it forcefully regenerates the pipeline
                                                    setCache(prev => ({ ...prev, [selectedVideoId as string]: {} }));
                                                    handleGenerateVideoKnowledge();
                                                }}
                                                disabled={generatingAll || fetchingTranscript}
                                                className="text-[10px] bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-full px-2 py-0.5 text-muted-foreground font-medium transition disabled:opacity-50"
                                            >
                                                {generatingAll ? "Regenerating..." : "Regenerate Pipeline"}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setStep("pick")}
                                            className="text-[10px] text-primary/80 hover:text-primary font-medium flex items-center gap-1"
                                        >
                                            <ArrowLeft size={10} /> Change video
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-1 overflow-x-auto pb-3 hide-scrollbar">
                                    {TABS.map(tab => {
                                        const Icon = tab.icon;
                                        const cached = !!getCached(tab.id);
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => handleTabClick(tab.id)}
                                                className={cn(
                                                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                                                    activeTab === tab.id
                                                        ? "bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                                                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <Icon size={11} />
                                                {tab.label}
                                                {cached && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* Tab content */}
                            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                                {/* ── Q&A ── */}
                                {activeTab === "qna" && (
                                    <div className="flex flex-col gap-2.5">
                                        {messages.map((m, i) => (
                                            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                                                <div className={cn(
                                                    "max-w-[88%] rounded-2xl p-3 text-sm whitespace-pre-wrap break-words leading-relaxed",
                                                    m.role === "user"
                                                        ? "bg-primary text-white rounded-tr-sm"
                                                        : "bg-white/8 text-white/90 rounded-tl-sm border border-white/5"
                                                )}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        ))}
                                        {loadingChat && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/8 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        {[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d*0.15}s` }} />)}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">Thinking...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}

                                {/* ── Mind Map ── */}
                                {activeTab === "visualize" && (
                                    <div className="h-full flex flex-col">
                                        {!graphData && !loadingGraph && (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-4">
                                                <Network size={40} className="text-white/15" />
                                                <p className="text-sm">Generate a mind map from your content</p>
                                                <button
                                                    onClick={async () => {
                                                        const ctx = context();
                                                        if (!ctx.trim()) return;
                                                        setLoadingGraph(true);
                                                        try {
                                                            const res = await fetch("/api/generate-graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ctx }) });
                                                            const data = await res.json();
                                                            if (res.ok) setGraphData(data);
                                                        } catch { }
                                                        setLoadingGraph(false);
                                                    }}
                                                    className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/80 text-white text-sm font-medium transition"
                                                >
                                                    Generate Mind Map
                                                </button>
                                            </div>
                                        )}
                                        {loadingGraph && (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                <p className="text-sm">Building knowledge graph...</p>
                                            </div>
                                        )}
                                        {graphData && <div className="w-full flex-1 min-h-[400px]"><MindMap initialNodes={graphData.nodes} initialEdges={graphData.edges} /></div>}
                                    </div>
                                )}

                                {/* Generated content tabs (Summary, Flashcards, etc.) */}
                                {!["qna", "visualize"].includes(activeTab) && generatingTab === activeTab && (
                                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm">Generating {TABS.find(t => t.id === activeTab)?.label}...</p>
                                        <p className="text-xs opacity-60">{selectedVideo?.title || "from notes"}</p>
                                    </div>
                                )}
                                {!["qna", "visualize"].includes(activeTab) && generatingTab !== activeTab && Boolean(tabErrors[activeTab]) && (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 max-w-xs">
                                            {tabErrors[activeTab]}
                                        </div>
                                        <button onClick={() => handleTabClick(activeTab)} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition">
                                            Retry
                                        </button>
                                    </div>
                                )}
                                {!["qna", "visualize"].includes(activeTab) && generatingTab !== activeTab && !tabErrors[activeTab] && Boolean(getCached(activeTab)) && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-green-400 font-medium">Ready</span>
                                            {!readOnly && (
                                                <button onClick={() => { if (selectedVideoId) setCache(prev => ({ ...prev, [selectedVideoId]: { ...prev[selectedVideoId], [activeTab]: undefined as any } })); handleTabClick(activeTab); }} className="text-xs text-muted-foreground hover:text-white transition">Regenerate</button>
                                            )}
                                        </div>
                                        <div className="text-white/85 text-sm leading-relaxed bg-white/3 rounded-2xl p-4 border border-white/5 overflow-y-auto">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-5 mb-2 text-white" {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-5 mb-2 text-[#a78bfa]" {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-4 mb-2 text-white/90" {...props} />,
                                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1.5" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-1.5" {...props} />,
                                                    li: ({node, ...props}) => <li className="ml-1 text-white/80" {...props} />,
                                                    code: ({node, ...props}: any) => props.inline 
                                                        ? <code className="bg-black/50 text-[#c4b5fd] px-1.5 py-0.5 rounded-md text-xs font-mono" {...props} />
                                                        : <code className="block bg-[#0f0f11] p-4 rounded-xl overflow-x-auto text-xs font-mono mb-4 border border-white/10 text-[#e2e8f0]" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                                                    table: ({node, ...props}) => <div className="overflow-x-auto mb-4 border border-white/10 rounded-lg"><table className="min-w-full divide-y divide-white/10" {...props} /></div>,
                                                    th: ({node, ...props}) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider bg-white/5" {...props} />,
                                                    td: ({node, ...props}) => <td className="px-4 py-2 whitespace-nowrap text-sm text-white/80 border-t border-white/10" {...props} />,
                                                    hr: ({node, ...props}) => <hr className="my-5 border-white/10" {...props} />
                                                }}
                                            >
                                                {getCached(activeTab) || ""}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                {!["qna", "visualize"].includes(activeTab) && generatingTab !== activeTab && !tabErrors[activeTab] && !getCached(activeTab) && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            {TABS.filter(t => t.id === activeTab).map(Tab => <Tab.icon key={Tab.id} size={28} className="text-primary/60" />)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white/80 mb-1">Generate {selectedVideo ? "Full AI Pipeline" : TABS.find(t => t.id === activeTab)?.label}</p>
                                            <p className="text-xs">{selectedVideo ? `Extract topics, facts, and structure from: ${selectedVideo?.title}` : "From your notebook notes"}</p>
                                        </div>
                                        {!readOnly ? (
                                            selectedVideo ? (
                                                <button 
                                                    onClick={handleGenerateVideoKnowledge} 
                                                    disabled={generatingAll || fetchingTranscript}
                                                    className="px-7 py-2.5 rounded-full bg-primary hover:bg-primary/80 text-white text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {generatingAll ? <><div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" /> {loadingPhaseText}</> : "Generate AI Analysis"}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleTabClick(activeTab)} 
                                                    className="px-7 py-2.5 rounded-full bg-primary hover:bg-primary/80 text-white text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition"
                                                >
                                                    Generate {TABS.find(t => t.id === activeTab)?.label}
                                                </button>
                                            )
                                        ) : (
                                            <div className="text-[11px] text-white/50 bg-white/5 border border-white/10 px-4 py-2 rounded-xl mt-2 text-center max-w-[200px]">
                                                Only authorized editors can generate AI pipelines.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Chat input — only for Q&A tab */}
                            {activeTab === "qna" && !readOnly && (
                                <div className="p-4 bg-black/30 border-t border-white/8 shrink-0">
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            placeholder={selectedVideo ? `Ask about "${selectedVideo.title}"...` : "Ask about your notes..."}
                                            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-14 text-sm text-white focus:outline-none focus:border-primary/50 transition"
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") handleSendChat(); }}
                                        />
                                        <button
                                            disabled={loadingChat || !query.trim()}
                                            onClick={handleSendChat}
                                            className="absolute right-2 p-2 bg-primary hover:bg-primary/80 rounded-full transition text-white disabled:opacity-40"
                                        >
                                            <Send size={15} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}


