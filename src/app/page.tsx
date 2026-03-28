"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Layers, Cpu, Globe } from "lucide-react";
import Link from "next/link";
import SoftAurora from "@/components/ui/SoftAurora";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import SiteHeader from "@/components/layout/SiteHeader";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import PricingSection from "@/components/landing/PricingSection";
import TeamSection from "@/components/landing/TeamSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <SoftAurora speed={0.6} scale={1.2} />
      </div>

      <SiteHeader />

      <div className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
           <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-10 text-xs font-bold tracking-widest uppercase border border-primary/20 text-primary"
              >
                <Sparkles size={14} /> The Evolution of Student Workflow
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-6xl md:text-8xl font-display font-bold leading-[1.05] tracking-tight mb-8"
              >
                Your Digital Canvas, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient">Powered by AI.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12"
              >
                Experience glassmorphism notebooks with realistic physical page flips.
                Doodle, snap polaroids, and get instant answers from your smart AI sidebar.
              </motion.p>

              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.3 }}
                 className="flex flex-col sm:flex-row gap-4 items-center"
              >
                <Link href="/dashboard">
                  <HoverBorderGradient
                    containerClassName="rounded-full shadow-2xl shadow-primary/20"
                    as="div"
                    className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-10 py-5 font-bold text-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>Enter Dashboard</span>
                    <ArrowRight size={22} className="ml-1" />
                  </HoverBorderGradient>
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center justify-center gap-2 px-10 py-5 rounded-full font-bold text-lg border border-white/10 glass-card hover:bg-white/5 hover:border-white/20 transition-all"
                >
                  Explore Documentation
                </Link>
              </motion.div>
           </div>
        </section>

        {/* --- FEATURE SHOWCASE SECTION --- */}
        <section className="px-6 py-24 max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                <div className="space-y-4 max-w-xl">
                   <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">Everything you need to learn masterfully.</h2>
                   <p className="text-lg text-white/50">We've combined physical aesthetics with cloud-first intelligence.</p>
                </div>
                <div className="hidden lg:flex gap-12 text-sm font-bold text-white/30 uppercase tracking-widest">
                   <div className="flex items-center gap-2"><Zap size={16} /> Fast Latency</div>
                   <div className="flex items-center gap-2"><ShieldCheck size={16} /> Privacy First</div>
                </div>
             </div>
             
             <FeatureShowcase />
        </section>

        {/* --- STATS SECTION --- */}
        <section className="px-6 py-32 bg-white/[0.02] border-y border-white/5">
             <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                 <div className="space-y-2">
                    <p className="text-4xl md:text-5xl font-display font-black text-primary">150K+</p>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Notebooks Created</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-4xl md:text-5xl font-display font-black text-accent">98%</p>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Student Retention</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-4xl md:text-5xl font-display font-black text-white">10M+</p>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Doodles Drawn</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-4xl md:text-5xl font-display font-black text-success">500+</p>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Universities</p>
                 </div>
             </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section className="max-w-7xl mx-auto px-6">
            <PricingSection />
        </section>

        {/* --- TEAM SECTION --- */}
        <section className="max-w-7xl mx-auto px-6">
            <TeamSection />
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-24 px-6 md:py-48 max-w-5xl mx-auto text-center">
            <motion.div
               whileInView={{ scale: [0.95, 1], opacity: [0, 1] }}
               transition={{ duration: 0.8 }}
               className="glass-card p-12 md:p-24 rounded-[3rem] border border-white/10 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 blur-[100px] translate-y-1/2 -translate-x-1/2 rounded-full" />

                <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-tighter">Ready to redefine <br /> how you study?</h2>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <Link href="/dashboard">
                        <button className="px-10 py-5 rounded-full bg-white text-black font-bold text-xl hover:bg-white/90 hover:scale-105 active:scale-95 transition-all">
                            Start for Free
                        </button>
                    </Link>
                    <Link href="/docs" className="text-white/60 hover:text-white font-bold transition-all">
                        Talk to a Specialist →
                    </Link>
                </div>
            </motion.div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="px-6 py-20 border-t border-white/5 bg-slate-900/50">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                 <div className="flex gap-12 text-sm font-bold text-white/40 uppercase tracking-tighter mb-12">
                     <Link href="/" className="hover:text-primary transition-colors">Twitter</Link>
                     <Link href="/" className="hover:text-primary transition-colors">GitHub</Link>
                     <Link href="/" className="hover:text-primary transition-colors">Discord</Link>
                     <Link href="/" className="hover:text-primary transition-colors">LinkedIn</Link>
                 </div>
                 <div className="text-center text-xs text-white/30 space-y-2">
                    <p className="font-display font-black text-xl text-white/60 mb-4 opacity-50">SwiftNotes</p>
                    <p>&copy; {new Date().getFullYear()} CommerceBrain Team. All rights reserved.</p>
                    <p className="max-w-md mx-auto">SwiftNotes is not just an app; it's a movement towards tactile, intelligent productivity for the next generation of knowledge workers.</p>
                 </div>
            </div>
        </footer>
      </div>
    </div>
  );
}
