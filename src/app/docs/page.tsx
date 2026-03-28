"use client";
import SiteHeader from "@/components/layout/SiteHeader";
import SoftAurora from "@/components/ui/SoftAurora";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            <div className="fixed inset-0 z-0 opacity-20">
                <SoftAurora speed={0.5} scale={1.2} />
            </div>
            <SiteHeader />
            <main className="relative z-10 max-w-7xl mx-auto pt-32 px-8 pb-32">
                <div className="flex gap-12">
                    {/* Sidebar Stub */}
                    <aside className="hidden lg:block w-64 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Getting Started</h3>
                            <nav className="space-y-2">
                                <p className="text-primary font-semibold text-sm">Introduction</p>
                                <p className="text-white/60 text-sm hover:text-white cursor-pointer">Quick Start Guide</p>
                                <p className="text-white/60 text-sm hover:text-white cursor-pointer">Installation</p>
                            </nav>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Main Features</h3>
                            <nav className="space-y-2">
                                <p className="text-white/60 text-sm hover:text-white cursor-pointer">AI Reasoning</p>
                                <p className="text-white/60 text-sm hover:text-white cursor-pointer">Flipbook Engine</p>
                                <p className="text-white/60 text-sm hover:text-white cursor-pointer">Collaboration</p>
                            </nav>
                        </div>
                    </aside>

                    {/* Content Stub */}
                    <article className="flex-1 prose prose-invert prose-emerald lg:prose-xl">
                        <h1 className="text-5xl font-display font-bold text-white mb-6 tracking-tight">Documentation</h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Welcome to the SwiftNotes documentation. Learn how to master the next generation of digital note-taking.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                            <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors">
                                <h3 className="text-lg font-bold text-white">Introduction →</h3>
                                <p className="text-sm text-muted-foreground mt-2">Core concepts and philosophy of the physical-digital bridge.</p>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors">
                                <h3 className="text-lg font-bold text-white">AI Setup →</h3>
                                <p className="text-sm text-muted-foreground mt-2">Connect your Gemini API key and start querying your notes.</p>
                            </div>
                        </div>
                    </article>
                </div>
            </main>
        </div>
    );
}
