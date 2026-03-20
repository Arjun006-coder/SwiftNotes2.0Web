"use client";

import { motion } from "framer-motion";
import { BookOpen, Sparkles, Brain, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-between pb-10">
      {/* Navbar */}
      <header className="w-full flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          SwiftNotes
        </h1>
        <div className="flex gap-4 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-2 rounded-full font-medium hover:bg-white/5 transition-all">
                Log In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-2 rounded-full font-medium bg-primary text-primary-foreground hover:shadow-[var(--glow-primary)] transition-shadow">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="px-6 py-2 mr-2 rounded-full font-medium bg-white/10 hover:bg-white/20 transition-all">
              Go to App
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto mt-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4 text-sm font-medium border-primary/20 text-primary">
            <Sparkles size={16} /> Welcome to the future of learning
          </div>

          <h2 className="text-5xl md:text-7xl font-bold font-display leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">
            Your Digital Canvas, <br />
            Powered by AI.
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience glassmorphism notebooks with realistic page flips.
            Doodle, snap polaroids, and get instant answers from your smart AI sidebar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg bg-gradient-to-r from-primary to-accent text-white shadow-[var(--glow-primary)] hover:scale-105 transition-all"
            >
              Enter Dashboard <ArrowRight size={20} />
            </Link>
            <Link
              href="#features"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg border border-white/20 glass-card hover:bg-white/5 transition-all"
            >
              Explore Features
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div id="features" className="w-full mt-32 grid md:grid-cols-3 gap-6 text-left">
          <FeatureCard
            icon={<BookOpen className="text-primary" />}
            title="Realistic Notebooks"
            desc="Flip through digital pages with hyper-realistic curly edges and legal pad textures."
          />
          <FeatureCard
            icon={<Brain className="text-accent" />}
            title="AI Companion"
            desc="Ask questions directly from your notebook. The AI contextually understands your doodles."
          />
          <FeatureCard
            icon={<Zap className="text-success" />}
            title="Snap & Pin"
            desc="Drag and drop polaroids instantly onto your pages with virtual tape."
          />
        </div>
      </main>

      {/* Footer Credits */}
      <footer className="mt-32 text-center text-muted-foreground w-full px-4 border-t border-border/50 pt-8 max-w-7xl">
        <div className="glass-card rounded-2xl p-8 mb-8 flex flex-col items-center">
          <h3 className="font-display font-bold text-xl mb-2 text-white">Created by CommerceBrain Team</h3>
          <p className="text-sm">Bringing the best of iOS experiences seamlessly onto the Web.</p>
          <div className="flex gap-4 mt-6">
            <ShieldCheck size={24} className="text-primary" />
            <span className="font-medium text-white/80">Enterprise Grade</span>
          </div>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} SwiftNotes Web. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="glass-card p-6 flex flex-col gap-4 rounded-2xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  );
}
