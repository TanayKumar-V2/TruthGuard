import uuid
import time
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from ml.classifier import analyze_text

# ---------------------------------------------------------------------------
# App and rate limiter setup
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=[])
app = FastAPI(title="TruthGuard Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    text: Optional[str] = ""
    url: Optional[str] = ""

class FeedbackRequest(BaseModel):
    analysisId: Optional[str] = ""
    action: Optional[str] = ""  # "useful" | "wrong_flag" | "missed_scam"

# ---------------------------------------------------------------------------
# In-memory task store with expiry metadata
# ---------------------------------------------------------------------------

TASK_TTL_SECONDS = 600  # tasks expire after 10 minutes
tasks_store: Dict[str, Any] = {}

async def cleanup_expired_tasks():
    """Background coroutine that evicts tasks older than TASK_TTL_SECONDS."""
    while True:
        await asyncio.sleep(60)  # check every minute
        now = time.time()
        expired = [tid for tid, data in tasks_store.items()
                   if now - data.get("created_at", now) > TASK_TTL_SECONDS]
        for tid in expired:
            del tasks_store[tid]
        if expired:
            print(f"[cleanup] Evicted {len(expired)} expired task(s).")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_expired_tasks())

# ---------------------------------------------------------------------------
# Background verification worker
# ---------------------------------------------------------------------------

async def process_verification(task_id: str, text: str, url: str):
    try:
        analysis = await analyze_text(text=text, url=url)
        tasks_store[task_id].update({
            "status": "completed",
            "result": analysis.dict(),
        })
    except Exception as e:
        print(f"[process_verification] Error for task {task_id}: {e}")
        tasks_store[task_id].update({
            "status": "failed",
            "error": str(e),
        })

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def read_health():
    return {
        "status": "ok",
        "message": "TruthGuard backend is running.",
        "active_tasks": len(tasks_store),
    }

@app.post("/verify")
@limiter.limit("5/minute")
async def verify_endpoint(request: Request, body: VerifyRequest, background_tasks: BackgroundTasks):
    if not body.text and not body.url:
        raise HTTPException(status_code=400, detail="Provide at least one of: text, url.")

    task_id = str(uuid.uuid4())
    tasks_store[task_id] = {
        "status": "processing",
        "created_at": time.time(),
    }
    background_tasks.add_task(process_verification, task_id, body.text or "", body.url or "")
    return {"task_id": task_id, "status": "processing"}

@app.get("/result/{task_id}")
def get_result(task_id: str):
    task = tasks_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found or expired.")
    # Return without leaking internal metadata
    return {k: v for k, v in task.items() if k != "created_at"}

@app.post("/api/feedback")
def feedback_endpoint(request: FeedbackRequest):
    valid_actions = {"useful", "wrong_flag", "missed_scam"}
    if not request.analysisId or request.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Provide a valid analysisId and action ({', '.join(valid_actions)})."
        )
    # In future: persist to a database. For now acknowledge receipt.
    return {
        "received": True,
        "analysisId": request.analysisId,
        "action": request.action,
    }
