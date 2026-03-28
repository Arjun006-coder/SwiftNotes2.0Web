"use client";

import { motion } from "framer-motion";
import { Search, Heart, BookOpen, Globe, Tag, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { getCommunityNotebooks, voteNotebook, toggleBookmark } from "@/app/actions";
import Link from "next/link";
import { useDebounceValue } from "usehooks-ts";
import CommentsModal from "@/components/notebook/CommentsModal";

const GRADIENTS = [
    "from-violet-500 to-indigo-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-cyan-500 to-blue-500",
    "from-purple-500 to-pink-500",
    "from-red-500 to-orange-500",
    "from-teal-500 to-green-500",
];

export default function CommunityPage() {
    const [notebooks, setNotebooks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [activeTag, setActiveTag] = useState("All");
    const [sortMode, setSortMode] = useState<"trending" | "topWeek" | "topAllTime" | "newest">("trending");
    
    // Interactive Modal states
    const [commentTarget, setCommentTarget] = useState<{ id: string, title: string } | null>(null);

    // Stop aggressive auto-fetching to prevent Gemini API 429 Quota Exceeded limits!
    const [executedSearch, setExecutedSearch] = useState("");

    const fetchNotebooks = useCallback(async (search: string, tag: string, sort: string) => {
        setIsLoading(true);
        let tagFilters: string[] = [];
        if (tag !== "All") tagFilters.push(tag);

        if (search.trim()) {
            // Advanced Feature: Map search query to semantic tags using NLP
            try {
                const res = await fetch("/api/semantic-tags", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ search })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.tags && data.tags.length > 0) {
                        tagFilters = [...new Set([...tagFilters, ...data.tags])];
                    }
                }
            } catch (e) {
                console.error("NLP semantic tag fetch failed", e);
            }
        }

        const data = await getCommunityNotebooks(search, tagFilters, sort);
        setNotebooks(data || []);
        setIsLoading(false);
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchNotebooks("", "", "trending");
    }, [fetchNotebooks]);

    // Re-fetch when explicit search executes or specific tag/sort filters change
    useEffect(() => {
        fetchNotebooks(executedSearch, activeTag, sortMode);
    }, [executedSearch, activeTag, sortMode, fetchNotebooks]);

    // All tags extracted from current results (for the "All" case — full tag list)
    const [allTags, setAllTags] = useState<string[]>(["All"]);
    useEffect(() => {
        // Fetch all public notebooks without filter to build the tag cloud
        getCommunityNotebooks("", [], "trending").then(data => {
            if (!data) return;
            const tagSet = new Set<string>(["All"]);
            data.forEach((n: any) => (n.tags || []).forEach((t: string) => tagSet.add(t)));
            setAllTags(Array.from(tagSet));
        });
    }, []);

    const handleVote = async (notebookId: string, value: 1 | -1, currentIndex: number) => {
        try {
            // Optimistic UI update
            const updated = [...notebooks];
            const nb = updated[currentIndex];
            const newValue = value === nb.myVote ? 0 : value; // toggle off if clicking same

            // Compute delta
            const previousVote = nb.myVote || 0;
            const delta = newValue - previousVote;
            nb.likes = (nb.likes || 0) + delta;
            nb.myVote = newValue;
            setNotebooks(updated);

            await voteNotebook(notebookId, newValue as any);
        } catch (e: any) { alert(e.message); }
    };

    const handleBookmark = async (notebookId: string, currentIndex: number) => {
        try {
            const updated = [...notebooks];
            const nb = updated[currentIndex];
            nb.isBookmarked = !nb.isBookmarked;
            setNotebooks(updated);
            await toggleBookmark(notebookId, nb.isBookmarked);
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="p-6 md:p-8 md:pt-12 max-w-7xl mx-auto space-y-8 pb-20">
            {commentTarget && (
                <CommentsModal 
                    notebookId={commentTarget.id} 
                    notebookTitle={commentTarget.title} 
                    onClose={() => setCommentTarget(null)} 
                />
            )}
            {/* Featured Spotlight */}
            {!isLoading && notebooks.length > 0 && (
                <Link href={`/notebook/${notebooks[0].id}`}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 md:p-12 rounded-[3rem] border-primary/20 relative overflow-hidden group mb-12"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />
                        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1 space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest">
                                    🌟 Notebook of the Week
                                </div>
                                <h2 className="text-4xl md:text-5xl font-display font-bold text-white group-hover:text-primary transition-colors leading-[1.1]">
                                    {notebooks[0].title}
                                </h2>
                                <p className="text-lg text-muted-foreground line-clamp-2 max-w-xl">
                                    {notebooks[0].description || "An exceptional study resource shared by the community."}
                                </p>
                                <div className="flex items-center gap-6 pt-4">
                                    <div className="flex items-center gap-2">
                                        <Heart className="text-rose-400 fill-rose-400" size={18} />
                                        <span className="font-bold text-white">{notebooks[0].likes || 0}</span>
                                    </div>
                                    <div className="text-xs text-white/40 flex items-center gap-2">
                                        Shared by <span className="text-white font-semibold">@{notebooks[0].user?.name?.split(" ")[0] || "Scholar"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/3 aspect-[4/3] bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                                <BookOpen size={64} className="text-white/10 group-hover:text-primary/20 transition-colors" />
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                            </div>
                        </div>
                    </motion.div>
                </Link>
            )}

            {/* Community Stats Bar */}
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {[
                    { label: "Community Notes", val: "12,480", icon: <BookOpen size={16} /> },
                    { label: "Active Scholars", val: "2,310", icon: <Users size={16} /> },
                    { label: "Public Tags", val: (allTags.length - 1).toString(), icon: <Tag size={16} /> },
                    { label: "Total Views", val: "85K+", icon: <Globe size={16} /> }
                ].map(stat => (
                    <div key={stat.label} className="glass-card p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white leading-tight">{stat.val}</p>
                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div> */}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        Community Hub
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Explore, vote, and discuss public notebooks shared by the globally.
                    </p>
                </div>
                <div className="relative shrink-0 flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && setExecutedSearch(searchInput.trim())}
                            placeholder="Search (Press Enter to execute)..."
                            className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 w-72 lg:w-96 transition-all"
                        />
                    </div>
                    {searchInput !== executedSearch && (
                        <button onClick={() => setExecutedSearch(searchInput.trim())} className="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-full text-xs font-semibold transition" title="Search">
                            Go
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-Navigation and Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Reddit-Style Trending Tabs */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-full">
                    {[
                        { id: "trending", label: "🔥 Trending" },
                        { id: "topWeek", label: "🎖️ Top (Week)" },
                        { id: "topAllTime", label: "🏆 All Time" },
                        { id: "newest", label: "✨ Newest" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSortMode(tab.id as any)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                                sortMode === tab.id
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tag pill filters */}
                <div className="flex flex-wrap gap-2 max-w-xl justify-end">
                    {allTags.slice(0, 8).map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border",
                                activeTag === tag
                                    ? "bg-primary text-white border-primary shadow-[var(--glow-primary)]"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {tag !== "All" && <Tag size={10} />}
                            {tag}
                        </button>
                    ))}
                    {allTags.length > 8 && <span className="text-[10px] text-muted-foreground self-center ml-1">+{allTags.length - 8} more</span>}
                </div>
            </div>

            {/* Loading skeleton */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-card rounded-2xl h-52 animate-pulse bg-white/3" />
                    ))}
                </div>
            ) : notebooks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <BookOpen size={48} className="text-white/10" />
                    <div className="text-center">
                        <p className="font-semibold text-white/50 mb-1">
                            {searchInput || activeTag !== "All" ? "No notebooks match your search" : "No public notebooks yet"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            {searchInput || activeTag !== "All"
                                ? "Try different keywords or clear the filter."
                                : "Be the first! Open a notebook → ⚙️ Settings → add tags → toggle public."}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-xs text-muted-foreground -mt-4">
                        {notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''} found
                        {activeTag !== "All" ? ` tagged "${activeTag}"` : ""}
                        {searchInput ? ` matching "${searchInput}"` : ""}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {notebooks.map((nb: any, i: number) => {
                            const gradient = GRADIENTS[i % GRADIENTS.length];
                            const authorName = nb.user?.name || nb.user?.email?.split("@")[0] || "Anonymous";
                            const authorInitial = authorName[0].toUpperCase();
                            const tags: string[] = nb.tags || [];

                            return (
                                <Link key={nb.id} href={`/notebook/${nb.id}`}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="glass-card group hover:border-primary/30 transition-all cursor-pointer rounded-2xl overflow-hidden relative flex flex-col h-full"
                                    >
                                        {/* Color accent bar */}
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${gradient} shrink-0`} />

                                        <div className="p-5 flex flex-col flex-1 pb-16">
                                            {/* Author */}
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm overflow-hidden`}>
                                                    {nb.user?.avatar
                                                        ? <img src={nb.user.avatar} alt={authorName} className="w-full h-full object-cover" />
                                                        : authorInitial}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-white/80 truncate">{authorName}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-green-400">
                                                        <Globe size={9} /> {nb.views ? `${nb.views} views` : 'Public'}
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBookmark(nb.id, i); }} className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition group/bm">
                                                    <Heart size={14} className={cn("transition", nb.isBookmarked ? "text-rose-400 fill-rose-400" : "text-muted-foreground group-hover/bm:text-rose-400")} />
                                                </button>
                                            </div>

                                            {/* Title */}
                                            <h2 className="font-display font-bold text-base text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                                                {nb.title}
                                            </h2>
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {nb.description?.trim() || "A notebook shared to the SwiftNotes community."}
                                            </p>

                                            {/* Tags */}
                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/5">
                                                    {tags.slice(0, 5).map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={(e) => { e.preventDefault(); setActiveTag(tag); }}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-medium border transition hover:scale-105",
                                                                activeTag === tag
                                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                                    : "bg-primary/8 text-primary/80 border-primary/15 hover:bg-primary/15"
                                                            )}
                                                        >
                                                            #{tag}
                                                        </button>
                                                    ))}
                                                    {tags.length > 5 && (
                                                        <span className="px-2 py-0.5 bg-white/5 text-muted-foreground rounded-full text-[10px]">
                                                            +{tags.length - 5}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reddit-Style Voting/Action Bar at bottom */}
                                        <div className="absolute bottom-0 left-0 w-full p-4 flex items-center justify-between border-t border-white/5 bg-black/20 backdrop-blur-sm z-20">
                                            <div className="flex bg-white/5 rounded-full items-center">
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(nb.id, 1, i); }} className="p-1.5 rounded-full hover:bg-white/10 transition group/up">
                                                    <svg className={cn("w-4 h-4 transition", nb.myVote === 1 ? "text-orange-500" : "text-muted-foreground group-hover/up:text-orange-500")} fill="currentColor" viewBox="0 0 24 24"><path d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1.001 1.001 0 0 0 .781-1.625l-8-10c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 0 0 4 14z" /></svg>
                                                </button>
                                                <span className={cn("text-xs font-bold px-1 font-mono", nb.myVote === 1 ? "text-orange-500" : nb.myVote === -1 ? "text-indigo-400" : "text-white")}>{nb.likes || 0}</span>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote(nb.id, -1, i); }} className="p-1.5 rounded-full hover:bg-white/10 transition group/down">
                                                    <svg className={cn("w-4 h-4 transition", nb.myVote === -1 ? "text-indigo-400" : "text-muted-foreground group-hover/down:text-indigo-400")} fill="currentColor" viewBox="0 0 24 24"><path d="M20 10h-4V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v7H4a1.001 1.001 0 0 0-.781 1.625l8 10a1 1 0 0 0 1.562 0l8-10A1.001 1.001 0 0 0 20 10z" /></svg>
                                                </button>
                                            </div>

                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCommentTarget({ id: nb.id, title: nb.title }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 transition text-muted-foreground hover:text-white">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                                <span className="text-xs font-semibold">{nb.commentCount || Object.keys(nb.NotebookComment || []).length || 0}</span>
                                            </button>
                                        </div>

                                        {/* Background glow */}
                                        <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-12 transition-opacity blur-2xl rounded-full pointer-events-none`} />
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
