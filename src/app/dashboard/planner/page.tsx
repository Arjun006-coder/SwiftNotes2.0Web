"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, BookOpen, AlertCircle, Zap, Loader2, Target, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanDay {
    date: string;
    learning: string[];
    review: string[];
}

interface PlanResponse {
    plan: PlanDay[];
    summary: string;
}

export default function PlannerPage() {
    const [examDate, setExamDate] = useState("");
    const [topics, setTopics] = useState("");
    const [weakAreas, setWeakAreas] = useState("");
    const [studySpeed, setStudySpeed] = useState("Medium");

    const [loading, setLoading] = useState(false);
    const [planData, setPlanData] = useState<PlanResponse | null>(null);

    const handleGenerate = async () => {
        if (!examDate || !topics) return alert("Please fill out Exam Date and Topics.");
        setLoading(true);
        try {
            const res = await fetch("/api/generate-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examDate, topics, weakAreas, studySpeed })
            });
            const data = await res.json();
            if (res.ok) setPlanData(data);
            else alert("Error: " + data.error);
        } catch (e) {
            console.error(e);
            alert("Failed to generate plan.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen mesh-bg py-24 px-6 sm:px-12 pb-32">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <Target size={32} className="text-white" />
                    </div>
                    <h1 className="font-display font-bold text-4xl text-white mb-4 drop-shadow-md">Personalized Revision Planner</h1>
                    <p className="text-white/70 max-w-2xl mx-auto">Generate a highly optimized, spaced-repetition daily study schedule tailored to your exam date, weak areas, and pacing.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Input Form */}
                    <div className="lg:col-span-1 glass-card p-6 border border-white/10 flex flex-col gap-6">
                        <h2 className="font-display font-semibold text-lg text-white mb-2">Pacing Parameters</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1.5"><Calendar size={14} /> Exam Date</label>
                                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50" value={examDate} onChange={e => setExamDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1.5"><BookOpen size={14} /> Topics & Weightage</label>
                                <textarea rows={3} placeholder="e.g. Calculus (High), Algebra (Med)..." className="w-full bg-white/5 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 resize-none" value={topics} onChange={e => setTopics(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1.5"><AlertCircle size={14} /> Weak Areas</label>
                                <input type="text" placeholder="e.g. Integrals, Vectors..." className="w-full bg-white/5 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50" value={weakAreas} onChange={e => setWeakAreas(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1.5"><Zap size={14} /> Study Speed</label>
                                <select className="w-full bg-white/5 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50 outline-none" value={studySpeed} onChange={e => setStudySpeed(e.target.value)}>
                                    <option className="text-black" value="Slow">Slow (Detailed)</option>
                                    <option className="text-black" value="Medium">Medium (Balanced)</option>
                                    <option className="text-black" value="Fast">Fast (Cramming)</option>
                                </select>
                            </div>

                            <button onClick={handleGenerate} disabled={loading} className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-full shadow-[var(--glow-primary)] transition-all flex justify-center items-center gap-2">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Crafting Plan...</> : "Generate AI Plan"}
                            </button>
                        </div>
                    </div>

                    {/* Output View */}
                    <div className="lg:col-span-2">
                        <AnimatePresence mode="wait">
                            {!planData && !loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card h-full min-h-[400px] border border-white/10 flex flex-col items-center justify-center text-white/40 p-12 text-center">
                                    <Target size={48} className="mb-4 opacity-50" />
                                    <p>Fill out your parameters to the left and click Generate to build your personalized AI spaced-repetition timeline.</p>
                                </motion.div>
                            )}

                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card h-full min-h-[400px] border border-white/10 flex flex-col items-center justify-center text-accent p-12 text-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin mb-4" />
                                    <p className="font-medium animate-pulse">Running advanced heuristics...</p>
                                </motion.div>
                            )}

                            {planData && !loading && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                                    <div className="glass-card p-6 border border-accent/30 bg-accent/5">
                                        <h3 className="font-display font-semibold text-lg text-white mb-2 flex items-center gap-2">
                                            <Sparkles size={18} className="text-accent" /> Strategy Overview
                                        </h3>
                                        <p className="text-white/80 text-sm leading-relaxed">{planData.summary}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {planData.plan.map((day, idx) => (
                                            <div key={idx} className="glass-card p-5 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row gap-6 relative overflow-hidden group">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div className="sm:w-32 shrink-0">
                                                    <div className="text-xs text-white/50 mb-1">Day {idx + 1}</div>
                                                    <div className="font-display font-semibold text-white whitespace-nowrap">{day.date}</div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-xs text-accent mb-2 uppercase tracking-wider font-semibold">New Concepts</div>
                                                        <ul className="space-y-1.5">
                                                            {day.learning.length > 0 ? day.learning.map((t, i) => (
                                                                <li key={i} className="text-sm text-white/90 flex items-start gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                                                                    {t}
                                                                </li>
                                                            )) : <span className="text-white/30 text-sm italic">Rest day</span>}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-primary mb-2 uppercase tracking-wider font-semibold">Review / Spaced Reps</div>
                                                        <ul className="space-y-1.5">
                                                            {day.review.length > 0 ? day.review.map((t, i) => (
                                                                <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                                                                    <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                                                                    {t}
                                                                </li>
                                                            )) : <span className="text-white/30 text-sm italic">None scheduled</span>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
