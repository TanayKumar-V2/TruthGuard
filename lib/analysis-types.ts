export type ManipulationLevel = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceVerdict = "supporting" | "contradicting" | "insufficient";
export type FeedbackAction = "useful" | "wrong_flag" | "missed_scam";

export interface AnalyzeRequest {
  text?: string;
  url?: string;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  score: number;
  contribution: number;
  impact: "positive" | "negative" | "mixed";
  summary: string;
}

export interface EvidenceItem {
  label: string;
  source: string;
  url?: string;
  verdict: EvidenceVerdict;
  note: string;
}

export interface ClaimEvidence {
  claim: string;
  verdict: EvidenceVerdict;
  supporting: EvidenceItem[];
  contradicting: EvidenceItem[];
  insufficient: EvidenceItem[];
}

export interface FlagInsight {
  tag: string;
  severity: "low" | "medium" | "high";
  reason: string;
  matchedPhrases: string[];
  learningNote: string;
  verificationStep: string;
}

export interface ScamRiskAnalysis {
  active: boolean;
  level: ManipulationLevel;
  score: number;
  categories: string[];
  indicators: string[];
  actions: string[];
}

export interface TrustTimelinePoint {
  label: string;
  step: string;
  score: number;
  note: string;
}

export interface FeedbackSummary {
  useful: number;
  wrongFlag: number;
  missedScam: number;
}

export interface FeedbackRecord {
  analysisId: string;
  action: FeedbackAction;
  createdAt: string;
}

export interface AnalysisResult {
  analysisId: string;
  inputMode: "text" | "url" | "hybrid";
  scenario: string;
  trustScore: number;
  manipulationLevel: ManipulationLevel;
  tags: string[];
  summary: string;
  education: string;
  verificationTips: string[];
  extractedClaims: string[];
  sourceSignals: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  claimEvidence: ClaimEvidence[];
  flagInsights: FlagInsight[];
  scamRisk: ScamRiskAnalysis;
  trustTimeline: TrustTimelinePoint[];
  feedbackSummary: FeedbackSummary;
  warnings: string[];
}
