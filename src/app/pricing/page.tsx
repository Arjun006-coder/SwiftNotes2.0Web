"use client";
import SiteHeader from "@/components/layout/SiteHeader";
import SoftAurora from "@/components/ui/SoftAurora";
import PricingSection from "@/components/landing/PricingSection";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            <div className="fixed inset-0 z-0 opacity-20">
                <SoftAurora speed={0.5} scale={1.2} />
            </div>
            <SiteHeader />
            <main className="relative z-10 max-w-7xl mx-auto pt-32 px-8 pb-32">
                <PricingSection />
                
                {/* FAQ Style Detail */}
                <div className="mt-24 max-w-3xl mx-auto border-t border-white/5 pt-16">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Enterprise & Institution Packages</h3>
                    <p className="text-muted-foreground text-center mb-8">
                        Need a custom deployment for your school or organization? Our Team plan scales easily.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <h4 className="text-white font-bold mb-2 tracking-tight">Bulk Discounts</h4>
                            <p className="text-sm text-muted-foreground">Volume-based pricing for student organizations and departments.</p>
                        </div>
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <h4 className="text-white font-bold mb-2 tracking-tight">Direct Integration</h4>
                            <p className="text-sm text-muted-foreground">Self-hosted options or VPC deployments for deep privacy compliance.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
