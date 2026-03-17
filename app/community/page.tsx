"use client";

import { motion } from "framer-motion";
import { Users, Trophy, Star, Target, MessageSquare, TrendingUp, Award, Zap, ShieldAlert, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";
import { useNotifications } from "@/components/providers/notification-provider";

const LEADERBOARD = [
  { rank: 1, name: "NexusPrime", points: 14500, checks: 428, avatar: "/api/placeholder/40/40" },
  { rank: 2, name: "CipherGuard", points: 12200, checks: 385, avatar: "/api/placeholder/40/40" },
  { rank: 3, name: "TruthSeeker_01", points: 11800, checks: 312, avatar: "/api/placeholder/40/40" },
  { rank: 4, name: "LogicGate", points: 9400, checks: 256, avatar: "/api/placeholder/40/40" },
  { rank: 5, name: "VoidWalker", points: 8900, checks: 201, avatar: "/api/placeholder/40/40" },
];

const GLOBAL_LEADERBOARD = [
  ...LEADERBOARD,
  { rank: 6, name: "DataGhost", points: 7500, checks: 185, avatar: "/api/placeholder/40/40" },
  { rank: 7, name: "SignalLost", points: 6800, checks: 162, avatar: "/api/placeholder/40/40" },
  { rank: 8, name: "NeuralLink", points: 5900, checks: 145, avatar: "/api/placeholder/40/40" },
  { rank: 9, name: "GhostProtocol", points: 5200, checks: 128, avatar: "/api/placeholder/40/40" },
  { rank: 10, name: "CyberMage", points: 4500, checks: 110, avatar: "/api/placeholder/40/40" },
];

const MISSIONS = [
  { title: "The Deepfake Surge", description: "Identify the source of the recent viral AI video of the CEO.", reward: "500 XP", players: 142 },
  { title: "Botnet Takedown", description: "Flag 50 coordinated bot accounts spreading the election leak.", reward: "300 XP", players: 89 },
  { title: "Evidence Weaver", description: "Connect 3 primary sources to the space treaty claim.", reward: "200 XP", players: 256 },
];

export default function CommunityPage() {
  const { addNotification } = useNotifications();
  const [showGlobalRank, setShowGlobalRank] = useState(false);

  useEffect(() => {
    const activities = [
      { title: "New Agent Uplink", message: "Agent 'X' has joined the grid.", type: "info" },
      { title: "Threat Detected", message: "Coordinated disinfo campaign detected in Sector 7.", type: "warning" },
      { title: "Mission Complete", message: "Agent 'NexusPrime' verified 12 viral clips.", type: "success" },
      { title: "Verification Consensus", message: "Global consensus reached on 'Zero-Point Energy' claim.", type: "success" },
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        addNotification({
          title: activity.title,
          message: activity.message,
          type: activity.type as any,
        });
      }
    }, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <main className="relative min-h-screen py-24 px-4 overflow-hidden">
      {/* Background FX */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.08),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.05),_transparent_40%)]" />

      <div className="container mx-auto max-w-[1400px] relative z-10">
        <header className="mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            <Users className="h-3.5 w-3.5" />
            Collective Intelligence Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            The <span className="text-purple-400">Community</span> Nexus
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Join forces with thousands of TruthGuard agents to verify the digital frontier, climb the rankings, and earn prestigious verification honors.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          {/* Main Content: Missions and Activity */}
          <div className="space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Target className="h-5 w-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Quests</h2>
                </div>
                <button 
                  onClick={() => toast.info("Mission archive is currently being updated.")}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest transition-colors"
                >
                  View All Missions
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {MISSIONS.map((mission, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -5 }}
                    className="group rounded-[32px] border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors uppercase tracking-tight">{mission.title}</h3>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400">
                        <Zap className="h-3 w-3" />
                        {mission.reward}
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">{mission.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800 overflow-hidden">
                            <Image src={`/api/placeholder/32/32?id=${i + 10}`} alt="" width={32} height={32} />
                          </div>
                        ))}
                        <div className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500">
                          +{mission.players}
                        </div>
                      </div>
                      <button 
                        onClick={() => toast.success(`Deployment successful. Mission: ${mission.title}`)}
                        className="h-10 px-6 rounded-xl bg-white text-slate-950 font-bold text-[10px] uppercase tracking-widest hover:bg-purple-100 transition-colors"
                      >
                        Deploy
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Intelligence Stream</h2>
              </div>
              
              <div className="rounded-[32px] border border-white/10 bg-white/5 overflow-hidden">
                {[
                  { user: "VoidWalker", action: "flagged a deepfake surge in sector 07", time: "2m ago", type: "flag" },
                  { user: "NexusPrime", action: "verified 'AI Space Treaty' claim", time: "15m ago", type: "check" },
                  { user: "LogicGate", action: "earned 'Forensic Master' badge", time: "28m ago", type: "badge" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-6 border-b border-white/5 last:border-none hover:bg-white/[0.02] transition-colors">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      item.type === "flag" ? "bg-red-500/10 text-red-400" :
                      item.type === "check" ? "bg-emerald-500/10 text-emerald-400" :
                      "bg-amber-500/10 text-amber-400"
                    )}>
                      {item.type === "flag" ? <ShieldAlert className="h-5 w-5" /> :
                       item.type === "check" ? <Award className="h-5 w-5" /> :
                       <Star className="h-5 w-5" />}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-slate-300">
                        <span className="font-bold text-white">{item.user}</span> {item.action}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{item.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Leaderboard */}
          <div className="space-y-8">
            <div className="rounded-[40px] border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Trophy className="h-6 w-6 text-amber-400" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Top Agents</h2>
              </div>

              <div className="space-y-6">
                {LEADERBOARD.map((user) => (
                  <div key={user.rank} className="flex items-center gap-4 group">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black border",
                      user.rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      user.rank === 2 ? "bg-slate-400/20 text-slate-300 border-slate-400/30" :
                      user.rank === 3 ? "bg-amber-800/20 text-amber-700 border-amber-800/30" :
                      "bg-white/5 text-slate-500 border-white/10"
                    )}>
                      {user.rank}
                    </div>
                    <div className="h-10 w-10 rounded-full border border-white/10 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                      <Image src={user.avatar} alt={user.name} width={40} height={40} />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-bold text-white leading-none mb-1">{user.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{user.checks} Full Checks</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-white leading-none mb-1">{user.points.toLocaleString()}</div>
                      <div className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-widest">Points</div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowGlobalRank(true)}
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-[0.2em] hover:bg-white/10 transition-all mt-10"
              >
                View Global Rank
              </button>
            </div>

            <div className="rounded-[32px] border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Agent Chat
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your neural uplink to join the encrypted community channel and share real-time intel with on-duty agents.
              </p>
              <button 
                onClick={() => toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
                  loading: 'Establishing neural uplink...',
                  success: 'Neural uplink established. Welcome, Agent.',
                  error: 'Uplink failed. Retrying...',
                })}
                className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:bg-purple-500/30 transition-all"
              >
                Enable Uplink
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Rank Modal */}
      {showGlobalRank && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowGlobalRank(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[40px] border border-white/10 bg-slate-900 p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-400" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Global Agent Rankings</h2>
              </div>
              <button 
                onClick={() => setShowGlobalRank(false)}
                className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[50vh] pr-4 custom-scrollbar space-y-4">
              {GLOBAL_LEADERBOARD.map((user) => (
                <div key={user.rank} className="flex items-center gap-6 p-4 rounded-2xl border border-white/5 bg-white/5 group hover:bg-white/10 transition-all">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black border",
                    user.rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    user.rank === 2 ? "bg-slate-400/20 text-slate-300 border-slate-400/30" :
                    user.rank === 3 ? "bg-amber-800/20 text-amber-700 border-amber-800/30" :
                    "bg-white/5 text-slate-500 border-white/10"
                  )}>
                    {user.rank}
                  </div>
                  <div className="h-12 w-12 rounded-full border border-white/10 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                    <Image src={user.avatar} alt={user.name} width={48} height={48} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-base font-bold text-white mb-1">{user.name}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{user.checks} Verified Intelligence Reports</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-white leading-none mb-1">{user.points.toLocaleString()}</div>
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Global Pts</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Rankings are updated every 60 seconds based on global verification entropy and agent accuracy metrics.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
