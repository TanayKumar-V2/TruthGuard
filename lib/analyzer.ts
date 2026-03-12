import {
  AnalysisResult,
  AnalyzeRequest,
  ClaimEvidence,
  EvidenceItem,
  EvidenceVerdict,
  FactCheckMatch,
  FlagInsight,
  ManipulationLevel,
  ScamRiskAnalysis,
  ScoreBreakdownItem,
  TrustTimelinePoint,
} from "@/lib/analysis-types";
import { getFeedbackSummary } from "@/lib/feedback-store";
import {
  buildOfficialSourceLinks,
  getFactCheckMatches,
} from "@/lib/fact-check";

const SOURCE_KEYWORDS = [
  "according to",
  "official",
  "press release",
  "reported by",
  "study",
  "research",
  "source",
  "evidence",
  "data",
  "statement",
];

const SENSATIONAL_PHRASES = [
  "shocking",
  "mind-blowing",
  "you won't believe",
  "exposed",
  "massive scandal",
  "secret",
  "explosive",
];

const CLICKBAIT_PHRASES = [
  "must watch",
  "share now",
  "forward to everyone",
  "this will change everything",
  "viral truth",
  "breaking now",
];

const EMOTIONAL_PHRASES = [
  "outrage",
  "panic",
  "fear",
  "anger",
  "betrayal",
  "disaster",
  "threat",
];

const URGENCY_PHRASES = [
  "urgent",
  "immediately",
  "right now",
  "act now",
  "before it is deleted",
  "limited time",
];

const UNCERTAINTY_PHRASES = [
  "allegedly",
  "rumor",
  "unconfirmed",
  "might be",
  "heard that",
  "apparently",
];

const SCAM_PHRASES = [
  "guaranteed return",
  "double your money",
  "send otp",
  "bank account frozen",
  "claim reward",
  "investment scheme",
  "registration fee",
  "processing fee",
  "kyc update",
  "collect request",
];

const HINDI_SENSATIONAL_PHRASES = [
  "सनसनी",
  "चौंकाने वाला",
  "विस्फोटक खुलासा",
  "बड़ा खुलासा",
  "सच्चाई जानकर",
  "हैरान रह जाएंगे",
];

const HINDI_URGENCY_PHRASES = [
  "अभी शेयर करें",
  "तुरंत भेजें",
  "फौरन",
  "जल्दी करो",
  "समय सीमित",
  "delete hone se pehle",
  "abhi share karo",
  "turant",
];

const HINDI_SCAM_PHRASES = [
  "otp bhejein",
  "khata band",
  "kyc update karen",
  "inaam jeeta hai",
  "lottery lagi hai",
  "paisa double",
  "registration shulk",
  "processing charge",
  "ghar baithe paise kamaye",
];

const HINDI_CLICKBAIT_PHRASES = [
  "sabko bhejo",
  "viral sach",
  "sab dekh rahe hain",
  "breaking khabar",
  "turant dekho",
  "sharmnaak",
];

const FORWARDED_MESSAGE_PHRASES = [
  "forwarded as received",
  "please forward",
  "forward this to",
  "share this message",
  "copy paste karo",
  "sabko bhejdo",
  "send this to all contacts",
  "do not delete",
  "must read and share",
  "janhit mein jaari",
];

const TRUSTED_DOMAINS = [
  "thehindu.com",
  "indianexpress.com",
  "livemint.com",
  "ndtv.com",
  "bbc.com",
  "reuters.com",
  "theprint.in",
  "scroll.in",
  "thewire.in",
  "hindustantimes.com",
  "timesofindia.indiatimes.com",
  "pti.in",
  "ani.in",
  "altnews.in",
  "boomlive.in",
  "factchecker.in",
];

const OFFICIAL_DOMAIN_SUFFIXES = [".gov.in", ".gov", ".edu", ".ac.in"];
const SUSPICIOUS_DOMAINS = ["bit.ly", "tinyurl.com", "goo.gl", "shorturl.at"];
const UPI_REGEX =
  /\b[a-z0-9._-]{2,}@(upi|ybl|ibl|okicici|oksbi|okhdfcbank|paytm|apl)\b/i;

const FLAG_COPY: Record<
  string,
  Omit<FlagInsight, "tag" | "matchedPhrases"> & { fallbackPhrases: string[] }
> = {
  Sensationalism: {
    severity: "medium",
    reason:
      "The wording amplifies surprise or shock, which is commonly used to bypass careful reading.",
    learningNote:
      "Sensational claims often exaggerate weak evidence. Strong reporting usually leads with verifiable facts, not emotional hooks.",
    verificationStep:
      "Look for the same claim reported in neutral language by two independent outlets.",
    fallbackPhrases: ["Sensational wording detected"],
  },
  Clickbait: {
    severity: "high",
    reason:
      "The message uses curiosity or virality prompts designed to push clicks or shares before verification.",
    learningNote:
      "Clickbait works by rewarding fast reactions. Pause when a post tells you how to feel or what to do next.",
    verificationStep:
      "Search the core claim separately instead of trusting the headline framing.",
    fallbackPhrases: ["Clickbait phrasing detected"],
  },
  "Emotional Trigger": {
    severity: "medium",
    reason:
      "Fear, outrage, or anger language can distort how trustworthy a claim feels.",
    learningNote:
      "Emotion can be useful context, but it is a poor substitute for evidence. Separate the feeling from the factual claim.",
    verificationStep:
      "Rewrite the claim in plain terms and verify that stripped-down version.",
    fallbackPhrases: ["Emotional language detected"],
  },
  "Urgency Pressure": {
    severity: "high",
    reason:
      "Urgency cues try to compress decision time so users share or act before thinking.",
    learningNote:
      "Scams and misinformation frequently rely on time pressure because verification takes a moment.",
    verificationStep:
      "Delay action and confirm whether any official source asks for the same urgent step.",
    fallbackPhrases: ["Urgency language detected"],
  },
  "Unverified Language": {
    severity: "medium",
    reason:
      "The post uses rumor or uncertainty markers without showing who actually confirmed the claim.",
    learningNote:
      "Words like 'allegedly' are not proof. They signal that the claim still needs verification.",
    verificationStep:
      "Find the first named source and check whether it published the claim directly.",
    fallbackPhrases: ["Unverified phrasing detected"],
  },
  "Financial Scam Risk": {
    severity: "high",
    reason:
      "The content contains patterns common in payment, OTP, KYC, reward, or investment scams.",
    learningNote:
      "Fraud messages often mix money promises with urgency and vague authority. Legitimate institutions rarely operate that way.",
    verificationStep:
      "Do not share OTP, UPI, bank details, or send money until you verify via official channels.",
    fallbackPhrases: ["Scam indicators detected"],
  },
  "Missing Source": {
    severity: "medium",
    reason:
      "No strong source attribution or evidence trail was found for the main claim.",
    learningNote:
      "If a post cannot show where the information comes from, the burden of proof remains unmet.",
    verificationStep:
      "Ask: who originally said this, where is the source, and can I inspect it directly?",
    fallbackPhrases: ["No clear source attribution found"],
  },
  "Trusted Domain Signal": {
    severity: "low",
    reason:
      "The submitted URL belongs to a domain with stronger institutional or newsroom credibility signals.",
    learningNote:
      "A trusted domain helps, but it is not absolute proof. Articles can still be outdated, incomplete, or misread.",
    verificationStep:
      "Verify the article date and whether the headline matches the full body text.",
    fallbackPhrases: ["Trusted domain detected"],
  },
  "Data Citation": {
    severity: "low",
    reason:
      "The content includes numbers, quotations, or references that make verification easier.",
    learningNote:
      "Specific claims are easier to verify than vague ones. Precision is useful only if the underlying source is real.",
    verificationStep:
      "Trace any statistic or quotation back to the original publication.",
    fallbackPhrases: ["Citation-like evidence detected"],
  },
  "Neutral Tone": {
    severity: "low",
    reason:
      "The language appears relatively neutral and shows fewer obvious persuasion cues.",
    learningNote:
      "Neutral style reduces one type of risk, but evidence quality still matters.",
    verificationStep:
      "Check whether the content links to primary reporting or official data.",
    fallbackPhrases: ["Neutral language signal"],
  },
  "Forwarded Chain Message": {
    severity: "medium",
    reason:
      "The message contains phrasing typical of viral forwards and chain letters.",
    learningNote:
      "Information that asks to be 'forwarded to everyone' often lacks primary source attribution and relies on social pressure.",
    verificationStep:
      "Search for the core message online to see if it is a known hoax or old rumor.",
    fallbackPhrases: ["Chain message indicators detected"],
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeForRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function countPhraseMatches(text: string, phrases: string[]) {
  return phrases.reduce((total, phrase) => {
    const matches = text.match(new RegExp(escapeForRegex(phrase), "g"));
    return total + (matches?.length || 0);
  }, 0);
}

function collectMatchedPhrases(text: string, phrases: string[]) {
  return phrases.filter((phrase) => text.includes(phrase));
}

function countRegexMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length || 0;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function detectManipulationLevel(score: number): ManipulationLevel {
  if (score >= 65) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function getDomainFromUrl(rawUrl: string) {
  if (!rawUrl) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function htmlToText(html: string) {
  return normalizeSpace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}

async function fetchTextFromUrl(
  rawUrl: string,
): Promise<{ text: string; fetchFailed: boolean }> {
  if (!rawUrl) return { text: "", fetchFailed: false };

  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    const response = await fetch(withProtocol, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "TruthGuardPrototype/1.0" },
    });

    if (!response.ok) return { text: "", fetchFailed: true };

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      return { text: "", fetchFailed: true };
    }

    const raw = await response.text();
    const cleaned = contentType.includes("text/html")
      ? htmlToText(raw)
      : normalizeSpace(raw);
    return { text: cleaned.slice(0, 8000), fetchFailed: false };
  } catch {
    return { text: "", fetchFailed: true };
  }
}

function extractClaims(input: string) {
  const sentences = normalizeSpace(input)
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 40);

  if (sentences.length > 0) return sentences.slice(0, 3);
  if (!input.trim()) return [];
  return [input.trim().slice(0, 180)];
}

function buildSummary(params: {
  positiveSignals: string[];
  riskSignals: string[];
  contradictingMatches: FactCheckMatch[];
  supportingMatches: FactCheckMatch[];
  extractedFromUrl: boolean;
}) {
  if (params.contradictingMatches.length > 0) {
    const publishers = dedupe(
      params.contradictingMatches.map((match) => match.publisher),
    )
      .slice(0, 2)
      .join(", ");
    return `External fact checks from ${publishers || "tracked sources"} contradict the core claim, and the text also shows elevated misinformation risk signals.`;
  }

  if (params.supportingMatches.length > 0 && params.riskSignals.length === 0) {
    const publishers = dedupe(
      params.supportingMatches.map((match) => match.publisher),
    )
      .slice(0, 2)
      .join(", ");
    return `External fact checks from ${publishers || "tracked sources"} support the core claim, and the content shows comparatively healthier source signals.`;
  }

  const positives = params.positiveSignals.slice(0, 2).join(", ");
  const risks = params.riskSignals.slice(0, 3).join(", ");

  if (params.riskSignals.length === 0 && params.positiveSignals.length > 0) {
    return `Detected stronger source quality signals (${positives}) with limited manipulation cues.`;
  }

  if (params.positiveSignals.length === 0 && params.riskSignals.length > 0) {
    return `Detected multiple risk signals (${risks}) with little verifiable source context.`;
  }

  if (params.extractedFromUrl) {
    return `Combined URL content with direct text signals. Positive cues: ${positives || "limited"}. Risk cues: ${risks || "limited"}.`;
  }

  return `Mixed signal profile. Positive cues: ${positives || "limited"}. Risk cues: ${risks || "limited"}.`;
}

function buildEducation(
  score: number,
  manipulationLevel: ManipulationLevel,
  factChecks: FactCheckMatch[],
) {
  const hasFalseMatches = factChecks.some(
    (match) => match.verdict === "contradicting",
  );

  if (hasFalseMatches) {
    return "External fact-check coverage contradicts at least part of the claim. Treat this as high-risk and inspect the linked reviews before sharing or acting on it.";
  }

  if (score >= 75) {
    return "This content shows stronger evidence and weaker manipulation patterns, but it still deserves a quick date and context check before sharing.";
  }

  if (score <= 35 || manipulationLevel === "HIGH") {
    return "This content shows heavy persuasion pressure and weak evidence signals. Treat it as high-risk until confirmed by primary sources or trusted fact-check outlets.";
  }

  return "This content has mixed reliability. Some elements may be factual, but important details are not strongly supported. Verify core claims before forwarding.";
}

function buildVerificationTips(params: {
  suspiciousDomain: boolean;
  scamRiskActive: boolean;
  uncertaintyHits: number;
  missingSource: boolean;
  factChecks: FactCheckMatch[];
}) {
  const tips = [
    "Verify the claim on at least two independent and credible sources.",
    "Check publication date, author, and whether the source links primary evidence.",
  ];

  if (params.factChecks.length === 0) {
    tips.push(
      "Search the claim on Alt News, BOOM, PIB Fact Check, or Google Fact Check results.",
    );
  }

  if (params.suspiciousDomain) {
    tips.push(
      "Be careful with shortened or unfamiliar links. Inspect the domain and source metadata before trusting the claim.",
    );
  }

  if (params.scamRiskActive) {
    tips.push(
      "Do not share OTP, UPI, bank details, or send money based on this message.",
    );
  }

  if (params.uncertaintyHits > 0 || params.missingSource) {
    tips.push(
      "Treat unverified or source-free claims as pending, not factual, until official confirmation appears.",
    );
  }

  return dedupe(tips).slice(0, 5);
}

function labelImpact(score: number) {
  if (score >= 65) return "positive" as const;
  if (score <= 35) return "negative" as const;
  return "mixed" as const;
}

function contributionFromScore(score: number, weight: number) {
  return Math.round(((score - 50) / 50) * weight * 100);
}

function classifyClaimVerdict(
  supporting: EvidenceItem[],
  contradicting: EvidenceItem[],
  insufficient: EvidenceItem[],
): EvidenceVerdict {
  if (contradicting.length > 0) return "contradicting";
  if (supporting.length > 0 && insufficient.length === 0) return "supporting";
  return "insufficient";
}

function overlapScore(left: string, right: string) {
  const leftTokens = normalizeSpace(left)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);
  const rightTokens = new Set(
    normalizeSpace(right)
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2),
  );

  if (leftTokens.length === 0 || rightTokens.size === 0) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.has(token)).length;
  return Math.round((overlap / leftTokens.length) * 100);
}

function buildEvidenceItemFromFactCheck(match: FactCheckMatch): EvidenceItem {
  return {
    label: match.title,
    source: match.publisher,
    url: match.url,
    verdict: match.verdict,
    note: `${match.textualRating}. Match strength: ${match.matchStrength}%.`,
  };
}

function buildClaimEvidence(
  claims: string[],
  factChecks: FactCheckMatch[],
  rawUrl: string,
) {
  const domain = getDomainFromUrl(rawUrl);

  return claims.map((claim) => {
    const relevantMatches = factChecks
      .filter(
        (match) =>
          match.matchStrength >= 35 ||
          overlapScore(claim, `${match.claimText} ${match.title}`) >= 35,
      )
      .slice(0, 4);

    const supporting = relevantMatches
      .filter((match) => match.verdict === "supporting")
      .map(buildEvidenceItemFromFactCheck);
    const contradicting = relevantMatches
      .filter((match) => match.verdict === "contradicting")
      .map(buildEvidenceItemFromFactCheck);
    const insufficient = relevantMatches
      .filter((match) => match.verdict === "insufficient")
      .map(buildEvidenceItemFromFactCheck);

    if (rawUrl) {
      insufficient.unshift({
        label: "Original submitted source",
        source: domain || "Submitted URL",
        url: /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`,
        verdict: "insufficient",
        note: "Inspect the original source and compare it with independent reporting.",
      });
    }

    if (supporting.length + contradicting.length + insufficient.length < 2) {
      buildOfficialSourceLinks(claim)
        .slice(0, 3)
        .forEach((link) => {
          insufficient.push({
            label: link.label,
            source: link.source,
            url: link.url,
            verdict: "insufficient",
            note: link.description,
          });
        });
    }

    return {
      claim,
      verdict: classifyClaimVerdict(supporting, contradicting, insufficient),
      supporting,
      contradicting,
      insufficient,
    } satisfies ClaimEvidence;
  });
}

function buildFlagInsights(
  tags: string[],
  matchedPhrases: Record<string, string[]>,
) {
  return tags
    .map((tag) => {
      const copy = FLAG_COPY[tag];
      if (!copy) return null;

      return {
        tag,
        severity: copy.severity,
        reason: copy.reason,
        matchedPhrases: matchedPhrases[tag]?.length
          ? matchedPhrases[tag]
          : copy.fallbackPhrases,
        learningNote: copy.learningNote,
        verificationStep: copy.verificationStep,
      } satisfies FlagInsight;
    })
    .filter(Boolean) as FlagInsight[];
}

function buildScamRiskAnalysis(params: {
  scamRiskScore: number;
  matchedScamPhrases: string[];
  suspiciousDomain: boolean;
  otpSignal: boolean;
  upiSignal: boolean;
  bankingSignal: boolean;
  investmentSignal: boolean;
  jobSignal: boolean;
  rewardSignal: boolean;
}) {
  const categories: string[] = [];
  if (params.bankingSignal) categories.push("Banking / KYC");
  if (params.upiSignal) categories.push("UPI / Wallet");
  if (params.investmentSignal) categories.push("Investment / Crypto");
  if (params.jobSignal) categories.push("Job / Fee Fraud");
  if (params.rewardSignal) categories.push("Reward / Refund");

  const indicators = dedupe([
    ...params.matchedScamPhrases,
    ...(params.otpSignal ? ["OTP request detected"] : []),
    ...(params.upiSignal ? ["UPI or collect-request pattern detected"] : []),
    ...(params.suspiciousDomain
      ? ["Suspicious or shortened domain detected"]
      : []),
  ]);

  const actions = [
    "Pause before making any payment or sharing credentials.",
    "Verify the organization using its official website or app, not the message link.",
  ];

  if (params.otpSignal || params.bankingSignal) {
    actions.push(
      "Never share OTP, PIN, card, or banking credentials over chat or phone.",
    );
  }

  if (params.upiSignal) {
    actions.push(
      "Reject unexpected UPI collect requests and confirm the recipient independently.",
    );
  }

  if (params.investmentSignal) {
    actions.push(
      "Treat guaranteed returns or pressure to invest immediately as a fraud red flag.",
    );
  }

  return {
    active: params.scamRiskScore >= 35,
    level: detectManipulationLevel(params.scamRiskScore),
    score: params.scamRiskScore,
    categories: dedupe(categories),
    indicators,
    actions: dedupe(actions).slice(0, 4),
  } satisfies ScamRiskAnalysis;
}

function buildTimeline(params: {
  sourceQuality: number;
  claimSpecificity: number;
  recencyContext: number;
  manipulationResilience: number;
  scamResilience: number;
  factChecks: FactCheckMatch[];
  trustScore: number;
}) {
  const stageSource = clamp(
    Math.round(
      50 +
        (params.sourceQuality - 50) * 0.55 +
        (params.claimSpecificity - 50) * 0.25 +
        (params.recencyContext - 50) * 0.2,
    ),
    1,
    99,
  );

  const stageRisk = clamp(
    Math.round(
      stageSource +
        (params.manipulationResilience - 50) * 0.35 +
        (params.scamResilience - 50) * 0.3,
    ),
    1,
    99,
  );

  const contradictoryMatches = params.factChecks.filter(
    (match) => match.verdict === "contradicting",
  ).length;
  const supportingMatches = params.factChecks.filter(
    (match) => match.verdict === "supporting",
  ).length;

  const stageFactCheck = clamp(
    Math.round(stageRisk + supportingMatches * 7 - contradictoryMatches * 10),
    1,
    99,
  );

  return [
    {
      label: "Baseline",
      step: "Submission received",
      score: 50,
      note: "TruthGuard starts from a neutral baseline before applying evidence.",
    },
    {
      label: "Source Scan",
      step: "Source quality and claim context",
      score: stageSource,
      note: "Domain, citations, attribution, and specificity adjust the baseline.",
    },
    {
      label: "Risk Screen",
      step: "Manipulation and scam pressure",
      score: stageRisk,
      note: "Language manipulation and fraud indicators push the score up or down.",
    },
    {
      label: "Fact Check",
      step: "External verification lookup",
      score: stageFactCheck,
      note:
        params.factChecks.length > 0
          ? `${params.factChecks.length} live fact-check matches were considered.`
          : "No live fact-check match changed the score this round.",
    },
    {
      label: "Current Trust",
      step: "Final verdict",
      score: params.trustScore,
      note: "Final trust score after weighted scoring and external evidence adjustments.",
    },
  ] satisfies TrustTimelinePoint[];
}

export async function analyzeSubmission(
  input: AnalyzeRequest,
): Promise<AnalysisResult> {
  const rawText = (input.text || "").trim();
  const rawUrl = (input.url || "").trim();
  const inputMode =
    rawText && rawUrl ? "hybrid" : rawUrl ? "url" : ("text" as const);

  const { text: fetchedText, fetchFailed } = rawUrl
    ? await fetchTextFromUrl(rawUrl)
    : { text: "", fetchFailed: false };
  const extractedFromUrl = Boolean(fetchedText);
  const analysisText = normalizeSpace(
    [rawText, fetchedText].filter(Boolean).join(" "),
  );
  const combinedText = normalizeSpace(
    [analysisText, rawUrl].filter(Boolean).join(" "),
  );
  const loweredText = combinedText.toLowerCase();
  const domain = getDomainFromUrl(rawUrl);

  const extractedClaims = extractClaims(
    analysisText || rawText || combinedText,
  );
  const factCheckQuery =
    extractedClaims[0] ||
    rawText.slice(0, 180) ||
    fetchedText.slice(0, 180) ||
    rawUrl;

  const {
    matches: factChecks,
    warnings: factCheckWarnings,
    resolvedQuery: factCheckSearchQuery,
    attemptedQueries: attemptedFactCheckQueries,
  } = await getFactCheckMatches(factCheckQuery);

  const sourceHits = countPhraseMatches(loweredText, SOURCE_KEYWORDS);
  const sensationalHits =
    countPhraseMatches(loweredText, SENSATIONAL_PHRASES) +
    countPhraseMatches(loweredText, HINDI_SENSATIONAL_PHRASES);
  const clickbaitHits =
    countPhraseMatches(loweredText, CLICKBAIT_PHRASES) +
    countPhraseMatches(loweredText, HINDI_CLICKBAIT_PHRASES);
  const emotionalHits = countPhraseMatches(loweredText, EMOTIONAL_PHRASES);
  const urgencyHits =
    countPhraseMatches(loweredText, URGENCY_PHRASES) +
    countPhraseMatches(loweredText, HINDI_URGENCY_PHRASES);
  const uncertaintyHits = countPhraseMatches(loweredText, UNCERTAINTY_PHRASES);
  const scamHits =
    countPhraseMatches(loweredText, SCAM_PHRASES) +
    countPhraseMatches(loweredText, HINDI_SCAM_PHRASES);
  const forwardedHits = countPhraseMatches(
    loweredText,
    FORWARDED_MESSAGE_PHRASES,
  );
  const linkHits = countRegexMatches(combinedText, /https?:\/\/[^\s]+/g);
  const numberHits = countRegexMatches(combinedText, /\b\d{2,}\b/g);
  const quoteHits = countRegexMatches(combinedText, /"[^"]{8,}"/g);
  const exclamationHits = countRegexMatches(combinedText, /!/g);
  const hasDateSignal =
    countRegexMatches(
      loweredText,
      /\b(\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d{4})\b/g,
    ) > 0;

  const uppercaseLetters = countRegexMatches(combinedText, /[A-Z]/g);
  const alphaLetters = countRegexMatches(combinedText, /[A-Za-z]/g);
  const uppercaseRatio = alphaLetters > 0 ? uppercaseLetters / alphaLetters : 0;

  const otpSignal = /\botp\b|\bone time password\b/i.test(loweredText);
  const upiSignal =
    /\bupi\b|\bqr code\b|\bcollect request\b/i.test(loweredText) ||
    UPI_REGEX.test(combinedText);
  const bankingSignal =
    /\bkyc\b|\bbank account\b|\baccount frozen\b|\bverify account\b/i.test(
      loweredText,
    );
  const investmentSignal =
    /\binvestment\b|\bcrypto\b|\bstock tip\b|\btrading\b|\bdouble your money\b/i.test(
      loweredText,
    );
  const jobSignal =
    /\bjob offer\b|\bwork from home\b|\bregistration fee\b|\binterview fee\b/i.test(
      loweredText,
    );
  const rewardSignal =
    /\blottery\b|\breward\b|\bprize\b|\brefund\b|\bgift\b/i.test(loweredText);

  const forwardedMessageSignal = forwardedHits > 0;

  const officialDomain = Boolean(
    domain &&
    OFFICIAL_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix)),
  );
  const trustedDomain = Boolean(
    domain &&
    (TRUSTED_DOMAINS.some(
      (known) => domain === known || domain.endsWith(`.${known}`),
    ) ||
      officialDomain),
  );
  const suspiciousDomain = Boolean(
    domain &&
    (SUSPICIOUS_DOMAINS.some(
      (known) => domain === known || domain.endsWith(`.${known}`),
    ) ||
      domain.split("-").length > 3),
  );

  const citationHits = linkHits + Math.min(numberHits, 3) + quoteHits;
  const missingSource =
    sourceHits === 0 && citationHits === 0 && !trustedDomain;
  const matchedSensationalPhrases = dedupe([
    ...collectMatchedPhrases(loweredText, SENSATIONAL_PHRASES),
    ...collectMatchedPhrases(loweredText, HINDI_SENSATIONAL_PHRASES),
  ]);
  const matchedClickbaitPhrases = dedupe([
    ...collectMatchedPhrases(loweredText, CLICKBAIT_PHRASES),
    ...collectMatchedPhrases(loweredText, HINDI_CLICKBAIT_PHRASES),
  ]);
  const matchedEmotionalPhrases = collectMatchedPhrases(
    loweredText,
    EMOTIONAL_PHRASES,
  );
  const matchedUrgencyPhrases = dedupe([
    ...collectMatchedPhrases(loweredText, URGENCY_PHRASES),
    ...collectMatchedPhrases(loweredText, HINDI_URGENCY_PHRASES),
  ]);
  const matchedUncertaintyPhrases = collectMatchedPhrases(
    loweredText,
    UNCERTAINTY_PHRASES,
  );
  const matchedForwardedPhrases = collectMatchedPhrases(
    loweredText,
    FORWARDED_MESSAGE_PHRASES,
  );
  const matchedScamPhrases = dedupe([
    ...collectMatchedPhrases(loweredText, SCAM_PHRASES),
    ...collectMatchedPhrases(loweredText, HINDI_SCAM_PHRASES),
    ...(otpSignal ? ["otp"] : []),
    ...(upiSignal ? ["upi / collect request"] : []),
    ...(bankingSignal ? ["kyc / bank account"] : []),
    ...(investmentSignal ? ["investment promise"] : []),
    ...(jobSignal ? ["job fee request"] : []),
    ...(rewardSignal ? ["reward / refund hook"] : []),
  ]);

  let manipulationScore = 0;
  manipulationScore += sensationalHits * 12;
  manipulationScore += clickbaitHits * 14;
  manipulationScore += emotionalHits * 8;
  manipulationScore += urgencyHits * 10;
  manipulationScore += uncertaintyHits * 6;
  manipulationScore += Math.min(exclamationHits, 6) * 3;
  manipulationScore += forwardedHits * 10;
  manipulationScore += uppercaseRatio > 0.3 ? 12 : uppercaseRatio > 0.2 ? 6 : 0;
  manipulationScore += factChecks.some(
    (match) => match.verdict === "contradicting",
  )
    ? 10
    : 0;
  manipulationScore = clamp(Math.round(manipulationScore), 0, 100);

  let scamRiskScore = 0;
  scamRiskScore += scamHits * 16;
  scamRiskScore += otpSignal ? 18 : 0;
  scamRiskScore += upiSignal ? 14 : 0;
  scamRiskScore += bankingSignal ? 14 : 0;
  scamRiskScore += investmentSignal ? 18 : 0;
  scamRiskScore += jobSignal ? 16 : 0;
  scamRiskScore += rewardSignal ? 12 : 0;
  scamRiskScore += suspiciousDomain ? 14 : 0;
  scamRiskScore += urgencyHits * 5;
  scamRiskScore = clamp(Math.round(scamRiskScore), 0, 100);

  const supportingMatches = factChecks.filter(
    (match) => match.verdict === "supporting",
  );
  const contradictingMatches = factChecks.filter(
    (match) => match.verdict === "contradicting",
  );

  const sourceQuality = clamp(
    25 +
      sourceHits * 8 +
      citationHits * 8 +
      (trustedDomain ? 22 : 0) +
      (officialDomain ? 10 : 0) -
      (missingSource ? 18 : 0) -
      (suspiciousDomain ? 16 : 0),
    0,
    100,
  );

  const crossSourceAgreement = clamp(
    factChecks.length > 0
      ? supportingMatches.length > 0 && contradictingMatches.length === 0
        ? 82
        : contradictingMatches.length > 0 && supportingMatches.length === 0
          ? 18
          : supportingMatches.length > 0 && contradictingMatches.length > 0
            ? 38
            : 48
      : 45 + sourceHits * 5 + citationHits * 4 - uncertaintyHits * 4,
    0,
    100,
  );

  const claimSpecificity = clamp(
    35 +
      Math.min(numberHits, 4) * 9 +
      (extractedClaims.length > 0 ? 10 : 0) +
      (quoteHits > 0 ? 10 : 0) +
      (hasDateSignal ? 8 : 0) -
      uncertaintyHits * 5,
    0,
    100,
  );

  const recentFactCheck = factChecks.some((match) => {
    if (!match.reviewDate) return false;
    const reviewTime = Date.parse(match.reviewDate);
    if (Number.isNaN(reviewTime)) return false;
    return Date.now() - reviewTime < 1000 * 60 * 60 * 24 * 365;
  });

  const recencyContext = clamp(
    35 +
      (hasDateSignal ? 15 : 0) +
      (extractedFromUrl ? 8 : 0) +
      (recentFactCheck ? 18 : factChecks.length > 0 ? 10 : 0),
    0,
    100,
  );

  const manipulationResilience = clamp(100 - manipulationScore, 0, 100);
  const scamResilience = clamp(100 - scamRiskScore, 0, 100);

  let trustScore = Math.round(
    sourceQuality * 0.28 +
      crossSourceAgreement * 0.22 +
      claimSpecificity * 0.14 +
      recencyContext * 0.1 +
      manipulationResilience * 0.16 +
      scamResilience * 0.1,
  );

  const highConfidenceContradiction = contradictingMatches.some(
    (match) => match.matchStrength >= 45,
  );
  const highConfidenceSupport = supportingMatches.some(
    (match) => match.matchStrength >= 45,
  );

  if (highConfidenceContradiction) {
    trustScore = Math.min(trustScore, 34);
  }

  if (highConfidenceSupport && !highConfidenceContradiction) {
    trustScore = Math.max(trustScore, 72);
  }

  if (scamRiskScore >= 65) {
    trustScore = Math.min(trustScore, 28);
  }

  trustScore = clamp(trustScore, 1, 99);

  const manipulationLevel = detectManipulationLevel(manipulationScore);
  const tags: string[] = [];
  if (sensationalHits > 0) tags.push("Sensationalism");
  if (clickbaitHits > 0) tags.push("Clickbait");
  if (emotionalHits > 0) tags.push("Emotional Trigger");
  if (urgencyHits > 0) tags.push("Urgency Pressure");
  if (uncertaintyHits > 0) tags.push("Unverified Language");
  if (scamRiskScore >= 35) tags.push("Financial Scam Risk");
  if (missingSource) tags.push("Missing Source");
  if (trustedDomain) tags.push("Trusted Domain Signal");
  if (citationHits > 0) tags.push("Data Citation");
  if (forwardedMessageSignal) tags.push("Forwarded Chain Message");
  if (tags.length === 0) tags.push("Neutral Tone");

  const matchedPhrases: Record<string, string[]> = {
    Sensationalism: matchedSensationalPhrases,
    Clickbait: matchedClickbaitPhrases,
    "Emotional Trigger": matchedEmotionalPhrases,
    "Urgency Pressure": matchedUrgencyPhrases,
    "Unverified Language": matchedUncertaintyPhrases,
    "Financial Scam Risk": matchedScamPhrases,
    "Forwarded Chain Message": matchedForwardedPhrases,
    "Missing Source": missingSource
      ? ["No attributed source or citation detected"]
      : [],
    "Trusted Domain Signal": domain ? [`domain: ${domain}`] : [],
    "Data Citation":
      citationHits > 0
        ? ["numbers, quotes, or links were detected in the content"]
        : [],
    "Neutral Tone": ["low explicit persuasion pressure"],
  };

  const sourceSignals: string[] = [];
  if (trustedDomain && domain) sourceSignals.push(`Domain signal: ${domain}`);
  if (officialDomain)
    sourceSignals.push("Official or institutional domain detected");
  if (citationHits > 0)
    sourceSignals.push("Citation and numeric context detected");
  if (sourceHits > 0) sourceSignals.push("Source language detected");
  if (missingSource) sourceSignals.push("No strong source attribution found");
  if (extractedFromUrl)
    sourceSignals.push("Article text extracted from provided URL");
  if (factChecks.length > 0) {
    sourceSignals.push(
      `${factChecks.length} live fact-check matches retrieved`,
    );
  } else {
    sourceSignals.push(
      attemptedFactCheckQueries.length > 1
        ? `No live fact-check match after retrying ${attemptedFactCheckQueries.length} query variants`
        : "No live fact-check match returned",
    );
  }
  if (attemptedFactCheckQueries.length > 1) {
    sourceSignals.push(
      `Fact-check lookup retried with ${attemptedFactCheckQueries.length} query variants`,
    );
  }
  if (rawUrl && !extractedFromUrl && !rawText) {
    sourceSignals.push(
      "URL body unavailable, score based on domain and available text only",
    );
  }

  const positiveSignals: string[] = [];
  if (trustedDomain) positiveSignals.push("known domain");
  if (sourceHits > 0) positiveSignals.push("source references");
  if (citationHits > 0) positiveSignals.push("citations or numeric evidence");
  if (hasDateSignal) positiveSignals.push("date context");
  if (supportingMatches.length > 0)
    positiveSignals.push("supportive fact-check coverage");

  const riskSignals: string[] = [];
  if (sensationalHits > 0) riskSignals.push("sensational wording");
  if (clickbaitHits > 0) riskSignals.push("clickbait framing");
  if (emotionalHits > 0) riskSignals.push("emotional pressure");
  if (urgencyHits > 0) riskSignals.push("urgency language");
  if (uncertaintyHits > 0) riskSignals.push("unverified phrasing");
  if (missingSource) riskSignals.push("missing source attribution");
  if (suspiciousDomain) riskSignals.push("suspicious link domain");
  if (contradictingMatches.length > 0)
    riskSignals.push("contradicting fact-check coverage");
  if (scamRiskScore >= 35) riskSignals.push("scam patterns");

  const scenario = domain
    ? `Live analysis for content linked to ${domain}`
    : "Live analysis for submitted text";

  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      key: "source-quality",
      label: "Source Quality",
      score: sourceQuality,
      contribution: contributionFromScore(sourceQuality, 0.28),
      impact: labelImpact(sourceQuality),
      summary:
        "Assesses domain trust, source attribution, and citation density.",
    },
    {
      key: "cross-source",
      label: "Cross-Source Agreement",
      score: crossSourceAgreement,
      contribution: contributionFromScore(crossSourceAgreement, 0.22),
      impact: labelImpact(crossSourceAgreement),
      summary:
        "Measures whether live fact-check coverage supports or contradicts the claim.",
    },
    {
      key: "claim-specificity",
      label: "Claim Verifiability",
      score: claimSpecificity,
      contribution: contributionFromScore(claimSpecificity, 0.14),
      impact: labelImpact(claimSpecificity),
      summary:
        "Specific, dated, and quotable claims are easier to verify than vague ones.",
    },
    {
      key: "recency-context",
      label: "Recency & Context",
      score: recencyContext,
      contribution: contributionFromScore(recencyContext, 0.1),
      impact: labelImpact(recencyContext),
      summary:
        "Looks for date context, article extraction, and recent external reviews.",
    },
    {
      key: "manipulation-resilience",
      label: "Manipulation Risk",
      score: manipulationResilience,
      contribution: contributionFromScore(manipulationResilience, 0.16),
      impact: labelImpact(manipulationResilience),
      summary:
        "Penalizes sensational, emotional, urgent, and clickbait framing.",
    },
    {
      key: "scam-resilience",
      label: "Scam Risk",
      score: scamResilience,
      contribution: contributionFromScore(scamResilience, 0.1),
      impact: labelImpact(scamResilience),
      summary:
        "Flags OTP, UPI, KYC, fee, investment, and reward fraud patterns.",
    },
  ];

  const officialSourceLinks = buildOfficialSourceLinks(factCheckSearchQuery);
  const claimEvidence = buildClaimEvidence(extractedClaims, factChecks, rawUrl);
  const flagInsights = buildFlagInsights(dedupe(tags), matchedPhrases);
  const scamRisk = buildScamRiskAnalysis({
    scamRiskScore,
    matchedScamPhrases,
    suspiciousDomain,
    otpSignal,
    upiSignal,
    bankingSignal,
    investmentSignal,
    jobSignal,
    rewardSignal,
  });
  const trustTimeline = buildTimeline({
    sourceQuality,
    claimSpecificity,
    recencyContext,
    manipulationResilience,
    scamResilience,
    factChecks,
    trustScore,
  });

  const analysisId = crypto.randomUUID();
  const feedbackSummary = await getFeedbackSummary(analysisId);
  const warnings = dedupe([
    ...factCheckWarnings,
    ...(rawUrl && !extractedFromUrl
      ? ["Unable to extract readable article body from the submitted URL."]
      : []),
    ...(fetchFailed && !rawText
      ? ["Source URL could not be reached and no backup text was provided."]
      : []),
  ]);

  return {
    analysisId,
    inputMode,
    scenario,
    trustScore,
    manipulationLevel,
    tags: dedupe(tags),
    summary: buildSummary({
      positiveSignals,
      riskSignals,
      contradictingMatches,
      supportingMatches,
      extractedFromUrl,
    }),
    education: buildEducation(trustScore, manipulationLevel, factChecks),
    verificationTips: buildVerificationTips({
      suspiciousDomain,
      scamRiskActive: scamRisk.active,
      uncertaintyHits,
      missingSource,
      factChecks,
    }),
    extractedClaims,
    sourceSignals: dedupe(sourceSignals),
    scoreBreakdown,
    factChecks,
    officialSourceLinks,
    claimEvidence,
    flagInsights,
    scamRisk,
    trustTimeline,
    feedbackSummary,
    warnings,
  };
}
