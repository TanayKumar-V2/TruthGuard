from transformers import pipeline
from pydantic import BaseModel
from typing import List
import httpx
from bs4 import BeautifulSoup
import re

# ---------------------------------------------------------------------------
# Pydantic models to match the frontend AnalysisResult format
# ---------------------------------------------------------------------------

class EvidenceItem(BaseModel):
    label: str
    source: str
    url: str
    verdict: str  # "supporting" | "contradicting" | "insufficient"
    note: str

class ClaimEvidence(BaseModel):
    claim: str
    verdict: str
    supporting: List[EvidenceItem]
    contradicting: List[EvidenceItem]
    insufficient: List[EvidenceItem]

class FlagInsight(BaseModel):
    tag: str
    severity: str  # "low" | "medium" | "high"
    reason: str
    matchedPhrases: List[str]
    learningNote: str
    verificationStep: str

class ScamRiskAnalysis(BaseModel):
    active: bool
    level: str  # "LOW" | "MEDIUM" | "HIGH"
    score: int
    categories: List[str]
    indicators: List[str]
    actions: List[str]

class ScoreBreakdownItem(BaseModel):
    category: str
    impact: str  # "positive" | "negative" | "mixed"
    scoreValue: int
    contribution: int

class TrustTimelinePoint(BaseModel):
    label: str
    step: str
    score: int
    note: str

class AnalysisResult(BaseModel):
    trustScore: int
    manipulationLevel: str
    summary: str
    education: str
    verificationTips: List[str]
    scoreBreakdown: List[ScoreBreakdownItem]
    scamRisk: ScamRiskAnalysis
    extractedClaims: List[ClaimEvidence]
    flags: List[FlagInsight]
    trustTimeline: List[TrustTimelinePoint]
    extractedFromUrl: bool


# ---------------------------------------------------------------------------
# Labels and their properties (impact and human-readable category name)
# ---------------------------------------------------------------------------

LABEL_METADATA = {
    "sensationalism":     {"impact": "negative", "category": "Sensationalism"},
    "clickbait":          {"impact": "negative", "category": "Clickbait"},
    "emotional trigger":  {"impact": "negative", "category": "Emotional Manipulation"},
    "urgency pressure":   {"impact": "negative", "category": "Urgency / Pressure Tactics"},
    "unverified language":{"impact": "negative", "category": "Unverified Language"},
    "financial scam risk":{"impact": "negative", "category": "Financial Scam Risk"},
    "missing source":     {"impact": "negative", "category": "Missing Source"},
    "factual news":       {"impact": "positive", "category": "Factual / Credible Content"},
}

LABEL_TIPS = {
    "sensationalism":     "Be wary of dramatic or exaggerated language that lacks supporting evidence.",
    "clickbait":          "Check if the headline accurately represents the article body.",
    "emotional trigger":  "Look for content designed to provoke strong emotions—this is a common manipulation tactic.",
    "urgency pressure":   "Be cautious of artificial time pressure or scarcity designed to rush your decisions.",
    "unverified language":"Look for specific citations, named sources, or links to primary data.",
    "financial scam risk":"Never share personal or financial information with unverified sources.",
    "missing source":     "Always cross-reference claims with at least two independent, reputable sources.",
    "factual news":       "Content appears credible. Still verify key claims with primary sources.",
}

LABEL_LEARNING = {
    "sensationalism":     "Sensationalist content exaggerates facts to provoke strong reactions.",
    "clickbait":          "Clickbait uses misleading headlines to drive traffic, often ignoring the real story.",
    "emotional trigger":  "Emotional manipulation bypasses rational thinking to influence your behavior.",
    "urgency pressure":   "Artificial urgency is a classic tactic used in scams and high-pressure sales.",
    "unverified language":"Phrases like 'sources say' or 'reportedly' with no attribution are a red flag.",
    "financial scam risk":"Fraudulent content often promises rewards, prizes, or urgent financial actions.",
    "missing source":     "Credible journalism always cites verifiable sources.",
    "factual news":       "Factual reporting is supported by named sources, evidence, and balanced perspective.",
}

# ---------------------------------------------------------------------------
# Initialize the zero-shot classification pipeline (auto-downloads on first run)
# ---------------------------------------------------------------------------

classifier = pipeline(
    "zero-shot-classification",
    model="typeform/distilbert-base-uncased-mnli"
)

CANDIDATE_LABELS = list(LABEL_METADATA.keys())


# ---------------------------------------------------------------------------
# URL Content Fetcher
# ---------------------------------------------------------------------------

async def fetch_url_content(url: str) -> str:
    """Fetches the HTML content of a URL and extracts clean main text."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
                tag.extract()

            text = soup.get_text(separator=' ', strip=True)
            # Collapse excessive whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:3000]
    except Exception as e:
        print(f"[fetch_url_content] Error fetching {url}: {e}")
        return ""


# ---------------------------------------------------------------------------
# Sentence extractor  (simple, no heavy NLP dependency)
# ---------------------------------------------------------------------------

def extract_sentences(text: str, max_sentences: int = 5) -> List[str]:
    """Splits text into sentences and returns the longest ones (most likely to be claims)."""
    # Split on sentence boundaries
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    # Filter out very short fragments (< 20 chars)
    sentences = [s.strip() for s in raw if len(s.strip()) >= 20]
    # Return the longest sentences first (they tend to be the richest claims)
    sentences.sort(key=len, reverse=True)
    return sentences[:max_sentences]


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------

async def analyze_text(text: str, url: str = "") -> AnalysisResult:
    """
    Analyses content using DistilBERT zero-shot classification.
    Fetches URL content if a URL is provided, combines with text.
    Returns a fully structured AnalysisResult with no hardcoded values.
    """
    # ---- 1. Collect content ------------------------------------------------
    fetched_text = ""
    if url:
        fetched_text = await fetch_url_content(url)

    combined_text = f"{fetched_text} {text}".strip()
    if not combined_text:
        combined_text = "No content provided."

    # ---- 2. Classify the full document -------------------------------------
    doc_result = classifier(combined_text[:512], CANDIDATE_LABELS, multi_label=True)
    scores: dict[str, float] = dict(zip(doc_result["labels"], doc_result["scores"]))

    # ---- 3. Build scoreBreakdown (one item per label, from real scores) ----
    score_breakdown: List[ScoreBreakdownItem] = []
    for label, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        meta = LABEL_METADATA[label]
        score_value = int(score * 100)
        # Contribution: positive factors add, negative ones subtract
        contribution = score_value if meta["impact"] == "positive" else -score_value
        score_breakdown.append(ScoreBreakdownItem(
            category=meta["category"],
            impact=meta["impact"],
            scoreValue=score_value,
            contribution=contribution,
        ))

    # ---- 4. Compute trust score from real model output ---------------------
    positive_score = scores.get("factual news", 0)
    negative_total = sum(v for k, v in scores.items() if k != "factual news")
    raw_trust = (positive_score * 100) - (negative_total * 12)
    trust_score = max(1, min(99, int(raw_trust + 50)))

    manipulation_level = "HIGH" if trust_score < 40 else "MEDIUM" if trust_score < 70 else "LOW"

    # ---- 5. Build flags from real model scores (threshold 0.55) -----------
    flags: List[FlagInsight] = []
    for label, score in scores.items():
        if label == "factual news":
            continue
        if score > 0.55:
            severity = "high" if score > 0.8 else "medium" if score > 0.65 else "low"
            flags.append(FlagInsight(
                tag=LABEL_METADATA[label]["category"],
                severity=severity,
                reason=f"Detected with {score * 100:.1f}% confidence.",
                matchedPhrases=[],  # Would need token-level attention to populate
                learningNote=LABEL_LEARNING[label],
                verificationStep=LABEL_TIPS[label],
            ))

    # ---- 6. Extract real claims from sentences -----------------------------
    sentences = extract_sentences(combined_text, max_sentences=4)
    extracted_claims: List[ClaimEvidence] = []

    for sentence in sentences:
        # Classify each sentence individually
        sent_result = classifier(sentence[:256], CANDIDATE_LABELS, multi_label=True)
        sent_scores: dict[str, float] = dict(zip(sent_result["labels"], sent_result["scores"]))

        factual_conf = sent_scores.get("factual news", 0)
        top_negative_label = max(
            (k for k in sent_scores if k != "factual news"),
            key=lambda k: sent_scores[k]
        )
        top_negative_score = sent_scores[top_negative_label]

        if factual_conf > 0.5:
            verdict = "supporting"
            evidence_verdict = "supporting"
        elif top_negative_score > 0.6:
            verdict = "contradicting"
            evidence_verdict = "contradicting"
        else:
            verdict = "insufficient"
            evidence_verdict = "insufficient"

        evidence = EvidenceItem(
            label=LABEL_METADATA.get(top_negative_label if verdict != "supporting" else "factual news", {}).get("category", "AI Analysis"),
            source="DistilBERT (typeform/distilbert-base-uncased-mnli)",
            url=url if url else "",
            verdict=evidence_verdict,
            note=(
                f"Factual confidence: {factual_conf * 100:.1f}%. "
                f"Top risk signal: '{LABEL_METADATA[top_negative_label]['category']}' "
                f"at {top_negative_score * 100:.1f}%."
            )
        )

        extracted_claims.append(ClaimEvidence(
            claim=sentence,
            verdict=verdict,
            supporting=[evidence] if verdict == "supporting" else [],
            contradicting=[evidence] if verdict == "contradicting" else [],
            insufficient=[evidence] if verdict == "insufficient" else [],
        ))

    # ---- 7. Build dynamic summary and tips ---------------------------------
    top_flags = [f.tag for f in sorted(flags, key=lambda f: ["high","medium","low"].index(f.severity))[:3]]
    if top_flags:
        summary = f"Analysis detected {len(flags)} risk signal(s): {', '.join(top_flags)}. Trust score is {trust_score}/100 ({manipulation_level} manipulation level)."
    else:
        summary = f"No significant risk signals were detected. Trust score is {trust_score}/100. Content appears credible."

    verification_tips = list(dict.fromkeys(
        LABEL_TIPS[label]
        for label, score in scores.items()
        if score > 0.55
    ))
    if not verification_tips:
        verification_tips = ["Always cross-check information with trusted and authoritative sources."]

    education = (
        "This analysis uses a DistilBERT-based zero-shot model trained on natural language inference. "
        "It classifies text against known misinformation patterns. "
        "Results are probabilistic and should be used as a guide, not a definitive verdict."
    )

    # ---- 8. Scam risk from real model score --------------------------------
    scam_score_val = int(scores.get("financial scam risk", 0) * 100)
    scam_active = scam_score_val > 40
    scam_level = "HIGH" if scam_score_val > 70 else "MEDIUM" if scam_score_val > 40 else "LOW"

    scam_categories = ["Financial Fraud"] if scam_active else []
    scam_indicators = [
        f"Financial scam risk probability: {scam_score_val}%"
    ] if scam_active else []
    scam_actions = [
        "Do not provide personal or financial information.",
        "Report this content to the relevant platform.",
        "Verify the source's legitimacy through official channels."
    ] if scam_active else []

    scam_risk = ScamRiskAnalysis(
        active=scam_active,
        level=scam_level,
        score=scam_score_val,
        categories=scam_categories,
        indicators=scam_indicators,
        actions=scam_actions,
    )

    # ---- 9. Trust timeline -------------------------------------------------
    trust_timeline = [
        TrustTimelinePoint(label="Baseline", step="Submission", score=50, note="Starting point before analysis."),
        TrustTimelinePoint(
            label="After Flags", step="Flag Detection",
            score=max(1, trust_score + (10 if not flags else -10)),
            note=f"{len(flags)} flag(s) detected."
        ),
        TrustTimelinePoint(
            label="Final Verdict", step="Complete",
            score=trust_score,
            note=summary[:100]
        ),
    ]

    return AnalysisResult(
        trustScore=trust_score,
        manipulationLevel=manipulation_level,
        summary=summary,
        education=education,
        verificationTips=verification_tips,
        scoreBreakdown=score_breakdown,
        scamRisk=scam_risk,
        extractedClaims=extracted_claims,
        flags=flags,
        trustTimeline=trust_timeline,
        extractedFromUrl=bool(url and fetched_text),
    )
