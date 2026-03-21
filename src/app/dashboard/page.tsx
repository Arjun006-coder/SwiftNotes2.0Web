"use client";

import { Plus, Settings, PlayCircle, BrainCircuit, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getNotebooks, createNotebook, deleteNotebook, getNotebookIdByOTP, getFavoriteNotebooks } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ShelfPage() {
    const [notebooks, setNotebooks] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"mine" | "favorites">("mine");
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const [data, favData] = await Promise.all([
                getNotebooks(),
                getFavoriteNotebooks()
            ]);
            setNotebooks(data);
            setFavorites(favData);
            setLoading(false);
        }
        load();
    }, []);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setIsCreating(true);
        try {
            const COVER_COLORS = [
                "from-[#FF6584] to-[#FFC371]",
                "from-[#43E97B] to-[#38F9D7]",
                "from-[#89f7fe] to-[#66a6ff]",
                "from-[#A18CD1] to-[#FBC2EB]",
                "from-[#f7971e] to-[#ffd200]",
                "from-[#ee0979] to-[#ff6a00]",
            ];
            // Deterministic color so SSR and client agree (no Math.random)
            const colorIndex = newTitle.trim().length % COVER_COLORS.length;
            const nb = await createNotebook(newTitle, COVER_COLORS[colorIndex]);
            setNotebooks([nb, ...notebooks]);
            setNewTitle("");
            setIsCreating(false);
        } catch (err) {
            console.error(err);
            setIsCreating(false);
        }
    };

    const promptDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await deleteNotebook(deleteModal.id);
            setNotebooks(notebooks.filter(n => n.id !== deleteModal.id));
        } catch (err) {
            console.error(err);
        }
    };

    const lastSession = notebooks[0];

    return (
        <div className="p-6 md:p-8 md:pt-12 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        My Shelf
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full p-1 pl-4 pr-1">
                        <input
                            type="text"
                            placeholder="Enter 6-digit Room PIN..."
                            className="bg-transparent border-none outline-none text-sm w-44 tracking-widest uppercase font-bold text-primary placeholder:font-normal placeholder:tracking-normal placeholder:capitalize"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                        />
                        <button
                            onClick={async () => {
                                if (otpCode.length < 6) return alert("Please enter the full 6-character room code.");
                                setIsJoining(true);
                                const notebookId = await getNotebookIdByOTP(otpCode);
                                if (notebookId) {
                                    router.push(`/notebook/${notebookId}?otp=${otpCode}`);
                                } else {
                                    alert("Room not found or expired.");
                                    setIsJoining(false);
                                }
                            }}
                            disabled={isJoining || otpCode.length < 6}
                            className="bg-primary hover:bg-primary/80 text-white rounded-full px-4 py-1.5 text-xs font-bold transition-colors shadow-[var(--glow-primary)] disabled:opacity-50"
                        >
                            {isJoining ? "Joining..." : "Join Session"}
                        </button>
                    </div>
                    <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-muted-foreground w-full sm:w-auto flex justify-center">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Organizing your library...</p>
                </div>
            ) : (
                <>
                    {/* Resume Learning */}
                    {lastSession && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h2 className="text-lg font-medium text-muted-foreground mb-4">Resume Learning</h2>
                            <Link href={`/notebook/${lastSession.id}`}>
                                <div className="relative overflow-hidden rounded-[28px] p-6 md:p-8 flex items-center gap-6 group hover:scale-[1.01] transition-transform duration-300">
                                    <div className={cn("absolute inset-0 opacity-80", lastSession.coverColor)} />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.1),transparent)]" />

                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0 z-10 shadow-lg group-hover:bg-white/30 transition-colors">
                                        <PlayCircle className="text-white w-10 h-10 md:w-12 md:h-12" />
                                    </div>

                                    <div className="z-10 flex-1">
                                        <h3 className="text-2xl md:text-3xl font-bold font-display text-white drop-shadow-md mb-1">{lastSession.title}</h3>
                                        <p className="text-white/90 text-sm mb-2">Last edited {new Date(lastSession.updatedAt).toLocaleDateString()}</p>
                                        <div className="flex items-center gap-1.5 text-white/80 text-sm font-medium">
                                            <BrainCircuit size={16} />
                                            <span>Smart AI Sync Active</span>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex z-10 bg-white text-primary px-6 py-3 rounded-full font-bold shadow-lg group-hover:shadow-xl transition-shadow">
                                        Open Notebook
                                    </div>
                                </div>
                            </Link>
                        </section>
                    )}

                    {/* Notebooks Grid */}
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => setActiveTab("mine")}
                                className={cn(
                                    "text-lg font-medium transition-all pb-1 border-b-2",
                                    activeTab === "mine" ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                                )}
                            >
                                All Notebooks
                            </button>
                            <button
                                onClick={() => setActiveTab("favorites")}
                                className={cn(
                                    "text-lg font-medium transition-all pb-1 border-b-2",
                                    activeTab === "favorites" ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                                )}
                            >
                                Favorites
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {(activeTab === "mine" ? notebooks : favorites).map((session, i) => (
                                <NotebookCard key={session.id} session={session} index={i} onDelete={(e) => promptDelete(session.id, e)} hideDelete={activeTab === "favorites"} />
                            ))}
                            {activeTab === "mine" && notebooks.length === 0 && !isCreating && (
                                <div className="col-span-full py-20 text-center glass-card rounded-3xl border-dashed">
                                    <p className="text-muted-foreground mb-4">You haven't created any notebooks yet.</p>
                                    <button
                                        onClick={() => (document.getElementById('nb-input') as HTMLInputElement)?.focus()}
                                        className="text-primary font-bold hover:underline"
                                    >
                                        Create your first one below
                                    </button>
                                </div>
                            )}
                            {activeTab === "favorites" && favorites.length === 0 && (
                                <div className="col-span-full py-20 text-center glass-card rounded-3xl border-dashed">
                                    <p className="text-muted-foreground mb-4">You haven't bookmarked any notebooks yet.</p>
                                    <Link href="/dashboard/community" className="text-primary font-bold hover:underline">
                                        Explore the Community Hub
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

            {/* Quick Create Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl">
                <div className="glass-card shadow-2xl rounded-full p-2 flex items-center gap-2 border-primary/20">
                    <input
                        id="nb-input"
                        type="text"
                        placeholder="New notebook title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        className="bg-transparent flex-1 px-6 text-sm focus:outline-none placeholder:text-muted-foreground/50"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || !newTitle.trim()}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isCreating ? <Loader2 size={24} className="text-white animate-spin" /> : <Plus className="text-white" size={24} />}
                    </button>
                </div>
            </div>
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Notebook"
                description="Are you absolutely sure you want to delete this notebook? This action cannot be undone and all pages will be permanently lost."
                confirmText="Yes, delete it"
            />
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotebookCard({ session, index, onDelete, hideDelete }: { session: any, index: number, onDelete: (e: React.MouseEvent) => void, hideDelete?: boolean }) {
    const isGradient = session.coverColor?.startsWith("from-");
    const router = useRouter();
    const tags: string[] = session.tags || [];

    return (
        <div onClick={() => router.push(`/notebook/${session.id}`)} className="cursor-pointer">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group relative h-64 rounded-[32px] overflow-hidden flex flex-col justify-end p-5 hover:-translate-y-2 transition-transform duration-300 shadow-xl"
            >
                <div className={cn("absolute inset-0 bg-gradient-to-br", isGradient ? session.coverColor : "from-[#A18CD1] to-[#FBC2EB]")} />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.1),transparent)] border border-white/20 rounded-[32px]" />

                {/* Title */}
                <div className="z-10 mb-3">
                    <h3 className="text-xl font-bold font-display text-white drop-shadow-md line-clamp-2 leading-tight">{session.title}</h3>
                    {session.description && (
                        <p className="text-white/70 text-xs mt-1 line-clamp-1">{session.description}</p>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="z-10 flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((tag: string) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white/90 rounded-full text-[10px] font-semibold border border-white/30"
                            >
                                #{tag}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded-full text-[10px]">+{tags.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Delete Button */}
                {!hideDelete && (
                    <button
                        onClick={onDelete}
                        className="absolute top-4 right-4 z-20 p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-md"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                <div className="z-10 flex w-full justify-between items-center mt-auto">
                    <p className="text-white/60 text-[10px]">
                        {new Date(session.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <div className="w-9 h-9 rounded-2xl border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                        <PlayCircle className="text-white w-5 h-5" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
