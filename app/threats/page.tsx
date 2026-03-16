"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, Zap, Globe, Shield, Filter, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THREATS = [
  {
    id: "TH-092",
    title: "Deepfake Impersonation: Finance Minister",
    category: "Financial",
    severity: "CRITICAL",
    impact: "High-level authentication bypass attempts detected in banking sectors.",
    status: "Active",
    time: "2m ago",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  {
    id: "TH-088",
    title: "Coordinated Botnet: Election Disinformation",
    category: "Political",
    severity: "HIGH",
    impact: "Rapid spread of falsified polling data across social media nodes.",
    status: "Under Analysis",
    time: "14m ago",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    id: "TH-085",
    title: "AI-Generated Medical Misinformation",
    category: "Health",
    severity: "MEDIUM",
    impact: "Pseudoscientific health advice circulating in private messaging groups.",
    status: "Mitigated",
    time: "45m ago",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  {
    id: "TH-081",
    title: "Synthetic Identity Fraud Campaign",
    category: "Cybersecurity",
    severity: "HIGH",
    impact: "Widespread use of AI identities to infiltrate corporate networks.",
    status: "Active",
    time: "1h ago",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
];

export default function ThreatsPage() {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreats = useMemo(() => {
    return THREATS.filter((threat) => {
      const matchesFilter = filter === "All" || threat.category === filter || threat.severity === filter.toUpperCase();
      const matchesSearch = threat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           threat.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery]);

  return (
    <main className="relative min-h-screen py-24 px-4 overflow-hidden">
      {/* Background radial effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.08),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.05),_transparent_40%)]" />

      <div className="container mx-auto max-w-[1400px] relative z-10">
        <header className="mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            Live Threat Monitoring
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Threat <span className="text-red-400">Intelligence</span> Matrix
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Real-time detection and forensic analysis of coordinated misinformation campaigns, deepfake surges, and algorithmic manipulation.
          </p>
        </header>

        {/* Info Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {[
            { label: "Active Nodes", value: "1,284", icon: <Globe className="h-5 w-5 text-cyan-400" /> },
            { label: "Critical Alerts", value: "02", icon: <AlertTriangle className="h-5 w-5 text-red-400" /> },
            { label: "Defense Uplink", value: "Optimized", icon: <Zap className="h-5 w-5 text-emerald-400" /> },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</span>
                {item.icon}
              </div>
              <div className="text-3xl font-black text-white">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Tools Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 w-full md:w-auto">
            {["All", "Critical", "Political", "Finance"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  filter === cat ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat IDs..."
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-red-400/30"
            />
          </div>
        </div>

        {/* Threats List */}
        <div className="space-y-4">
          {filteredThreats.length > 0 ? (
            filteredThreats.map((threat) => (
              <motion.div
                key={threat.id}
                layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "group relative overflow-hidden rounded-[32px] border p-6 transition-all hover:translate-x-1",
                threat.border,
                threat.bg
              )}
            >
              <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className={cn("text-xs font-black uppercase tracking-widest", threat.color)}>{threat.severity}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{threat.id} // {threat.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">{threat.title}</h3>
                  <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">{threat.impact}</p>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</div>
                    <div className="text-sm font-black text-white">{threat.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Detection</div>
                    <div className="text-sm font-black text-white">{threat.time}</div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <ShieldAlert className="h-24 w-24" />
              </div>
            </motion.div>
          ))
          ) : (
            <div className="text-center py-20 bg-white/5 border border-white/10 border-dashed rounded-[32px]">
              <ShieldAlert className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">No threats detected matching these parameters.</h3>
              <p className="text-slate-600 text-sm mt-2">Adjust your filters or standby for incoming intel.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
