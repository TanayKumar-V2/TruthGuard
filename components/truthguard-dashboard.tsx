"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  FileUp,
  Fingerprint,
  Link2,
  Scan,
  Shield,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ANALYSIS_STEPS,
  CONSENSUS_TICKER,
  generateMediaInsight,
  SIMULATOR_HEADLINES,
  trustTone,
  verdictTone,
} from "@/components/truthguard/dashboard-data";
import { AnalysisResult, ClaimEvidence, FlagInsight } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

interface AnalyzeApiResponse {
  analysis: AnalysisResult;
}

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function extractMetric(analysis: AnalysisResult | null, tag: string) {
  if (!analysis) return 0;
  if (tag === "Sensationalism") {
    return Math.min(
      100,
      (analysis.tags.includes("Sensationalism") ? 38 : 14) +
        (analysis.manipulationLevel === "HIGH"
          ? 34
          : analysis.manipulationLevel === "MEDIUM"
            ? 18
            : 0),
    );
  }
  if (tag === "Emotional Trigger") {
    return Math.min(
      100,
      (analysis.tags.includes("Emotional Trigger") ? 42 : 10) +
        (analysis.scamRisk.score > 55 ? 22 : 8),
    );
  }

  return Math.min(
    100,
    (analysis.tags.includes("Clickbait") ? 48 : 12) +
      (analysis.tags.includes("Forwarded Chain Message") ? 18 : 0) +
      (analysis.manipulationLevel === "HIGH" ? 20 : 8),
  );
}

function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const fromValue = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      fromValue.current = value;
      return;
    }

    const controls = animate(fromValue.current, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplay(Math.round(latest));
      },
    });

    fromValue.current = value;
    return () => controls.stop();
  }, [prefersReducedMotion, value]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

function TypewriterLine({ text, active }: { text: string; active: boolean }) {
  const [visibleCount, setVisibleCount] = useState(active ? 0 : text.length);

  useEffect(() => {
    if (!active) {
      const frame = window.requestAnimationFrame(() => {
        setVisibleCount(text.length);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const resetFrame = window.requestAnimationFrame(() => {
      setVisibleCount(0);
    });
    const interval = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= text.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 32);

    return () => {
      window.cancelAnimationFrame(resetFrame);
      window.clearInterval(interval);
    };
  }, [active, text]);

  return (
    <span className="font-mono text-sm text-cyan-100">
      {text.slice(0, visibleCount)}
      {active ? (
        <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-cyan-300 align-middle" />
      ) : null}
    </span>
  );
}

function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionEyebrow({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.3em] text-cyan-100/90 shadow-sm backdrop-blur-sm">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function TrustDial({ score }: { score: number }) {
  const tone = trustTone(score);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (score / 100) * circumference;

  return (
    <div
      className={cn(
        "relative grid h-[240px] w-[240px] place-items-center rounded-full bg-slate-950/70",
        tone.glow,
      )}
    >
      <svg className="-rotate-90 h-[220px] w-[220px]" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r={radius} className="fill-none stroke-white/10" strokeWidth="14" />
        <motion.circle
          cx="110"
          cy="110"
          r={radius}
          className={cn("fill-none", tone.ring)}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Trust Score
          </div>
          <div className="mt-2 text-5xl font-black text-white">
            <CountUp value={score} suffix="%" />
          </div>
          <div className="mt-2 text-sm text-slate-300">{tone.label}</div>
        </div>
      </div>
    </div>
  );
}

function ManipulationBars({ analysis }: { analysis: AnalysisResult }) {
  const items = [
    {
      key: "sensationalism",
      label: "Sensationalism",
      value: extractMetric(analysis, "Sensationalism"),
      tone: "from-amber-300 via-amber-400 to-red-500",
    },
    {
      key: "emotional",
      label: "Emotional Manipulation",
      value: extractMetric(analysis, "Emotional Trigger"),
      tone: "from-cyan-300 via-indigo-400 to-red-500",
    },
    {
      key: "clickbait",
      label: "Clickbait",
      value: extractMetric(analysis, "Clickbait"),
      tone: "from-indigo-300 via-cyan-400 to-amber-400",
    },
  ];

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key} className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{item.label}</span>
            <CountUp value={item.value} suffix="%" className="font-semibold text-white" />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className={cn("h-full rounded-full bg-gradient-to-r", item.tone)}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 1.05, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: ClaimEvidence["supporting"];
  tone: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", tone)}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No signals surfaced in this lane.</p>
      ) : (
        items.map((item) => {
          const Wrapper = item.url ? "a" : "div";
          const wrapperProps = item.url
            ? {
                href: item.url,
                target: "_blank",
                rel: "noreferrer",
                className:
                  "block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_16px_40px_rgba(34,211,238,0.1)] cursor-pointer",
              }
            : {
                className: "block rounded-xl border border-white/10 bg-white/[0.03] p-3",
              };

          return (
            <Wrapper key={`${item.label}-${item.source}-${item.note}`} {...wrapperProps}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-cyan-400/80">
                    {item.source}
                  </p>
                </div>
                {item.url ? <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.note}</p>
            </Wrapper>
          );
        })
      )}
    </div>
  );
}

function FlagInsightsPanel({ insights }: { insights: FlagInsight[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(
    insights[0]?.tag ?? null,
  );

  // Sync activeTag when insights prop changes (e.g. after a new analysis)
  useEffect(() => {
    if (insights.length > 0) {
      setActiveTag(insights[0].tag);
    } else {
      setActiveTag(null);
    }
  }, [insights]);

  const active = insights.find((i) => i.tag === activeTag) ?? null;

  if (insights.length === 0) return null;

  const severityStyle = (sev: FlagInsight["severity"]) => {
    if (sev === "high") return "border-red-500/40 bg-red-500/15 text-red-200";
    if (sev === "medium") return "border-amber-400/40 bg-amber-400/15 text-amber-100";
    return "border-emerald-400/40 bg-emerald-400/15 text-emerald-200";
  };

  return (
    <GlassPanel className="p-6 lg:p-7">
      <SectionEyebrow
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        label="Why It Was Flagged — RAG Signal Breakdown"
      />
      {/* Tag pill selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {insights.map((insight) => (
          <button
            key={insight.tag}
            type="button"
            onClick={() => setActiveTag(insight.tag)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
              activeTag === insight.tag
                ? severityStyle(insight.severity)
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/30 hover:text-cyan-100",
            )}
          >
            {insight.tag}
          </button>
        ))}
      </div>

      {/* Active insight detail card */}
      {active && (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-white">{active.tag}</span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  severityStyle(active.severity),
                )}
              >
                {active.severity} severity
              </span>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
              {active.reason}
            </div>
            {active.matchedPhrases.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Matched phrases
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.matchedPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="rounded-[22px] border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Learning note
              </div>
              <p className="text-sm leading-7 text-slate-300">{active.learningNote}</p>
            </div>
            <div className="rounded-[22px] border border-indigo-400/20 bg-indigo-400/[0.06] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">
                How to verify
              </div>
              <p className="text-sm leading-7 text-slate-300">{active.verificationStep}</p>
            </div>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function ClaimCard({
  claim,
  certifiedLinks,
  flagInsights,
  defaultOpen = false,
}: {
  claim: ClaimEvidence;
  certifiedLinks: AnalysisResult["officialSourceLinks"];
  flagInsights: FlagInsight[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Sync open state if defaultOpen changes (important for new analysis results)
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  // Pick the most relevant insight for this claim
  const relevantInsight = flagInsights[0] ?? null;

  return (
    <motion.article
      variants={itemVariants}
      className="mb-0 break-inside-avoid rounded-[28px] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_24px_60px_rgba(34,211,238,0.14)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Extracted claim
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-7 text-white">{claim.claim}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-100">
          {claim.verdict}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <EvidenceColumn title="Supporting Evidence" items={claim.supporting} tone="bg-emerald-400/15 text-emerald-200" />
        <EvidenceColumn title="Contradicting Evidence" items={claim.contradicting} tone="bg-red-500/15 text-red-200" />
        <EvidenceColumn title="Certified Fact-Check Links" items={claim.insufficient} tone="bg-cyan-400/15 text-cyan-100" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {certifiedLinks.slice(0, 3).map((link) => (
          <a
            key={`${claim.claim}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-100"
          >
            {link.source}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ))}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-400/15"
        >
          Why was this flagged?
        </button>
      </div>

      {open && relevantInsight ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-amber-100">{relevantInsight.tag}</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200 uppercase tracking-wide">
              {relevantInsight.severity}
            </span>
          </div>
          <p className="text-sm leading-6 text-amber-50">{relevantInsight.reason}</p>
          {relevantInsight.matchedPhrases.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {relevantInsight.matchedPhrases.map((phrase) => (
                <span key={phrase} className="rounded-full border border-amber-400/25 bg-amber-900/40 px-2.5 py-1 text-xs text-amber-100">
                  {phrase}
                </span>
              ))}
            </div>
          )}
          <p className="border-t border-amber-400/10 pt-3 text-xs leading-6 text-amber-200/80">
            <span className="font-semibold">How to verify: </span>
            {relevantInsight.verificationStep}
          </p>
        </div>
      ) : open ? (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
          TruthGuard flagged this claim because its evidence pattern shows either contradiction pressure, missing sourcing, or persuasive framing.
        </div>
      ) : null}
    </motion.article>
  );
}

function MediaAnalysis({
  file,
  previewUrl,
  analysis,
}: {
  file: File | null;
  previewUrl: string | null;
  analysis: AnalysisResult | null;
}) {
  const media = useMemo(() => generateMediaInsight(file), [file]);

  return (
    <GlassPanel className="p-6 lg:p-7">
      <SectionEyebrow icon={<Fingerprint className="h-3.5 w-3.5" />} label="Multimodal Deepfake and Scam Analysis" />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
            <span>AI manipulation zone heat map</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-cyan-100">
              Authenticity <CountUp value={media.authenticityScore} suffix="%" />
            </span>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.24),_transparent_48%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]">
            {previewUrl ? (
              <Image src={previewUrl} alt="Uploaded media preview" fill unoptimized className="object-cover opacity-70" />
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-slate-300">Upload an image, audio clip, or video file to project forensic overlays.</p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0">
              {media.zones.map((zone) => (
                <motion.div
                  key={zone.id}
                  className="absolute rounded-2xl border border-red-400/35 bg-[radial-gradient(circle,_rgba(248,113,113,0.38),_rgba(251,191,36,0.1),_transparent_72%)] backdrop-blur-[2px]"
                  style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height }}
                  animate={{ opacity: [0.35, zone.intensity, 0.35] }}
                  transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">{media.scanSummary}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Scam risk breakdown</div>
                <p className="mt-1 text-sm text-slate-400">Indicators common in financial fraud, phishing, and impersonation.</p>
              </div>
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-100">
                <CountUp value={analysis?.scamRisk.score ?? 18} suffix="%" />
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(analysis?.scamRisk.indicators.length ? analysis.scamRisk.indicators : media.riskSignals).slice(0, 4).map((indicator) => (
                <div key={indicator} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                  {indicator}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-semibold text-white">Fraud response protocol</div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {(analysis?.scamRisk.actions.length
                ? analysis.scamRisk.actions
                : [
                    "Cross-verify payment or identity requests through official channels.",
                    "Never share OTP, UPI PIN, or device access during verification.",
                    "Pause and compare the claim against fact-check databases before forwarding.",
                  ]).map((action) => (
                <div key={action} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.05] p-3">
                  {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function SimulatorWidget() {
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(120);
  const [status, setStatus] = useState<string | null>(null);
  const headline = SIMULATOR_HEADLINES[index];

  function submitGuess(guess: "real" | "fake") {
    const correct = guess === headline.verdict;
    setPoints((value) => value + (correct ? 15 : -5));
    setStatus(
      correct
        ? "Correct. Pattern recognition boosted."
        : "Incorrect. Inspect the framing and attribution again.",
    );
    setIndex((value) => (value + 1) % SIMULATOR_HEADLINES.length);
  }

  return (
    <GlassPanel className="p-5">
      <SectionEyebrow icon={<Sparkles className="h-3.5 w-3.5" />} label="Gamification Hub" />
      <div className="rounded-[24px] border border-white/10 bg-slate-950/65 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white">Test Your Instincts</span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
            {points} pts
          </span>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{headline.category}</p>
          <p className="mt-3 text-lg font-semibold leading-7 text-white">{headline.headline}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => submitGuess("real")}
            className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
          >
            Real
          </button>
          <button
            type="button"
            onClick={() => submitGuess("fake")}
            className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
          >
            Fake
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          {status ?? "Evaluate the framing, urgency, and evidence trail before choosing."}
        </p>
      </div>
    </GlassPanel>
  );
}

function ConsensusTicker() {
  return (
    <div className="ticker-shell fixed bottom-0 left-0 right-0 z-50 overflow-hidden border-t border-cyan-400/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="ticker-track flex min-w-max items-center gap-4 py-3">
        {[...CONSENSUS_TICKER, ...CONSENSUS_TICKER].map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={cn(
              "flex items-center gap-3 rounded-full border px-4 py-2 text-sm",
              item.status === "verified" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
              item.status === "warning" && "border-amber-400/20 bg-amber-400/10 text-amber-100",
              item.status === "critical" && "border-red-500/20 bg-red-500/10 text-red-100",
            )}
          >
            <span className="font-mono text-xs text-slate-300">{item.url}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span>{item.consensus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TruthGuardDashboard() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const initialText = searchParams.get("text") || "";
  
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [textInput, setTextInput] = useState(initialText);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Track if we've already handled the auto-analysis on mount to prevent double firing
  const hasAutoAnalyzed = useRef(false);

  useEffect(() => {
    if (!uploadedFile || !uploadedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(uploadedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadedFile]);

  const canAnalyze = Boolean(textInput.trim() || urlInput.trim() || uploadedFile) && !isAnalyzing;
  const officialLinks = analysis?.officialSourceLinks ?? [];
  const certifiedLinksMatch = officialLinks.filter((link) =>
    ["Alt News", "BOOM", "PIB Fact Check"].some((name) => link.source.includes(name)),
  );
  const certifiedLinks = certifiedLinksMatch.length > 0 ? certifiedLinksMatch : officialLinks;
  const verdict = analysis ? verdictTone(analysis) : null;

  async function runPipeline() {
    for (let index = 0; index < ANALYSIS_STEPS.length; index += 1) {
      setActiveStepIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysis(null);

    const pipelinePromise = runPipeline();

    try {
      const fallbackMediaText =
        uploadedFile && !textInput.trim() && !urlInput.trim()
          ? `Uploaded media asset named ${uploadedFile.name} for deepfake and scam screening.`
          : "";

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textInput.trim() || fallbackMediaText,
          url: urlInput.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as AnalyzeApiResponse | { error?: string } | null;
      await pipelinePromise;

      if (!response.ok || !payload || !("analysis" in payload)) {
        throw new Error(payload && "error" in payload ? payload.error : "Analysis failed.");
      }

      setAnalysis(payload.analysis);
    } catch (error) {
      await pipelinePromise;
      setErrorMessage(error instanceof Error ? error.message : "Unable to analyze content right now.");
    } finally {
      setIsAnalyzing(false);
      setActiveStepIndex(0);
    }
  }, [textInput, urlInput, uploadedFile, canAnalyze]);

  useEffect(() => {
    if (!hasAutoAnalyzed.current && (initialUrl || initialText)) {
      hasAutoAnalyzed.current = true;
      // Slight delay to allow UI to mount before starting heavy sequence
      const timer = setTimeout(() => {
        if (!isAnalyzing) {
          handleAnalyze();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialUrl, initialText, handleAnalyze, isAnalyzing]);

  return (
    <main className="relative overflow-hidden pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_22%),radial-gradient(circle_at_80%_20%,_rgba(99,102,241,0.18),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.72),_transparent_50%)]" />

      <section className="container relative z-10 max-w-[1600px] px-4 pb-16 pt-8 md:px-6 lg:pt-12">
        <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
          <motion.header variants={itemVariants} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <SectionEyebrow icon={<Shield className="h-3.5 w-3.5" />} label="TruthGuard Cyber Intelligence Grid" />
              <div>
                <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl xl:text-6xl">
                  The Ultimate Shield Against Digital Deception.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                  Scan forwarded messages, suspicious URLs, and uploaded media through a dark-mode trust matrix built for rapid civilian clarity and forensic-grade AI explainability.
                </p>
              </div>
            </div>

            <GlassPanel className="overflow-hidden p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Threat lanes", value: "07", icon: <AlertTriangle className="h-4 w-4" /> },
                  { label: "Deepfake probe", value: "Live", icon: <Fingerprint className="h-4 w-4" /> },
                  { label: "Community sync", value: "84%", icon: <Activity className="h-4 w-4" /> },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      {item.icon}
                      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</span>
                    </div>
                    <div className="mt-4 text-3xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </motion.header>

          <motion.section variants={itemVariants}>
            <GlassPanel className="relative overflow-hidden p-6 lg:p-8">
              {isAnalyzing ? <div className="scanner-sweep absolute inset-y-0 -left-1/3 w-1/2" /> : null}
              <div className="relative z-10 grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <SectionEyebrow icon={<Scan className="h-3.5 w-3.5" />} label="Omni-Scanner Input Hero" />
                  <div
                    className={cn(
                      "rounded-[30px] border border-white/10 bg-slate-950/70 p-4 transition",
                      isAnalyzing && "border-cyan-400/40 shadow-[0_0_45px_rgba(34,211,238,0.16)]",
                    )}
                  >
                    <div className="grid gap-4">
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-cyan-200/70" />
                        <input
                          value={urlInput}
                          onChange={(event) => setUrlInput(event.target.value)}
                          placeholder="Paste a source URL, suspicious link, or article reference"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                        />
                      </div>
                      <textarea
                        value={textInput}
                        onChange={(event) => setTextInput(event.target.value)}
                        placeholder="Paste a forwarded WhatsApp message, social post, or claim packet for forensic analysis..."
                        className="min-h-[220px] w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                      />
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30">
                          <FileUp className="h-4 w-4 text-cyan-300" />
                          <span>{uploadedFile ? uploadedFile.name : "Upload image, audio, or video"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,audio/*,video/*"
                            onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          disabled={!canAnalyze}
                          className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(99,102,241,0.98),rgba(34,211,238,0.92))] px-6 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAnalyzing ? "Analyzing..." : "Analyze"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionEyebrow icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Live Scan Feed" />
                  <div className="space-y-3 rounded-[30px] border border-white/10 bg-slate-950/70 p-5">
                    {ANALYSIS_STEPS.map((step, index) => {
                      const isActive = isAnalyzing && activeStepIndex === index;
                      const isDone = isAnalyzing && activeStepIndex > index;

                      return (
                        <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <TypewriterLine text={step} active={isActive} />
                            <span className={cn("text-xs uppercase tracking-[0.24em]", isDone ? "text-emerald-300" : isActive ? "text-cyan-300" : "text-slate-500")}>
                              {isDone ? "Complete" : isActive ? "Scanning" : "Queued"}
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/5">
                            <motion.div
                              className={cn("h-full rounded-full", isDone ? "bg-emerald-400" : "bg-gradient-to-r from-indigo-500 to-cyan-400")}
                              initial={{ width: 0 }}
                              animate={{ width: isDone ? "100%" : isActive ? "76%" : "12%" }}
                              transition={{ duration: 0.7 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{errorMessage}</div> : null}
                </div>
              </div>
            </GlassPanel>
          </motion.section>
          {analysis ? (
            <motion.section variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
              <motion.div variants={itemVariants}>
                <FlagInsightsPanel insights={analysis.flagInsights} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <GlassPanel className="p-6 lg:p-7">
                  <SectionEyebrow icon={<Sparkles className="h-3.5 w-3.5" />} label="Forensic Evidence & Claim Breakdown" />
                  <div className="mt-8 space-y-8">
                    {analysis.claimEvidence.length > 0 ? (
                      analysis.claimEvidence.map((claim, idx) => (
                        <ClaimCard
                          key={claim.claim}
                          claim={claim}
                          certifiedLinks={certifiedLinks}
                          flagInsights={analysis.flagInsights}
                          defaultOpen={idx === 0 && (claim.verdict === "contradicting" || analysis.trustScore < 60)}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-12 text-center text-slate-400">
                        No distinct claims were extracted for deeper evidence matching.
                      </div>
                    )}
                  </div>
                </GlassPanel>
              </motion.div>

              <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <GlassPanel className="p-6 lg:p-7">
                  <SectionEyebrow icon={<Shield className="h-3.5 w-3.5" />} label="Trust Matrix" />
                  <div className="mb-8 rounded-[24px] border border-cyan-400/20 bg-cyan-400/[0.04] p-6 lg:p-8">
                    <div className="mb-4 flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-cyan-300" />
                      <h2 className="text-xl font-bold text-white">AI Verdict & Summary</h2>
                    </div>
                    <p className="text-base leading-8 text-slate-200">{analysis.summary}</p>
                  </div>
                  <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="flex flex-col items-center justify-center gap-5">
                      <TrustDial score={analysis.trustScore} />
                      <div className={cn("inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold", verdict?.className)}>
                        {verdict?.label}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">Manipulation Radar</div>
                            <p className="mt-1 text-sm text-slate-400">Persuasion pressure across rhetorical attack surfaces.</p>
                          </div>
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                            {analysis.manipulationLevel}
                          </span>
                        </div>
                        <ManipulationBars analysis={analysis} />
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
                        <div className="text-sm font-semibold text-white">Content Fingerprint Tags</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {analysis.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                <div className="grid gap-6">
                  <GlassPanel className="p-6">
                    <SectionEyebrow icon={<Activity className="h-3.5 w-3.5" />} label="Intel Notes" />
                    <div className="space-y-3">
                      {analysis.sourceSignals.slice(0, 5).map((signal) => (
                        <div key={signal} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                          {signal}
                        </div>
                      ))}
                    </div>
                  </GlassPanel>

                  <SimulatorWidget />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <MediaAnalysis file={uploadedFile} previewUrl={previewUrl} analysis={analysis} />
              </motion.div>

              <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <GlassPanel className="p-6">
                  <SectionEyebrow icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Verification Doctrine" />
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
                      {analysis.education}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {analysis.verificationTips.map((tip) => (
                        <div key={tip} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <SectionEyebrow icon={<Fingerprint className="h-3.5 w-3.5" />} label="Community and Feedback" />
                  <div className="grid gap-4">
                    {([
                      ["Useful", analysis.feedbackSummary.useful],
                      ["Wrong flag", analysis.feedbackSummary.wrongFlag],
                      ["Missed scam", analysis.feedbackSummary.missedScam],
                    ] as const).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4">
                        <span className="text-sm text-slate-300">{label}</span>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100">{value}</span>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-400">
                      Decentralized trust consensus and literacy scoring are represented here as a future-facing UX layer on top of the existing local feedback model.
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            </motion.section>
          ) : null}
        </motion.div>
      </section>

      <ConsensusTicker />
    </main>
  );
}
