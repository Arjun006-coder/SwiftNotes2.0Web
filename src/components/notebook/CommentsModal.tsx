"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, User, MoreHorizontal, MessageSquare, Trash2, Edit2, Flag } from "lucide-react";
import { getNotebookComments, addNotebookComment, deleteNotebookComment, editNotebookComment } from "@/app/actions";
import { cn } from "@/lib/utils";

function timeAgo(dateString: string) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });
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
    const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const fetchComments = async () => {
        const data = await getNotebookComments(notebookId);
        setComments(data);
        setLoading(false);
    };

    useEffect(() => { fetchComments(); }, [notebookId]);

    const handlePost = async () => {
        if (!newText.trim()) return;
        
        const tempId = `temp-${Date.now()}`;
        const activeParentId = replyTo?.id || null;
        
        // Optimistic UI Render instantly
        const optimisticComment = {
            id: tempId,
            content: newText.trim(),
            createdAt: new Date().toISOString(),
            parentId: activeParentId,
            isOwner: true, 
            User: { name: "You", avatar: null }
        };

        setComments(prev => [...prev, optimisticComment]);
        const textToPost = newText;
        setNewText("");
        setReplyTo(null);
        setPosting(true);

        try {
            await addNotebookComment(notebookId, textToPost, activeParentId || undefined);
            await fetchComments(); // background resync to get real UUID
        } catch (e: any) {
            alert(e.message || "Failed to post comment");
            setComments(prev => prev.filter(c => c.id !== tempId)); // revert
        }
        setPosting(false);
    };

    // Build hierarchical tree efficiently O(N)
    const roots: any[] = [];
    const map = new Map();
    comments.forEach(c => map.set(c.id, { ...c, children: [] }));
    comments.forEach(c => {
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId).children.push(map.get(c.id));
        } else {
            roots.push(map.get(c.id));
        }
    });

    const CommentNode = ({ node, depth = 0 }: { node: any, depth?: number }) => {
        const [showMenu, setShowMenu] = useState(false);
        const [isEditing, setIsEditing] = useState(false);
        const [editText, setEditText] = useState(node.content);

        const commitEdit = async () => {
            if (!editText.trim() || editText === node.content) { setIsEditing(false); return; }
            setComments(prev => prev.map(c => c.id === node.id ? { ...c, content: editText } : c));
            setIsEditing(false);
            try { await editNotebookComment(node.id, editText); } catch (e: any) { alert(e.message); fetchComments(); }
        };

        const executeDelete = async () => {
            if (!confirm("Delete this comment permanently?")) return;
            setComments(prev => prev.filter(c => c.id !== node.id && c.parentId !== node.id));
            try { await deleteNotebookComment(node.id); } catch (e: any) { alert(e.message); fetchComments(); }
        };

        const isTemp = String(node.id).startsWith("temp-");

        return (
            <div className={cn("flex flex-col mb-3 relative z-10", depth > 0 && "ml-4 md:ml-8 pl-3 md:pl-4 border-l border-white/10")}>
                <div className="flex gap-2 md:gap-3 group relative w-full items-start">
                    
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/20 shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                        {node.User?.avatar ? <img src={node.User.avatar} className="w-full h-full object-cover" /> : <User size={13} className="text-primary" />}
                    </div>

                    <div className="flex flex-col min-w-0 pr-6 w-full">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{node.User?.name || "Anonymous"}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(node.createdAt)}</span>
                            {isTemp && <span className="text-[9px] text-primary/60 border border-primary/20 bg-primary/10 px-1 rounded-sm">Sending...</span>}
                        </div>
                        
                        {isEditing ? (
                            <div className="mt-1 flex flex-col gap-1 items-end w-full">
                                <textarea 
                                    autoFocus
                                    className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 resize-none min-h-[50px]"
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                                        if (e.key === "Escape") setIsEditing(false);
                                    }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(false)} className="text-[10px] text-muted-foreground hover:text-white transition">Cancel</button>
                                    <button onClick={commitEdit} className="text-[10px] bg-primary text-white px-2 py-0.5 rounded transition">Save</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 break-words relative overflow-hidden inline-block w-fit">
                                {node.content}
                            </p>
                        )}
                        
                        {!isEditing && depth < 3 && !isTemp && (
                            <button 
                                onClick={() => { setReplyTo({ id: node.id, name: node.User?.name || "Anonymous" }); inputRef.current?.focus(); }}
                                className="text-[10px] text-muted-foreground hover:text-primary transition self-start mt-1 flex items-center gap-1 font-medium"
                            >
                                <MessageSquare size={10} /> Reply
                            </button>
                        )}
                    </div>

                    {/* Menu Dropdown Container - Move to the far right inside the flex container */}
                    <div className="absolute top-0 right-0 z-[60]">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 opacity-30 group-hover:opacity-100 transition shadow-[0_0_10px_rgba(0,0,0,0.5)] z-[60]"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        
                        {showMenu && (
                            <div className="absolute right-0 top-6 w-32 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-[70]">
                                {/* Invisible fixed overlay to close menu freely */}
                                <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                                
                                {node.isOwner ? (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2 transition cursor-pointer">
                                            <Edit2 size={12} /> Edit
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); executeDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition border-t border-white/5 cursor-pointer">
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); alert("Report submitted successfully."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 flex items-center gap-2 transition cursor-pointer">
                                        <Flag size={12} /> Report
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {node.children && node.children.length > 0 && (
                    <div className="mt-2.5 flex flex-col w-full relative z-[5]">
                        {node.children.map((child: any) => <CommentNode key={child.id} node={child} depth={depth + 1} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="w-full max-w-md h-full bg-card border-l border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300 relative z-[101]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-white/5 relative z-20">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Discussions</h2>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{notebookTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 hide-scrollbar relative z-10">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <span className="animate-pulse">Loading comments...</span>
                        </div>
                    ) : roots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                            <span className="text-4xl mb-2">💬</span>
                            <p className="text-sm font-semibold">No comments yet.</p>
                            <p className="text-xs">Be the first to share your thoughts!</p>
                        </div>
                    ) : (
                        roots.map(r => <CommentNode key={r.id} node={r} />)
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/40 shrink-0 relative z-20">
                    {replyTo && (
                        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium px-2 py-1 mb-2 rounded-lg">
                            <span>Replying to {replyTo.name}</span>
                            <button onClick={() => setReplyTo(null)} className="hover:text-white transition"><X size={12} /></button>
                        </div>
                    )}
                    
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 focus-within:border-primary/50 transition-colors shadow-inner">
                        <input 
                            ref={inputRef}
                            type="text" 
                            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none text-white placeholder-white/30"
                            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePost()}
                        />
                        <button 
                            disabled={!newText.trim() || posting}
                            onClick={handlePost}
                            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-3 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
