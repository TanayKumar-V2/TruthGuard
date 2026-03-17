"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, Lock, User, Globe } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { loginWithGoogle } from "@/lib/actions/auth-actions";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };


  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_22%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.18),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.72),_transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-6"
          >
            <Shield className="h-10 w-10 text-slate-950" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            TRUTH<span className="text-cyan-400">GUARD</span>
          </h1>
          <p className="text-slate-400 text-center font-medium">
            Enter the intelligence matrix. Secure your reality.
          </p>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Access Protocol</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50" />
                <input 
                  type="email" 
                  placeholder="Intelligence ID (Email)"
                  className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Encrypted Key</label>
                <button className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70 hover:text-cyan-400 transition-colors">Emergency Reset</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50" />
                <input 
                  type="password" 
                  placeholder="••••••••••••"
                  className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/30 transition-all"
                />
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Secure Federation</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center gap-3 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isLoading ? "Syncing..." : "Continue with Google"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 text-cyan-400/50" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Global Node 01</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status: Operational</span>
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-slate-600">
          By authorizing access, you agree to the <Link href="#" className="underline decoration-slate-600/50 underline-offset-4 hover:text-slate-400 transition-colors">Neural Protocols</Link> and <Link href="#" className="underline decoration-slate-600/50 underline-offset-4 hover:text-slate-400 transition-colors">Data Privacy Shield</Link>.
        </p>
      </motion.div>
    </main>
  );
}
