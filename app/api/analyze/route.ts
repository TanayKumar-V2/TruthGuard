import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AnalyzeRequest,
  AnalysisResult,
  ClaimEvidence,
  EvidenceItem,
  FeedbackSummary,
  ScoreBreakdownItem,
  TrustTimelinePoint,
} from "@/lib/analysis-types";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const backendBaseUrl =
  process.env.BACKEND_API_URL?.trim() || "http://127.0.0.1:8000";
const TEXT_ANALYSIS_POLL_ATTEMPTS = 45;
const URL_ANALYSIS_POLL_ATTEMPTS = 120;
const ANALYSIS_POLL_INTERVAL_MS = 1000;

const emptyFeedbackSummary: FeedbackSummary = {
  useful: 0,
  wrongFlag: 0,
  missedScam: 0,
};

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count += 1;
  return false;
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mapEvidence(items: BackendEvidenceItem[] | undefined): EvidenceItem[] {
  return (items || []).map((item) => ({
    label: item.label,
    source: item.source,
    url: item.url || undefined,
    verdict: item.verdict,
    note: item.note,
  }));
}

function mapClaims(claims: BackendClaimEvidence[]): ClaimEvidence[] {
  return claims.map((claim) => ({
    claim: claim.claim,
    verdict: claim.verdict,
    supporting: mapEvidence(claim.supporting),
    contradicting: mapEvidence(claim.contradicting),
    insufficient: mapEvidence(claim.insufficient),
  }));
}

function mapBreakdown(
  items: BackendScoreBreakdownItem[],
): ScoreBreakdownItem[] {
  return items.map((item) => ({
    key: slugify(item.category),
    label: item.category,
    score: item.scoreValue,
    contribution: item.contribution,
    impact: item.impact,
    summary:
      item.impact === "positive"
        ? "This factor increased trust based on the model signal."
        : item.impact === "negative"
          ? "This factor reduced trust based on the model signal."
          : "This factor produced a mixed effect on trust.",
  }));
}

function mapTimeline(items: BackendTimelinePoint[]): TrustTimelinePoint[] {
  return items.map((item) => ({
    label: item.label,
    step: item.step,
    score: item.score,
    note: item.note,
  }));
}

function mapAnalysis(
  backend: BackendAnalysisResult,
  input: AnalyzeRequest,
): AnalysisResult {
  const inputMode: "text" | "url" | "hybrid" =
    input.text?.trim() && input.url?.trim()
      ? "hybrid"
      : input.url?.trim()
        ? "url"
        : "text";

  const claims = mapClaims(backend.extractedClaims);
  const tags = backend.flags.map((flag) => flag.tag);
  const scenario = input.url?.trim()
    ? "RAG analysis for submitted URL and text."
    : "RAG analysis for submitted text.";

  const sourceSignals = [
    backend.extractedFromUrl
      ? "URL content was extracted by the backend."
      : "Analysis used submitted text content.",
    `Manipulation level: ${backend.manipulationLevel}`,
    `Scam risk level: ${backend.scamRisk.level}`,
  ];

  return {
    analysisId: randomUUID(),
    inputMode,
    scenario,
    trustScore: backend.trustScore,
    manipulationLevel: backend.manipulationLevel,
    tags: tags.length > 0 ? tags : ["No major risk tags"],
    summary: backend.summary,
    education: backend.education,
    verificationTips: backend.verificationTips,
    extractedClaims: claims.map((item) => item.claim),
    sourceSignals,
    scoreBreakdown: mapBreakdown(backend.scoreBreakdown),
    claimEvidence: claims,
    flagInsights: backend.flags.map((flag) => ({
      tag: flag.tag,
      severity: flag.severity,
      reason: flag.reason,
      matchedPhrases: flag.matchedPhrases,
      learningNote: flag.learningNote,
      verificationStep: flag.verificationStep,
    })),
    scamRisk: {
      active: backend.scamRisk.active,
      level: backend.scamRisk.level,
      score: backend.scamRisk.score,
      categories: backend.scamRisk.categories,
      indicators: backend.scamRisk.indicators,
      actions: backend.scamRisk.actions,
    },
    trustTimeline: mapTimeline(backend.trustTimeline),
    feedbackSummary: emptyFeedbackSummary,
    warnings: [],
  };
}

async function pollResult(
  taskId: string,
  attempts: number,
): Promise<BackendResultPayload> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) =>
      setTimeout(resolve, ANALYSIS_POLL_INTERVAL_MS),
    );
    const response = await fetch(
      `${backendBaseUrl}/result/${encodeURIComponent(taskId)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("Backend result lookup failed.");
    }

    const payload = (await response.json()) as BackendResultPayload;
    if (payload.status !== "processing") return payload;
  }

  throw new Error(
    "Analysis is taking longer than expected. The backend is still working on this request.",
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as AnalyzeRequest;
    const text = (body?.text || "").trim();
    const url = (body?.url || "").trim();

    if (!text && !url) {
      return NextResponse.json(
        { error: "Please provide text or a URL for analysis." },
        { status: 400 },
      );
    }

    const verifyResponse = await fetch(`${backendBaseUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, url }),
      cache: "no-store",
    });

    if (!verifyResponse.ok) {
      throw new Error("Backend verification request failed.");
    }

    const verifyPayload = (await verifyResponse.json()) as {
      task_id?: string;
    };

    if (!verifyPayload.task_id) {
      throw new Error("Backend returned an invalid task id.");
    }

    const pollAttempts = url
      ? URL_ANALYSIS_POLL_ATTEMPTS
      : TEXT_ANALYSIS_POLL_ATTEMPTS;
    const resultPayload = await pollResult(verifyPayload.task_id, pollAttempts);
    if (resultPayload.status === "failed") {
      throw new Error(resultPayload.error || "Backend analysis failed.");
    }
    if (resultPayload.status !== "completed" || !resultPayload.result) {
      throw new Error("Backend returned an incomplete analysis response.");
    }

    const analysis = mapAnalysis(resultPayload.result, { text, url });
    return NextResponse.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze content right now. Please try again.";
    const status =
      message.includes("taking longer than expected") ? 504 : 500;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

type BackendEvidenceVerdict = "supporting" | "contradicting" | "insufficient";

interface BackendEvidenceItem {
  label: string;
  source: string;
  url: string;
  verdict: BackendEvidenceVerdict;
  note: string;
}

interface BackendClaimEvidence {
  claim: string;
  verdict: BackendEvidenceVerdict;
  supporting: BackendEvidenceItem[];
  contradicting: BackendEvidenceItem[];
  insufficient: BackendEvidenceItem[];
}

interface BackendFlagInsight {
  tag: string;
  severity: "low" | "medium" | "high";
  reason: string;
  matchedPhrases: string[];
  learningNote: string;
  verificationStep: string;
}

interface BackendScamRisk {
  active: boolean;
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  categories: string[];
  indicators: string[];
  actions: string[];
}

interface BackendScoreBreakdownItem {
  category: string;
  impact: "positive" | "negative" | "mixed";
  scoreValue: number;
  contribution: number;
}

interface BackendTimelinePoint {
  label: string;
  step: string;
  score: number;
  note: string;
}

interface BackendAnalysisResult {
  trustScore: number;
  manipulationLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  education: string;
  verificationTips: string[];
  scoreBreakdown: BackendScoreBreakdownItem[];
  scamRisk: BackendScamRisk;
  extractedClaims: BackendClaimEvidence[];
  flags: BackendFlagInsight[];
  trustTimeline: BackendTimelinePoint[];
  extractedFromUrl: boolean;
}

interface BackendResultPayload {
  status: "processing" | "completed" | "failed";
  error?: string;
  result?: BackendAnalysisResult;
}
