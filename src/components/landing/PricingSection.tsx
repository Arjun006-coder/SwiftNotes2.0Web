"use client";
import { motion } from "framer-motion";
import { Check, Zap, Rocket, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    desc: "Perfect for students getting started.",
    features: ["10 Cloud Notebooks", "30 Video Analytics /mo", "Physics Engine access", "Community View", "❌ No Paid Publishing"],
    btn: "Get Started",
    popular: false,
    icon: <Rocket size={20} />
  },
  {
    name: "Pro",
    price: "₹200",
    desc: "For serious scholars & creators.",
    features: ["Unlimited Notebooks", "50 Video Analytics /mo", "Paid Notebook Publishing", "Gemini 1.5 Flash Reasoning", "Private Sharing"],
    btn: "Upgrade to Pro",
    popular: true,
    icon: <Zap size={20} />
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For schools and institutions.",
    features: ["Shared Workspaces", "Real-time Collaboration", "Admin Dashboard", "SSO & Security", "Unlimited Generations"],
    btn: "Contact Sales",
    popular: false,
    icon: <Star size={20} />
  }
];

export default function PricingSection() {
  return (
    <section className="py-32" id="pricing">
      <div className="text-center space-y-4 mb-20">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
          Simple, Transparent Pricing
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your study needs. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan, i) => (
            <motion.div
                key={plan.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                    "glass-card p-8 flex flex-col gap-6 rounded-[2.5rem] border relative group",
                    plan.popular ? "border-primary/50 shadow-[var(--glow-primary)]" : "border-white/10"
                )}
            >
                {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg">
                        Most Popular
                    </div>
                )}

                <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                        {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>

                <div className="flex-1 space-y-4">
                    {plan.features.map(feat => (
                        <div key={feat} className="flex items-center gap-3 text-sm text-white/80">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Check size={12} />
                            </div>
                            {feat}
                        </div>
                    ))}
                </div>

                <button className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all",
                    plan.popular 
                        ? "bg-primary text-white hover:scale-105 shadow-lg shadow-primary/20" 
                        : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                )}>
                    {plan.btn}
                </button>
            </motion.div>
        ))}
      </div>
    </section>
  );
}
