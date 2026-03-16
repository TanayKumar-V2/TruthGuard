"use client";

import { motion } from "framer-motion";
import { Shield, Target, Zap, Users, Globe, ArrowRight, CheckCircle2, TrendingUp, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Dynamic Background FX */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-slate-950 opacity-20" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 sm:pt-48 sm:pb-32">
        <div className="container mx-auto max-w-[1200px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            Next-Gen Truth Intelligence
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9]"
          >
            THE FRONTIER OF <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">DIGITAL CERTAINTY</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl mb-12 leading-relaxed"
          >
            Secure the digital landscape with TruthGuard. Our AI-driven matrix detects misinformation in real-time, empowering agents to verify reality at scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              href="/dashboard"
              className="group relative h-14 w-full sm:w-auto px-8 rounded-2xl bg-white text-slate-950 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Initialize Console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/community"
              className="h-14 w-full sm:w-auto px-8 rounded-2xl border border-white/10 bg-white/5 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-white/10 hover:border-white/20"
            >
              Join The Grid
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="relative py-32 px-6">
        <div className="container mx-auto max-w-[1200px]">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Threat Matrix",
                desc: "Real-time monitoring of coordinated misinformation campaigns worldwide.",
                icon: <Zap className="h-6 w-6 text-indigo-400" />,
                href: "/threats",
                bgClass: "bg-indigo-500/10",
                borderClass: "border-indigo-500/20"
              },
              {
                title: "Fact-Check Archive",
              desc: "Deep-web verified intelligence reports on viral claims and deepfakes.",
                icon: <Search className="h-6 w-6 text-cyan-400" />,
                href: "/fact-check",
                bgClass: "bg-cyan-500/10",
                borderClass: "border-cyan-500/20"
              },
              {
                title: "Agent Nexus",
                desc: "Gamified community hub where thousands of verified agents collaborate.",
                icon: <Users className="h-6 w-6 text-emerald-400" />,
                href: "/community",
                bgClass: "bg-emerald-500/10",
                borderClass: "border-emerald-500/20"
              }
            ].map((pillar, idx) => (
              <Link 
                key={idx} 
                href={pillar.href}
                className="group relative p-8 rounded-[40px] border border-white/10 bg-slate-900/50 backdrop-blur-xl hover:border-white/20 transition-all active:scale-[0.98]"
              >
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center border mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3",
                  pillar.bgClass,
                  pillar.borderClass
                )}>
                  {pillar.icon}
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{pillar.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">{pillar.desc}</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Access Portal <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Divider */}
      <section className="relative py-24 border-y border-white/5 bg-slate-900/40 backdrop-blur-sm">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="grid gap-12 sm:grid-cols-4">
            {[
              { val: "2.8M+", label: "Claims Analyzed" },
              { val: "142K", label: "Verified Agents" },
              { val: "99.9%", label: "Accuracy Rate" },
              { val: "24/7", label: "System Uptime" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-black text-white mb-2">{stat.val}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-cyan-500/20 blur-[150px] rounded-full" />
        <div className="container mx-auto max-w-[1200px] relative z-10 text-center">
          <div className="p-12 md:p-24 rounded-[60px] border border-white/10 bg-slate-900/50 backdrop-blur-2xl">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-none">
              READY TO UPLINK <br /> TO THE TRUTH?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-12 text-lg">
              Join the ranks of the digital frontier's most elite verification specialists and start securing the truth today.
            </p>
            <Link 
              href="/login"
              className="h-16 inline-flex px-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-widest items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Initialize Secure Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/5">
        <div className="container mx-auto max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
              <Shield className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-sm font-black text-white tracking-widest">TRUTHGUARD.AI</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <button className="hover:text-white transition-colors">Neural Policy</button>
            <button className="hover:text-white transition-colors">Grid Protocols</button>
            <button className="hover:text-white transition-colors">Uplink Support</button>
          </div>
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
            &copy; 2026 CYBER DEFENSE INITIATIVE. ALL RIGHTS SECURED.
          </p>
        </div>
      </footer>
    </div>
  );
}
