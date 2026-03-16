"use client";

import { motion } from "framer-motion";
import { Shield, Menu, X, Bell, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth-actions";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/providers/notification-provider";

const NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Threats", href: "/threats" },
  { name: "Fact-Check", href: "/fact-check" },
  { name: "Community", href: "/community" },
];

export function NavbarContent({ session }: { session: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const pathname = usePathname();
  const user = session?.user;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
      <div className="container mx-auto max-w-[1600px] px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Shield className="h-6 w-6 text-slate-950" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              TRUTH<span className="text-cyan-400">GUARD</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-all relative py-1",
                    isActive 
                      ? "text-cyan-400 font-bold" 
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  {link.name}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" 
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              System: Secure
            </div>
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (unreadCount > 0) markAllAsRead();
                }}
                className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-400 group"
              >
                <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-4 w-80 rounded-[24px] border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Intelligence Feed</h3>
                    <button onClick={() => setShowNotifs(false)} className="text-[10px] text-slate-500 hover:text-white uppercase transition-colors">Close</button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              n.type === 'success' ? 'text-emerald-400' :
                              n.type === 'warning' ? 'text-amber-400' : 'text-cyan-400'
                            )}>{n.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">No active alerts</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                <div className="text-right">
                  <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Verified Agent</p>
                </div>
                {user.image ? (
                  <div className="relative h-9 w-9 rounded-full border border-cyan-400/30 overflow-hidden">
                    <Image src={user.image} alt={user.name ?? "User"} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <button 
                  onClick={() => logout()}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-300 md:hidden"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 pb-6 md:hidden"
        >
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/90 p-6 backdrop-blur-xl">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-lg font-medium transition-all px-4 py-2 rounded-xl",
                    isActive 
                      ? "text-cyan-400 bg-cyan-400/10 font-bold border border-cyan-400/20" 
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
            <hr className="border-white/10" />
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.image && <Image src={user.image} alt="" width={32} height={32} className="rounded-full" />}
                  <span className="text-sm font-bold text-white">{user.name}</span>
                </div>
                <button onClick={() => logout()} className="text-xs font-bold text-red-400 uppercase tracking-widest">Logout</button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setIsOpen(false)} className="w-full rounded-2xl bg-white py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-100">
                Sign In
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
