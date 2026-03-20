"use client";

import { motion } from "framer-motion";
import { Search, Heart, BookOpen, Globe, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getCommunityNotebooks } from "@/app/actions";
import Link from "next/link";
import { useDebounceValue } from "usehooks-ts";

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

    // Debounce search to avoid spamming the server action
    const [debouncedSearch] = useDebounceValue(searchInput, 400);

    const fetchNotebooks = useCallback(async (search: string, tag: string) => {
        setIsLoading(true);
        const data = await getCommunityNotebooks(search, tag === "All" ? "" : tag);
        setNotebooks(data || []);
        setIsLoading(false);
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchNotebooks("", "");
    }, [fetchNotebooks]);

    // Re-fetch when search or tag changes
    useEffect(() => {
        fetchNotebooks(debouncedSearch, activeTag);
    }, [debouncedSearch, activeTag, fetchNotebooks]);

    // All tags extracted from current results (for the "All" case — full tag list)
    const [allTags, setAllTags] = useState<string[]>(["All"]);
    useEffect(() => {
        // Fetch all public notebooks without filter to build the tag cloud
        getCommunityNotebooks("", "").then(data => {
            if (!data) return;
            const tagSet = new Set<string>(["All"]);
            data.forEach((n: any) => (n.tags || []).forEach((t: string) => tagSet.add(t)));
            setAllTags(Array.from(tagSet));
        });
    }, []);

    return (
        <div className="p-6 md:p-8 md:pt-12 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        Community Hub
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Explore public notebooks shared by the community. Publish yours via notebook → ⚙️ settings.
                    </p>
                </div>
                <div className="relative shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search by title, description, or tag..."
                        className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 w-72 transition-all"
                    />
                </div>
            </div>

            {/* Tag filter pills */}
            <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
                            activeTag === tag
                                ? "bg-primary text-white border-primary shadow-[var(--glow-primary)]"
                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                        )}
                    >
                        {tag !== "All" && <Tag size={10} />}
                        {tag}
                    </button>
                ))}
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

                                        <div className="p-5 flex flex-col flex-1">
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
                                                        <Globe size={9} /> Public
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                    <Heart size={12} />
                                                    <span>{nb.likes || 0}</span>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h2 className="font-display font-bold text-base text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                                                {nb.title}
                                            </h2>
                                            <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
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
