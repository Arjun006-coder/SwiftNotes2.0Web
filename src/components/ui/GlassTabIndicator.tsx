"use client";
import { motion } from "framer-motion";

export const GlassTabIndicator = () => {
    return (
        <motion.div
            layoutId="activeTabIndicator"
            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            className="absolute inset-0 bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl z-0"
        />
    );
};
