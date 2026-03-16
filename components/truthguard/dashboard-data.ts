import { AnalysisResult } from "@/lib/analysis-types";

export interface SimulatorHeadline {
  id: string;
  headline: string;
  category: string;
  verdict: "real" | "fake";
}

export interface ConsensusTickerItem {
  id: string;
  url: string;
  consensus: string;
  status: "verified" | "warning" | "critical";
}

export interface MediaHeatZone {
  id: string;
  top: string;
  left: string;
  width: string;
  height: string;
  intensity: number;
}

export interface MediaInsight {
  authenticityScore: number;
  zones: MediaHeatZone[];
  riskSignals: string[];
  scanSummary: string;
}

export const ANALYSIS_STEPS = [
  "Extracting Claims...",
  "Analyzing Manipulation Patterns...",
  "Running Multimodal Deepfake Check...",
] as const;

export const SIMULATOR_HEADLINES: SimulatorHeadline[] = [
  {
    id: "headline-1",
    headline: "Election servers seized in midnight raid, officials silent",
    category: "Civic rumor",
    verdict: "fake",
  },
  {
    id: "headline-2",
    headline: "Health ministry issues updated dengue advisory for metro cities",
    category: "Public health",
    verdict: "real",
  },
  {
    id: "headline-3",
    headline: "Banking app to deduct dormant account fee from all users tonight",
    category: "Finance alert",
    verdict: "fake",
  },
];

export const CONSENSUS_TICKER: ConsensusTickerItem[] = [
  {
    id: "consensus-1",
    url: "boomlive.in/fact-check/public-health-claim",
    consensus: "81% verified",
    status: "verified",
  },
  {
    id: "consensus-2",
    url: "tinyurl.example/flash-grant-promo",
    consensus: "Scam probability 92%",
    status: "critical",
  },
  {
    id: "consensus-3",
    url: "pib.gov.in/pressrelease/update-brief",
    consensus: "Government source synced",
    status: "verified",
  },
  {
    id: "consensus-4",
    url: "viralpost.example/breaking-circuit-leak",
    consensus: "Manipulation watchlist",
    status: "warning",
  },
];

export function verdictTone(analysis: AnalysisResult) {
  if (analysis.scamRisk.score >= 72) {
    return {
      label: "Scam Risk",
      className:
        "border-red-500/40 bg-red-500/15 text-red-200 shadow-[0_0_28px_rgba(239,68,68,0.28)]",
    };
  }

  if (analysis.tags.includes("Financial Scam Risk")) {
    return {
      label: "AI-Generated Deepfake",
      className:
        "border-red-500/40 bg-red-500/15 text-red-200 shadow-[0_0_28px_rgba(239,68,68,0.28)]",
    };
  }

  if (analysis.trustScore >= 75) {
    return {
      label: "Verified",
      className:
        "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_28px_rgba(52,211,153,0.22)]",
    };
  }

  return {
    label: "Misleading",
    className:
      "border-amber-400/40 bg-amber-400/15 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.18)]",
  };
}

export function trustTone(score: number) {
  if (score >= 75) {
    return {
      label: "High Trust",
      ring: "stroke-emerald-400",
      glow: "shadow-[0_0_42px_rgba(52,211,153,0.2)]",
    };
  }

  if (score >= 40) {
    return {
      label: "Manipulation Warning",
      ring: "stroke-amber-400",
      glow: "shadow-[0_0_42px_rgba(251,191,36,0.18)]",
    };
  }

  return {
    label: "Threat Detected",
    ring: "stroke-red-500",
    glow: "shadow-[0_0_42px_rgba(239,68,68,0.2)]",
  };
}

export function generateMediaInsight(file: File | null): MediaInsight {
  if (!file) {
    return {
      authenticityScore: 84,
      zones: [
        {
          id: "z1",
          top: "16%",
          left: "18%",
          width: "24%",
          height: "20%",
          intensity: 0.55,
        },
        {
          id: "z2",
          top: "46%",
          left: "56%",
          width: "18%",
          height: "24%",
          intensity: 0.72,
        },
      ],
      riskSignals: [
        "Baseline spectral drift within normal range",
        "No coordinated phishing language attached to media metadata",
        "Community consensus pending file upload",
      ],
      scanSummary:
        "Multimodal probe idle. Upload image, audio, or video to render local forensic overlays.",
    };
  }

  const seed = file.name.length + Math.round(file.size / 1024);
  const authenticityScore = Math.max(31, 92 - (seed % 53));

  return {
    authenticityScore,
    zones: [
      {
        id: "z1",
        top: `${14 + (seed % 18)}%`,
        left: `${12 + (seed % 22)}%`,
        width: `${18 + (seed % 16)}%`,
        height: `${16 + (seed % 14)}%`,
        intensity: 0.55 + ((seed % 30) / 100),
      },
      {
        id: "z2",
        top: `${42 + (seed % 14)}%`,
        left: `${46 + (seed % 18)}%`,
        width: `${16 + (seed % 12)}%`,
        height: `${20 + (seed % 10)}%`,
        intensity: 0.42 + (((seed + 11) % 34) / 100),
      },
      {
        id: "z3",
        top: `${22 + (seed % 12)}%`,
        left: `${64 - (seed % 12)}%`,
        width: `${12 + (seed % 14)}%`,
        height: `${14 + (seed % 18)}%`,
        intensity: 0.38 + (((seed + 7) % 28) / 100),
      },
    ],
    riskSignals: [
      file.type.startsWith("image/")
        ? "Pixel coherence variance detected around facial boundary zones"
        : "Temporal artifact scan highlighted compression irregularities",
      file.type.startsWith("audio/")
        ? "Synthetic voice cadence markers show moderate anomaly pressure"
        : "Metadata fingerprint does not align with a clean capture chain",
      file.name.toLowerCase().includes("offer") ||
      file.name.toLowerCase().includes("loan")
        ? "Filename semantics overlap with fraud bait patterns"
        : "Scam language fusion remains low in the attached asset",
    ],
    scanSummary: `Forensic overlay generated for ${file.name}. Authenticity estimate is provisional until backend multimodal scoring is connected.`,
  };
}
