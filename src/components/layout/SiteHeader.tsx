"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Rocket, Cpu, Newspaper, DollarSign, Book } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    name: "Products",
    dropdown: [
      { name: "Digital Canvas", desc: "Our core physics-based physics engine.", icon: <Rocket size={16} />, href: "/#features" },
      { name: "AI Sidebar", desc: "Context-aware Gemini 2.5 assistance.", icon: <Cpu size={16} />, href: "/#ai" },
    ]
  },
  {
    name: "Solutions",
    dropdown: [
      { name: "For Students", desc: "Exam prep & flashcard generation.", icon: <Book size={16} />, href: "/docs" },
      { name: "For Teams", desc: "Real-time collaborative brainstorming.", icon: <Book size={16} />, href: "/docs" },
    ]
  },
  { name: "Docs", href: "/docs", icon: <Book size={16} /> },
  { name: "Blog", href: "/blog", icon: <Newspaper size={16} /> },
  { name: "Pricing", href: "/pricing", icon: <DollarSign size={16} /> },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        scrolled ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            S
          </div>
          <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            SwiftNotes
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <div 
              key={link.name} 
              className="relative"
              onMouseEnter={() => link.dropdown && setActiveDropdown(link.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                href={link.href || "#"} 
                className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1 py-2"
              >
                {link.name}
                {link.dropdown && (
                  <ChevronDown size={14} className={cn("transition-transform duration-200", activeDropdown === link.name && "rotate-180")} />
                )}
              </Link>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {link.dropdown && activeDropdown === link.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-64 p-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl"
                  >
                    {link.dropdown.map(item => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/item"
                      >
                        <div className="mt-1 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-[10px] text-white/40 leading-tight">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <div className="hidden sm:flex items-center gap-4">
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                  Log In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-all">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="hidden sm:block text-sm font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all">
              Launch App
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-white/70"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-900 border-t border-white/10 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {NAV_LINKS.map(link => (
                <div key={link.name} className="space-y-2">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{link.name}</p>
                  {link.dropdown ? (
                    <div className="grid grid-cols-1 gap-2 pl-2">
                      {link.dropdown.map(item => (
                        <Link key={item.name} href={item.href} className="text-sm text-white/70 hover:text-white flex items-center gap-2">
                          {item.icon} {item.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link href={link.href || "#"} className="text-sm text-white hover:text-primary block pl-2 font-medium">
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-white/10">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="w-full py-3 rounded-xl bg-primary text-white font-bold">Sign Up Free</button>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
