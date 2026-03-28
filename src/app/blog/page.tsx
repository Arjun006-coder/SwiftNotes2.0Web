"use client";
import SiteHeader from "@/components/layout/SiteHeader";
import SoftAurora from "@/components/ui/SoftAurora";

const POSTS = [
  { id: 1, title: "How AI is Changing Note-Taking", date: "Mar 2026", category: "AI & Future" },
  { id: 2, title: "The Psychology of Tangible Digital Experiences", date: "Feb 2026", category: "UX Design" },
  { id: 3, title: "From Scribbles to Semantic Search", date: "Jan 2026", category: "Engineering" }
];

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            <div className="fixed inset-0 z-0 opacity-20">
                <SoftAurora speed={0.5} scale={1.2} />
            </div>
            <SiteHeader />
            <main className="relative z-10 max-w-7xl mx-auto pt-32 px-8 pb-32">
                <div className="text-center mb-24">
                    <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">The Journal</h1>
                    <p className="text-muted-foreground text-xl">Updates, insights, and stories from the team at SwiftNotes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {POSTS.map(post => (
                        <div key={post.id} className="glass-card p-4 rounded-[2rem] border border-white/10 group cursor-pointer hover:border-primary/50 transition-all">
                             <div className="aspect-[16/10] bg-white/5 rounded-[1.5rem] mb-6 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div className="px-4 pb-4">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{post.category}</span>
                                <h3 className="text-2xl font-bold font-display text-white mt-2 group-hover:text-primary transition-colors">{post.title}</h3>
                                <p className="text-xs text-muted-foreground mt-4">{post.date} • 5 min read</p>
                             </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
