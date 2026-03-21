"use client";

import { useState, useEffect } from "react";
import { X, Send, User } from "lucide-react";
import { getNotebookComments, addNotebookComment } from "@/app/actions";

function timeAgo(dateString: string) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = new Date(dateString).getTime() - Date.now();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (Math.abs(days) > 1) return rtf.format(days, 'day');
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (Math.abs(hours) > 1) return rtf.format(hours, 'hour');
    const minutes = Math.round(diff / (1000 * 60));
    if (Math.abs(minutes) < 1) return "just now";
    return rtf.format(minutes, 'minute');
}

export default function CommentsModal({ notebookId, notebookTitle, onClose }: { notebookId: string, notebookTitle: string, onClose: () => void }) {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newText, setNewText] = useState("");
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        getNotebookComments(notebookId).then(data => {
            setComments(data);
            setLoading(false);
        });
    }, [notebookId]);

    const handlePost = async () => {
        if (!newText.trim()) return;
        setPosting(true);
        try {
            const comment = await addNotebookComment(notebookId, newText);
            setComments(prev => [comment, ...prev]);
            setNewText("");
        } catch (e: any) {
            alert(e.message || "Failed to post comment");
        }
        setPosting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="w-full max-w-md h-full bg-card border-l border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-white/5">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Discussions</h2>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{notebookTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <span className="animate-pulse">Loading comments...</span>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                            <span className="text-4xl mb-2">💬</span>
                            <p className="text-sm font-semibold">No comments yet.</p>
                            <p className="text-xs">Be the first to share your thoughts!</p>
                        </div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 overflow-hidden flex items-center justify-center">
                                    {c.User?.avatar ? <img src={c.User.avatar} className="w-full h-full object-cover" /> : <User size={14} className="text-primary" />}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">{c.User?.name || "Anonymous"}</span>
                                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed bg-white/5 px-3 py-2 rounded-xl rounded-tl-none border border-white/5">
                                        {c.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 focus-within:border-primary/50 transition-colors">
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
                            placeholder="Add a comment..."
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePost()}
                        />
                        <button 
                            disabled={!newText.trim() || posting}
                            onClick={handlePost}
                            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-3 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
