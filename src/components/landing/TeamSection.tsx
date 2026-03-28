"use client";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, ExternalLink } from "lucide-react";
import Image from "next/image";

const TEAM = [
  {
    name: "Arjun Agrawal",
    role: "Founder & Lead Architect",
    desc: "Passionate about AI-driven productivity and educational technology.",
    links: { github: "#", twitter: "#", linkedin: "#" }
  },
  {
    name: "Sanchit Gupta",
    role: "UX Design Lead",
    desc: "Specialist in glassmorphism and motion-first interfaces.",
    links: { github: "#", twitter: "#", linkedin: "#" }
  },
  {
    name: "Piyush Chaudhary",
    role: "Full-Stack Engineer",
    desc: "Optimizing the physics engine and real-time collaboration.",
    links: { github: "#", twitter: "#", linkedin: "#" }
  },
  {
    name: "Sahil",
    role: "Core Developer",
    desc: "Dedicated to building seamless, high-performance web experiences.",
    links: { github: "#", twitter: "#", linkedin: "#" }
  }
];

export default function TeamSection() {
  return (
    <section className="py-32" id="about">
      <div className="flex flex-col md:flex-row gap-16 items-start">
        <div className="md:w-1/3 space-y-6 sticky top-32">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
            Meet the Team
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            SwiftNotes is built by a small, dedicated team of developers and designers at 
            <span className="text-primary font-semibold"> CommerceBrain</span>. 
            Our mission is to bridge the gap between physical and digital learning.
          </p>
          <div className="pt-8">
            <button className="flex items-center gap-2 text-sm font-bold text-white hover:text-primary transition-colors">
              Join our mission <ExternalLink size={14} />
            </button>
          </div>
        </div>

        <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 rounded-3xl border border-white/10 group hover:border-primary/30 transition-all hover:translate-y-[-4px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                {member.name[0]}
              </div>
              <h3 className="text-xl font-bold text-white">{member.name}</h3>
              <p className="text-primary text-xs font-semibold mb-3">{member.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
                "{member.desc}"
              </p>
              
              <div className="flex gap-4">
                <a href={member.links.github} className="text-white/40 hover:text-white transition-colors"><Github size={18} /></a>
                <a href={member.links.twitter} className="text-white/40 hover:text-white transition-colors"><Twitter size={18} /></a>
                <a href={member.links.linkedin} className="text-white/40 hover:text-white transition-colors"><Linkedin size={18} /></a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
