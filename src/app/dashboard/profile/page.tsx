"use client";

import { motion } from "framer-motion";
import { User, Settings, Shield, Zap, BookOpen, Clock, Star, Bell, FileText } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { getUserProfileStats } from "@/app/actions";
import { useEffect, useState } from "react";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const { openUserProfile } = useClerk();
    const [dbStats, setDbStats] = useState<any>(null);

    useEffect(() => {
        if (isLoaded && user) {
            getUserProfileStats().then(data => {
                if (data) setDbStats(data);
            });
        }
    }, [isLoaded, user]);

    if (!isLoaded) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading profile...</p>
            </div>
        </div>
    );

    if (!user) return (
        <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Please sign in to view your profile.</p>
        </div>
    );

    const stats = [
        { label: "Current Streak", value: dbStats?.streak ? `${dbStats.streak} Days` : "0 Days", icon: Zap, color: "text-orange-500 bg-orange-500/10" },
        { label: "Total Notebooks", value: dbStats ? dbStats.totalNotebooks : "0", icon: BookOpen, color: "text-blue-400 bg-blue-400/10" },
        { label: "Pages Written", value: dbStats ? dbStats.pagesWritten : "0", icon: FileText, color: "text-yellow-400 bg-yellow-400/10" },
        { label: "Study Time", value: dbStats ? dbStats.studyTime : "0h", icon: Clock, color: "text-green-400 bg-green-400/10" },
        { label: "Reputation", value: dbStats ? dbStats.reputation : "0", icon: Star, color: "text-purple-400 bg-purple-400/10" },
    ];

    return (
        <div className="p-6 md:p-8 md:pt-12 max-w-5xl mx-auto space-y-10 pb-20">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 glass-card p-10 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />

                <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-primary/20 p-1 group-hover:border-primary/50 transition-all">
                        <img
                            src={user?.imageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <button onClick={() => openUserProfile()} className="absolute bottom-1 right-1 p-2 bg-primary rounded-full text-white shadow-lg shadow-primary/20 hover:scale-110 transition-all">
                        <Settings size={14} />
                    </button>
                </div>

                <div className="text-center md:text-left space-y-2 relative">
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                        {user?.fullName || user?.username || "Guest User"}
                    </h1>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Scholar
                    </p>
                    <div className="flex gap-2 pt-2">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70">
                            Pro Member
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/70 flex items-center gap-1">
                            <Shield size={12} className="text-primary" /> Verified
                        </span>
                    </div>
                </div>

                <div className="md:ml-auto flex gap-3 relative">
                    <button onClick={() => openUserProfile()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium">
                        <Settings size={18} /> Manage
                    </button>
                    <button className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                        <Bell size={20} className="text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-inner border border-white/5", stat.color)}>
                                <Icon size={24} />
                            </div>
                            <span className="text-3xl font-bold font-display text-white">{stat.value}</span>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">{stat.label}</span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8 rounded-2xl space-y-6">
                        <h3 className="text-xl font-bold font-display flex items-center gap-2">
                            <User size={20} className="text-primary" /> Account Details
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-sm text-muted-foreground">Email Address</span>
                                <span className="text-sm font-medium text-white">{user?.emailAddresses[0].emailAddress}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-sm text-muted-foreground">Member Since</span>
                                <span className="text-sm font-medium text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-sm text-muted-foreground">Language</span>
                                <span className="text-sm font-medium text-white">English (US)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-primary/20 group">
                        <div className="p-3 bg-white/10 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Shield size={24} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-bold font-display mb-2">Security</h3>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                            Your account is protected with enterprise-grade encryption and Clerk authentication.
                        </p>
                        <button onClick={() => openUserProfile()} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-all">
                            Security Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
