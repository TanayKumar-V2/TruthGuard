"use client";

import { startTransition, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CircleDotDashed,
  ExternalLink,
  Flag,
  HandCoins,
  Link2,
  Loader2,
  MessageSquareWarning,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  ThumbsUp,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AnalysisResult,
  EvidenceItem,
  FeedbackAction,
  FeedbackSummary,
  ManipulationLevel,
} from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

const ANALYSIS_STEPS = [
  "Submitting to Backend",
  "Retrieving RAG Context",
  "Running Gemini Analysis",
  "Building Result Payload",
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function trustBand(score: number) {
  if (score >= 75) {
    return {
      label: "High Trust",
      valueClass: "text-emerald-600",
      indicatorClass: "bg-emerald-500",
    };
  }

  if (score >= 40) {
    return {
      label: "Medium Trust",
      valueClass: "text-amber-600",
      indicatorClass: "bg-amber-500",
    };
  }

  return {
    label: "Low Trust",
    valueClass: "text-red-600",
    indicatorClass: "bg-red-500",
  };
}

function manipulationBadge(
  level: ManipulationLevel,
): "success" | "warning" | "danger" {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  return "danger";
}

function ManipulationIcon({ level }: { level: ManipulationLevel }) {
  if (level === "LOW")
    return <ShieldCheck className="h-5 w-5 text-emerald-600" />;
  if (level === "MEDIUM")
    return <ShieldQuestion className="h-5 w-5 text-amber-600" />;
  return <ShieldAlert className="h-5 w-5 text-red-600" />;
}

function formatContribution(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function verdictBadgeVariant(
  verdict:
    | EvidenceItem["verdict"]
    | "supporting"
    | "contradicting"
    | "insufficient",
) {
  if (verdict === "supporting") return "success" as const;
  if (verdict === "contradicting") return "danger" as const;
  return "warning" as const;
}

function impactTone(impact: "positive" | "negative" | "mixed") {
  if (impact === "positive") return "text-emerald-700";
  if (impact === "negative") return "text-red-700";
  return "text-amber-700";
}

function feedbackLabel(action: FeedbackAction) {
  if (action === "useful") return "Useful";
  if (action === "wrong_flag") return "Wrong flag";
  return "Missed scam";
}

function mergeFeedbackSummary(
  previous: AnalysisResult | null,
  feedbackSummary: FeedbackSummary,
): AnalysisResult | null {
  if (!previous) return previous;
  return { ...previous, feedbackSummary };
}

function EvidenceColumn({
  title,
  items,
  verdict,
}: {
  title: string;
  items: EvidenceItem[];
  verdict: EvidenceItem["verdict"];
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-slate-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <Badge variant={verdictBadgeVariant(verdict)}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No items in this bucket.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${title}-${item.label}-${item.url || item.note}`}
              className="rounded-lg border bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {item.label}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {item.source}
                  </p>
                </div>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyzeApiResponse {
  analysis: AnalysisResult;
}

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInsightTag, setSelectedInsightTag] = useState<string | null>(
    null,
  );
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [selectedFeedbackAction, setSelectedFeedbackAction] =
    useState<FeedbackAction | null>(null);

  const canAnalyze =
    (urlInput.trim().length > 0 || textInput.trim().length > 0) && !isAnalyzing;
  const scoreUi = analysis ? trustBand(analysis.trustScore) : null;
  const selectedInsight =
    analysis?.flagInsights.find((item) => item.tag === selectedInsightTag) ||
    null;
  const primaryInsights = analysis?.flagInsights.slice(0, 3) || [];

  useEffect(() => {
    setSelectedInsightTag(analysis?.flagInsights[0]?.tag || null);
    setSelectedFeedbackAction(null);
    setFeedbackStatus(null);
  }, [analysis]);

  async function runPipelineSteps() {
    for (let index = 0; index < ANALYSIS_STEPS.length; index += 1) {
      setActiveStepIndex(index);
      await sleep(650);
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setErrorMessage(null);
    setFeedbackStatus(null);

    const pipelinePromise = runPipelineSteps();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textInput.trim(),
          url: urlInput.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | AnalyzeApiResponse
        | { error?: string }
        | null;

      await pipelinePromise;

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload ? payload.error : "Analysis failed.",
        );
      }

      if (!payload || !("analysis" in payload)) {
        throw new Error("Unexpected analysis response.");
      }

      startTransition(() => {
        setAnalysis(payload.analysis);
      });
    } catch (error) {
      await pipelinePromise;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to analyze content right now. Please try again.",
      );
    } finally {
      setActiveStepIndex(-1);
      setIsAnalyzing(false);
    }
  }

  async function handleFeedback(action: FeedbackAction) {
    if (!analysis || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    setSelectedFeedbackAction(action);
    setFeedbackStatus(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.analysisId,
          action,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { feedbackSummary: FeedbackSummary }
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("feedbackSummary" in payload)) {
        throw new Error(
          payload && "error" in payload
            ? payload.error
            : "Feedback save failed.",
        );
      }

      startTransition(() => {
        setAnalysis((previous) =>
          mergeFeedbackSummary(previous, payload.feedbackSummary),
        );
      });
      setFeedbackStatus(`${feedbackLabel(action)} feedback saved.`);
    } catch (error) {
      setFeedbackStatus(
        error instanceof Error
          ? error.message
          : "Unable to save feedback right now.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  return (
    <main className="pb-10 pt-8">
      <section className="container space-y-6">
        <header className="rounded-2xl border bg-white/90 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Live Fact-Check Prototype
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                TruthGuard Dashboard
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                Analyze social posts, forwarded messages, and links with live
                backend scoring from Gemini + RAG, claim-level evidence panels,
                scam screening, and explainable educational guidance.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">Expanded Analysis Stack</p>
              <p className="mt-1">
                Trust score, retrieval-backed evidence buckets, scam mode,
                timeline, and feedback loop.
              </p>
            </div>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <ShieldCheck className="h-4 w-4" />
              Check the Source
            </h3>
            <p className="text-xs text-slate-600">
              Verify if the domain is well-known or official. Be wary of
              lookalike URLs.
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Search className="h-4 w-4" />
              Cross-Verify Evidence
            </h3>
            <p className="text-xs text-slate-600">
              Compare the claim with reliable reporting and official primary
              sources before sharing.
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <AlertCircle className="h-4 w-4" />
              Analyze Tone
            </h3>
            <p className="text-xs text-slate-600">
              High-urgency language and emotional hooks often signal
              misinformation.
            </p>
          </div>
        </div>

        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <ScanSearch className="h-5 w-5 text-blue-600" />
              Analyze Content
            </CardTitle>
            <CardDescription>
              Submit text, a URL, or both. TruthGuard evaluates source quality,
              manipulation signals, fraud risk, and backend RAG evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="url-input"
                className="text-sm font-medium text-slate-700"
              >
                Source URL (optional)
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="url-input"
                  placeholder="https://example.com/news-article"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="text-input"
                className="text-sm font-medium text-slate-700"
              >
                Content to Analyze
              </label>
              <Textarea
                id="text-input"
                placeholder="Paste forwarded message, social media post, or article text..."
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                className="min-h-[180px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="min-w-32"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <ScanSearch className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAnalyzing && (
          <Card className="border-blue-200 bg-blue-50/70" aria-live="polite">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">
                Running Analysis Pipeline
              </CardTitle>
              <CardDescription className="text-blue-700">
                Preparing trust, retrieval context, and model scoring...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ANALYSIS_STEPS.map((step, index) => {
                  const isDone = index < activeStepIndex;
                  const isCurrent = index === activeStepIndex;

                  return (
                    <div
                      key={step}
                      className={cn(
                        "flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm",
                        isCurrent && "border-blue-300",
                      )}
                    >
                      <span className="font-medium text-slate-800">{step}</span>
                      <span className="flex items-center gap-2 text-slate-500">
                        {isDone && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        {isCurrent && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {!isDone && !isCurrent && (
                          <CircleDotDashed className="h-4 w-4" />
                        )}
                        {isDone
                          ? "Completed"
                          : isCurrent
                            ? "In Progress"
                            : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <Card className="border-red-200 bg-red-50/80">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Analysis failed</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && scoreUi && (
          <section className="grid gap-4 xl:grid-cols-6">
            {analysis.warnings.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/80 xl:col-span-6">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-semibold">Analysis notes</p>
                  </div>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {analysis.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Trust Score
                </CardTitle>
                <CardDescription>{analysis.scenario}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Credibility estimate</p>
                  <Badge variant="outline">{scoreUi.label}</Badge>
                </div>
                <div
                  className={cn(
                    "text-5xl font-black tracking-tight",
                    scoreUi.valueClass,
                  )}
                >
                  {analysis.trustScore}%
                </div>
                <Progress
                  value={analysis.trustScore}
                  indicatorClassName={scoreUi.indicatorClass}
                  aria-label="Trust score"
                />
                <p className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                  {analysis.summary}
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Source signals
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.sourceSignals.map((signal) => (
                      <Badge key={signal} variant="secondary">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-blue-600" />
                  Why It Was Flagged
                </CardTitle>
                <CardDescription>
                  The strongest reasons the backend marked this post as risky.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {primaryInsights.length > 0 ? (
                  <div className="space-y-3">
                    {primaryInsights.map((insight) => (
                      <button
                        key={insight.tag}
                        type="button"
                        onClick={() => setSelectedInsightTag(insight.tag)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          selectedInsightTag === insight.tag
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-slate-50/80 hover:border-blue-200 hover:bg-blue-50/70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{insight.tag}</Badge>
                              <Badge
                                variant={
                                  insight.severity === "high"
                                    ? "danger"
                                    : insight.severity === "medium"
                                      ? "warning"
                                      : "success"
                                }
                              >
                                {insight.severity}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {insight.reason}
                            </p>
                            <p className="text-sm text-slate-600">
                              Verify next by: {insight.verificationStep}
                            </p>
                          </div>
                        </div>
                        {insight.matchedPhrases.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {insight.matchedPhrases.map((phrase) => (
                              <Badge key={phrase} variant="secondary">
                                {phrase}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
                    No specific fake or spam trigger was returned for this
                    result.
                  </div>
                )}

                {analysis.scamRisk.indicators.length > 0 ? (
                  <div className="rounded-xl border bg-amber-50/70 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Spam or scam indicators detected
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-amber-900">
                      {analysis.scamRisk.indicators.slice(0, 3).map((item) => (
                        <li key={item} className="rounded-md bg-white/80 p-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Explainable Score Breakdown
                </CardTitle>
                <CardDescription>
                  How TruthGuard reached the final trust score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.scoreBreakdown.map((item) => (
                  <div
                    key={item.key}
                    className="space-y-2 rounded-xl border bg-slate-50/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500">{item.summary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.score}%
                        </p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            impactTone(item.impact),
                          )}
                        >
                          {formatContribution(item.contribution)}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={item.score}
                      indicatorClassName={
                        item.impact === "positive"
                          ? "bg-emerald-500"
                          : item.impact === "negative"
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TriangleAlert className="h-5 w-5 text-blue-700" />
                  Manipulation Detection
                </CardTitle>
                <CardDescription>
                  Language and persuasion signal check
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-700">
                    Level
                  </span>
                  <span className="flex items-center gap-2">
                    <ManipulationIcon level={analysis.manipulationLevel} />
                    <Badge
                      variant={manipulationBadge(analysis.manipulationLevel)}
                    >
                      {analysis.manipulationLevel}
                    </Badge>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedInsightTag(tag)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                        selectedInsightTag === tag
                          ? "border-blue-500 bg-blue-100 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HandCoins className="h-5 w-5 text-blue-700" />
                  Scam Risk Mode
                </CardTitle>
                <CardDescription>
                  Focused screening for fraud-style content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Risk level
                    </p>
                    <p className="text-xs text-slate-500">
                      Score: {analysis.scamRisk.score}%
                    </p>
                  </div>
                  <Badge variant={manipulationBadge(analysis.scamRisk.level)}>
                    {analysis.scamRisk.level}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.scamRisk.categories.length > 0 ? (
                    analysis.scamRisk.categories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="success">
                      No strong scam category detected
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Indicators
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {analysis.scamRisk.indicators.length > 0 ? (
                      analysis.scamRisk.indicators.map((indicator) => (
                        <li
                          key={indicator}
                          className="rounded-md border bg-white p-2"
                        >
                          {indicator}
                        </li>
                      ))
                    ) : (
                      <li className="rounded-md border bg-white p-2">
                        No explicit fraud indicators surfaced in this
                        submission.
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TimerReset className="h-5 w-5 text-blue-700" />
                  Trust Timeline
                </CardTitle>
                <CardDescription>
                  How the score changed as evidence was applied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.trustTimeline.map((point) => (
                  <div
                    key={point.label}
                    className="rounded-xl border bg-slate-50/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {point.label}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {point.step}
                        </p>
                      </div>
                      <Badge variant="outline">{point.score}%</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{point.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-blue-600" />
                  Why Flagged
                </CardTitle>
                <CardDescription>
                  Click a tag to inspect matched phrases and literacy guidance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {analysis.flagInsights.map((insight) => (
                    <Button
                      key={insight.tag}
                      variant={
                        selectedInsightTag === insight.tag
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedInsightTag(insight.tag)}
                    >
                      {insight.tag}
                    </Button>
                  ))}
                </div>

                {selectedInsight ? (
                  <div className="space-y-3 rounded-xl border bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedInsight.tag}
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedInsight.reason}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedInsight.severity === "high"
                            ? "danger"
                            : selectedInsight.severity === "medium"
                              ? "warning"
                              : "success"
                        }
                      >
                        {selectedInsight.severity}
                      </Badge>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800">
                        Matched phrases
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.matchedPhrases.map((phrase) => (
                          <Badge key={phrase} variant="secondary">
                            {phrase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">
                          Learning note:{" "}
                        </span>
                        {selectedInsight.learningNote}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">
                          How to verify:{" "}
                        </span>
                        {selectedInsight.verificationStep}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-600">
                    Select a tag to inspect why it was flagged.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-6">
              <CardHeader>
                <CardTitle>Claim-Level Evidence Panel</CardTitle>
                <CardDescription>
                  Each extracted claim is grouped into supporting,
                  contradicting, and insufficient evidence buckets with links.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.claimEvidence.map((claim) => (
                  <div
                    key={claim.claim}
                    className="space-y-4 rounded-2xl border bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Extracted claim
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {claim.claim}
                        </p>
                      </div>
                      <Badge variant={verdictBadgeVariant(claim.verdict)}>
                        {claim.verdict}
                      </Badge>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <EvidenceColumn
                        title="Supporting"
                        items={claim.supporting}
                        verdict="supporting"
                      />
                      <EvidenceColumn
                        title="Contradicting"
                        items={claim.contradicting}
                        verdict="contradicting"
                      />
                      <EvidenceColumn
                        title="Insufficient / Search Next"
                        items={claim.insufficient}
                        verdict="insufficient"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareWarning className="h-5 w-5 text-blue-600" />
                  Micro-Education Panel
                </CardTitle>
                <CardDescription>
                  Why this score was generated and how to verify similar content
                  next time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="rounded-lg border bg-blue-50/70 p-4 text-sm leading-relaxed text-blue-900">
                  {analysis.education}
                </p>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">
                    Verification checklist
                  </p>
                  <ol className="space-y-2 text-sm text-slate-700">
                    {analysis.verificationTips.map((tip, index) => (
                      <li key={tip} className="rounded-lg border bg-white p-3">
                        <span className="font-semibold text-blue-700">
                          {index + 1}.{" "}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-blue-600" />
                  Feedback Loop
                </CardTitle>
                <CardDescription>
                  Capture whether the analysis helped, missed a scam, or flagged
                  incorrectly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={
                    selectedFeedbackAction === "useful" ? "default" : "outline"
                  }
                  className="w-full justify-between"
                  disabled={isSubmittingFeedback}
                  onClick={() => handleFeedback("useful")}
                >
                  Useful
                  <Badge variant="secondary">
                    {analysis.feedbackSummary.useful}
                  </Badge>
                </Button>
                <Button
                  variant={
                    selectedFeedbackAction === "wrong_flag"
                      ? "default"
                      : "outline"
                  }
                  className="w-full justify-between"
                  disabled={isSubmittingFeedback}
                  onClick={() => handleFeedback("wrong_flag")}
                >
                  Wrong flag
                  <Badge variant="secondary">
                    {analysis.feedbackSummary.wrongFlag}
                  </Badge>
                </Button>
                <Button
                  variant={
                    selectedFeedbackAction === "missed_scam"
                      ? "default"
                      : "outline"
                  }
                  className="w-full justify-between"
                  disabled={isSubmittingFeedback}
                  onClick={() => handleFeedback("missed_scam")}
                >
                  Missed scam
                  <Badge variant="secondary">
                    {analysis.feedbackSummary.missedScam}
                  </Badge>
                </Button>
                <div className="rounded-xl border bg-slate-50/80 p-3 text-sm text-slate-600">
                  {isSubmittingFeedback
                    ? "Saving feedback..."
                    : feedbackStatus ||
                      "Feedback is stored locally for this prototype."}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </section>
    </main>
  );
}
