"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Globe, UserCircle, Calendar } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { syncUser } from "@/app/actions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GlassTabIndicator } from "@/components/ui/GlassTabIndicator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        syncUser();
    }, []);

    const links = [
        { href: "/dashboard", label: "My Shelf", icon: Library },
        { href: "/dashboard/planner", label: "Planner", icon: Calendar },
        { href: "/dashboard/community", label: "Community", icon: Globe },
        { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
            {/* Sidebar Desktop / Bottom Bar Mobile */}
            <nav className="glass-card md:w-64 fixed bottom-0 w-full md:relative md:flex-col md:h-screen z-50 rounded-none md:border-r border-t md:border-t-0 p-4 shrink-0 flex items-center md:items-start justify-between md:justify-start">
                <div className="hidden md:flex items-center justify-between w-full px-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent shadow-[var(--glow-primary)]" />
                        <span className="font-display font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                            SwiftNotes
                        </span>
                    </div>
                </div>

                {/* Mobile Header (Top) */}
                <div className="md:hidden flex items-center justify-between w-full absolute top-0 left-0 right-0 p-4 border-b border-border/10 glass-card z-50 rounded-none h-16">
                    <span className="font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        SwiftNotes
                    </span>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>

                <div className="flex md:flex-col w-full gap-2 justify-around md:justify-start">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "relative flex flex-col md:flex-row items-center gap-2 p-3 md:px-4 md:py-3 rounded-2xl transition-all w-full group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-white/80"
                                )}
                            >
                                {isActive && <GlassTabIndicator />}
                                <Icon size={24} className={cn("relative z-10 transition-colors", isActive ? "text-primary" : "group-hover:text-white")} />
                                <span className="relative z-10 text-xs md:text-sm font-bold tracking-tight">{link.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile / Logout */}
                <div className="hidden md:flex mt-auto mb-4 w-full p-4 border-t border-border/10 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground truncate max-w-[80px]">Account</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 w-full relative pb-20 md:pb-0 overflow-y-auto mesh-bg h-screen">
                {children}
            </main>
        </div>
    );
}
