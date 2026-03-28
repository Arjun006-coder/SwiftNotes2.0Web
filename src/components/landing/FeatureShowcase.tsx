"use client";
import { motion } from "framer-motion";
import { Brain, BookOpen, Video, Users, Zap, Search } from "lucide-react";
import Image from "next/image";

const FEATURES = [
    {
        id: "ai",
        title: "AI Reasoning & Search",
        desc: "Ask anything, from any page. Our integrated Gemini 2.5 Flash API understands your doodles, text, and even video transcriptions to give you deep insights in real-time.",
        icon: <Brain className="text-primary" size={24} />,
        image: "/ai_notebook_showcase.png",
        reverse: false
    },
    {
        id: "physics",
        title: "Physics-Based Flipbook",
        desc: "Ditch the flat scroll. Experience hyper-realistic page turns with curly edges, legal pad textures, and satisfying physics that make digital note-taking feel natural.",
        icon: <BookOpen className="text-accent" size={24} />,
        image: "/flipbook_showcase.png",
        reverse: true
    },
    {
        id: "media",
        title: "Video-to-Note Snapshots",
        desc: "Learning from YouTube? Paste a URL and grab instant, high-quality high-resolution frames with a single click. No more pausing and manual screenshots.",
        icon: <Video className="text-success" size={24} />,
        image: "/flipbook_showcase.png", // Reuse or placeholder
        reverse: false
    }
];

export default function FeatureShowcase() {
    return (
        <section className="py-24 space-y-32">
            {FEATURES.map((feature, i) => (
                <motion.div 
                    key={feature.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`flex flex-col ${feature.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}
                >
                    {/* Content */}
                    <div className="flex-1 space-y-6 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                            {feature.icon}
                        </div>
                        <h3 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                            {feature.title}
                        </h3>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                            {feature.desc}
                        </p>
                        <div className="pt-4 flex flex-wrap gap-4">
                            <span className="flex items-center gap-2 text-sm font-semibold text-white/50 bg-white/5 py-1 px-3 rounded-full border border-white/5">
                                <Zap size={14} className="text-primary" /> Powered by AI
                            </span>
                            <span className="flex items-center gap-2 text-sm font-semibold text-white/50 bg-white/5 py-1 px-3 rounded-full border border-white/5">
                                <Search size={14} className="text-accent" /> Semantic Search
                            </span>
                        </div>
                    </div>

                    {/* Image Mockup */}
                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
                        <div className="relative glass-card rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                             <img 
                                src={feature.image} 
                                alt={feature.title} 
                                className="w-full aspect-video object-cover group-hover:scale-105 transition duration-700"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60" />
                             
                             {/* Abstract Decorative Elements */}
                             <div className="absolute top-4 left-4 flex gap-1.5 pt-2 pl-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                             </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </section>
    );
}
