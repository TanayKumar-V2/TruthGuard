import asyncio
import logging
import os
import uuid
import time
from pathlib import Path
from typing import Dict, Any, List

import importlib
from pydantic import ValidationError

from ml.classifier import (
    AnalysisEnvelope, 
    GeminiAnalysisPayload, 
    get_engine, 
    REQUIRED_LABELS, 
    clamp_score,
    build_flags,
    compute_trust_score,
    build_score_breakdown,
    unique_strings,
    extract_json_payload
)

logger = logging.getLogger(__name__)

TEMP_VIDEO_DIR = Path(__file__).resolve().parents[1] / "data" / "temp_videos"
TEMP_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

class VideoDeepfakeProcessor:
    def __init__(self):
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self._engine = None

    async def get_engine(self):
        if self._engine is None:
            from ml.classifier import get_engine as get_rag_engine
            self._engine = await get_rag_engine()
        return self._engine

    async def analyze_video(self, video_path: str) -> AnalysisEnvelope:
        engine = await self.get_engine()
        await engine.ensure_clients()
        client = engine._client
        genai_types = engine._genai_types

        started_at = time.perf_counter()
        
        # 1. Upload to Gemini File API
        logger.info(f"Uploading video {video_path} to Gemini File API...")
        file_mime = "video/mp4" # Simple assumption for now, could be dynamic
        
        try:
            uploaded_file = await asyncio.to_thread(
                client.files.upload,
                path=video_path,
                config=genai_types.UploadFileConfig(mime_type=file_mime)
            )
            
            # 2. Wait for processing
            logger.info(f"Waiting for video {uploaded_file.name} to be processed...")
            while True:
                remote_file = await asyncio.to_thread(client.files.get, name=uploaded_file.name)
                if remote_file.state.name == "ACTIVE":
                    break
                elif remote_file.state.name == "FAILED":
                    raise RuntimeError(f"Video processing failed on Gemini side: {remote_file.state.name}")
                await asyncio.sleep(5)
            
            # 3. Analyze with Deepfake focus
            prompt = """
            You are a specialized forensic video analyst for TruthGuard. 
            Analyze this video carefully for signs of AI manipulation or deepfake techniques.
            
            Look for:
            - Temporal inconsistencies (glitches, shimmering, flickering around facial boundaries).
            - Audio-visual mismatch (lip-sync delays, unnatural speech patterns).
            - Biometric anomalies (unnatural blinking, robotic head movements, skin tone inconsistencies).
            - Background/Foreground blending errors.
            
            Assign scores (0-100) and provide detailed qualitative reasons.
            If you detect a deepfake, prioritize high scores for 'financial_scam_risk' if it involves financial figures, 
            and 'sensationalism' or 'emotional_trigger'.
            
            Return ONLY a JSON object following this schema:
            {
              "summary": "Full analysis summary",
              "verificationTips": ["tip1", "tip2"],
              "scamIndicators": ["indicator1"],
              "scamCategories": ["Category1"],
              "categoryScores": {
                "sensationalism": 0,
                "clickbait": 0,
                "emotional_trigger": 0,
                "urgency_pressure": 0,
                "unverified_language": 0,
                "financial_scam_risk": 0,
                "missing_source": 0,
                "factual_news": 50
              },
              "categoryReasons": {
                "label": {"reason": "text", "matchedPhrases": []}
              },
              "claims": [
                {"claim": "statement", "verdict": "supporting|contradicting|insufficient", "note": "explanation"}
              ]
            }
            """
            
            logger.info(f"Running deepfake analysis on {uploaded_file.name}...")
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self.model_name,
                contents=[uploaded_file, prompt],
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            
            raw_response = getattr(response, "text", "") or ""
            parsed_payload = extract_json_payload(raw_response)
            payload = GeminiAnalysisPayload.model_validate(parsed_payload)
            
            # 4. Clean up remote file
            await asyncio.to_thread(client.files.delete, name=uploaded_file.name)
            
            # 5. Build full result
            scores = {label: clamp_score(payload.categoryScores.get(label, 0)) for label in REQUIRED_LABELS}
            trust_score, negative_pressure = compute_trust_score(scores)
            
            manipulation_level = "HIGH" if trust_score < 40 else "MEDIUM" if trust_score < 70 else "LOW"
            score_breakdown = build_score_breakdown(scores)
            
            reasons = {
                label: payload.categoryReasons.get(label, engine.category_reason_factory()) # Need to check if factory is accessible
                if hasattr(engine, 'category_reason_factory') else payload.categoryReasons.get(label, {})
                for label in REQUIRED_LABELS
            }
            # Fallback for reasons if the above fails
            if not isinstance(reasons.get("factual_news"), dict) and not hasattr(reasons.get("factual_news"), "reason"):
                 from ml.classifier import CategoryReason
                 reasons = {label: payload.categoryReasons.get(label, CategoryReason()) for label in REQUIRED_LABELS}

            flags = build_flags(scores, reasons)
            
            from ml.classifier import AnalysisResult, AnalysisMetadata, ScamRiskAnalysis, TrustTimelinePoint
            
            scam_score_val = scores.get("financial_scam_risk", 0)
            scam_active = scam_score_val > 40
            
            analysis = AnalysisResult(
                trustScore=trust_score,
                manipulationLevel=manipulation_level,
                summary=payload.summary,
                education="Deepfake analysis performed using Gemini Multimodal Video Understanding. Evaluates facial consistency, temporal sync, and synthetic artifacts.",
                verificationTips=unique_strings(payload.verificationTips, limit=5),
                scoreBreakdown=score_breakdown,
                scamRisk=ScamRiskAnalysis(
                    active=scam_active,
                    level="HIGH" if scam_score_val > 70 else "MEDIUM" if scam_score_val > 40 else "LOW",
                    score=scam_score_val,
                    categories=unique_strings(payload.scamCategories),
                    indicators=unique_strings(payload.scamIndicators, limit=4),
                    actions=["Do not trust the video without primary source verification.", "Check for original uploads from official channels."] if scam_active else []
                ),
                extractedClaims=[], # We can extend this to build claims from payload.claims if needed
                flags=flags,
                trustTimeline=[
                    TrustTimelinePoint(label="Submission", step="Upload", score=50, note="Video received for analysis."),
                    TrustTimelinePoint(label="Final Verdict", step="Complete", score=trust_score, note=payload.summary[:100])
                ],
                extractedFromUrl=False
            )
            
            metadata = AnalysisMetadata(
                model_used=self.model_name,
                latency_ms=round((time.perf_counter() - started_at) * 1000, 2)
            )
            
            return AnalysisEnvelope(analysis=analysis, metadata=metadata)
            
        finally:
            # Local cleanup of the video file is handled by the caller (main.py)
            pass

_processor = None

async def get_video_processor() -> VideoDeepfakeProcessor:
    global _processor
    if _processor is None:
        _processor = VideoDeepfakeProcessor()
    return _processor
