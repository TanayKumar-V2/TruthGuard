import uuid
import time
import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import aiofiles

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional until dependencies are installed
    load_dotenv = None

if load_dotenv is not None:
    backend_dir = Path(__file__).resolve().parent
    load_dotenv(backend_dir / ".env")
    load_dotenv(backend_dir / ".env.local", override=True)

import logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger(__name__)

from monitoring import MetricsStore
from ml.classifier import analyze_submission, get_engine
from ml.video_processor import get_video_processor
from ml.security import UnsafeUrlError

# ---------------------------------------------------------------------------
# App and rate limiter setup
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=[])
app = FastAPI(title="TruthGuard Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
backend_dir = Path(__file__).resolve().parent
WORKER_CONCURRENCY = max(1, int(os.getenv("ANALYSIS_WORKER_CONCURRENCY", "2")))
ANALYSIS_TIMEOUT_SECONDS = max(20, int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "75")))
ANALYSIS_MAX_RETRIES = max(0, int(os.getenv("ANALYSIS_MAX_RETRIES", "1")))
ANALYSIS_QUEUE_SIZE = max(10, int(os.getenv("ANALYSIS_QUEUE_SIZE", "200")))
METRICS = MetricsStore(backend_dir / "data" / "telemetry" / "analysis_events.jsonl")

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in __import__('os').getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',') if origin.strip()],
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
analysis_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=ANALYSIS_QUEUE_SIZE)
worker_tasks: list[asyncio.Task[Any]] = []
active_workers = 0


def update_queue_metrics() -> None:
    METRICS.set_queue_state(analysis_queue.qsize(), active_workers)


def should_retry_task(error: Exception) -> bool:
    if isinstance(error, asyncio.TimeoutError):
        return True
    lowered = str(error).lower()
    return any(token in lowered for token in ["timeout", "temporarily unavailable", "connection", "503", "quota", "429"])

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
            logger.info(f"[cleanup] Evicted {len(expired)} expired task(s).")
        try:
            engine = await get_engine()
            removed = await asyncio.to_thread(engine.analysis_cache.cleanup_expired)
            if removed:
                logger.info(f"[cleanup] Evicted {removed} expired cache entrie(s).")
        except Exception as e:
            logger.debug(f"[cleanup] Cache cleanup error: {e}")


async def analysis_worker(worker_id: int) -> None:
    global active_workers
    logger.info(f"Worker {worker_id} started.")
    while True:
        job = await analysis_queue.get()
        logger.info(f"Worker {worker_id} picked up task {job['task_id']}")
        active_workers += 1
        update_queue_metrics()
        task_id = job["task_id"]
        started_at = time.perf_counter()
        try:
            tasks_store[task_id]["status"] = "processing"
            tasks_store[task_id]["attempts"] = job["attempt"] + 1
            
            if job.get("type") == "video":
                video_processor = await get_video_processor()
                envelope = await asyncio.wait_for(
                    video_processor.analyze_video(job["file_path"]),
                    timeout=ANALYSIS_TIMEOUT_SECONDS * 2, # Video takes longer
                )
                # Cleanup local video file
                if os.path.exists(job["file_path"]):
                    os.remove(job["file_path"])
            else:
                envelope = await asyncio.wait_for(
                    analyze_submission(text=job["text"], url=job["url"]),
                    timeout=ANALYSIS_TIMEOUT_SECONDS,
                )
            
            tasks_store[task_id].update(
                {
                    "status": "completed",
                    "result": envelope.analysis.model_dump(),
                    "metadata": envelope.metadata.model_dump(),
                }
            )
            METRICS.record_success(
                latency_ms=envelope.metadata.latency_ms or round((time.perf_counter() - started_at) * 1000, 2),
                metadata=envelope.metadata.model_dump(),
                result=envelope.analysis.model_dump(),
            )
        except UnsafeUrlError as exc:
            message = str(exc)
            tasks_store[task_id].update({"status": "failed", "error": message})
            METRICS.record_failure(latency_ms=round((time.perf_counter() - started_at) * 1000, 2), error_bucket="UnsafeUrlError", detail=message)
        except Exception as exc:
            if job["attempt"] < ANALYSIS_MAX_RETRIES and should_retry_task(exc):
                await analysis_queue.put({**job, "attempt": job["attempt"] + 1})
                update_queue_metrics()
                tasks_store[task_id].update({"status": "processing", "error": f"Retrying after transient error: {exc}"})
            else:
                message = str(exc)
                if not message:
                    message = f"Analysis failed with {exc.__class__.__name__}."
                if isinstance(exc, asyncio.TimeoutError):
                    message = "Analysis timed out. The AI engine is currently overloaded or the content is too complex."
                tasks_store[task_id].update({"status": "failed", "error": message})
                METRICS.record_failure(
                    latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
                    error_bucket=exc.__class__.__name__,
                    detail=message,
                )
        finally:
            active_workers -= 1
            update_queue_metrics()
            analysis_queue.task_done()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_expired_tasks())
    if worker_tasks:
        return
    logger.info(f"Starting {WORKER_CONCURRENCY} workers...")
    for index in range(WORKER_CONCURRENCY):
        worker_tasks.append(asyncio.create_task(analysis_worker(index + 1)))
    logger.info("Workers initialized and queued.")
    update_queue_metrics()


@app.on_event("shutdown")
async def shutdown_event():
    for task in worker_tasks:
        task.cancel()
    if worker_tasks:
        await asyncio.gather(*worker_tasks, return_exceptions=True)
    worker_tasks.clear()

# ---------------------------------------------------------------------------
# Background verification worker
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def read_health():
    return {
        "status": "ok",
        "message": "TruthGuard backend is running.",
        "active_tasks": len(tasks_store),
        "queue_depth": analysis_queue.qsize(),
        "active_workers": active_workers,
    }

@app.post("/verify")
@limiter.limit("5/minute")
async def verify_endpoint(request: Request, body: VerifyRequest):
    if not body.text and not body.url:
        raise HTTPException(status_code=400, detail="Provide at least one of: text, url.")
    if analysis_queue.full():
        raise HTTPException(status_code=503, detail="Analysis queue is full. Retry shortly.")

    task_id = str(uuid.uuid4())
    tasks_store[task_id] = {
        "status": "processing",
        "created_at": time.time(),
        "attempts": 0,
    }
    analysis_queue.put_nowait(
        {
            "task_id": task_id,
            "text": body.text or "",
            "url": body.url or "",
            "attempt": 0,
        }
    )
    update_queue_metrics()
    return {"task_id": task_id, "status": "processing"}

@app.post("/verify-video")
@limiter.limit("2/minute")
async def verify_video_endpoint(request: Request, file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files are supported.")
    
    if analysis_queue.full():
        raise HTTPException(status_code=503, detail="Analysis queue is full. Retry shortly.")

    task_id = str(uuid.uuid4())
    temp_dir = Path(__file__).resolve().parent / "data" / "temp_videos"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = temp_dir / f"{task_id}_{file.filename}"
    
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
    except Exception as e:
        logger.error(f"Failed to save video file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded video.")

    tasks_store[task_id] = {
        "status": "processing",
        "created_at": time.time(),
        "attempts": 0,
        "type": "video"
    }
    
    analysis_queue.put_nowait(
        {
            "task_id": task_id,
            "type": "video",
            "file_path": str(file_path),
            "attempt": 0,
        }
    )
    update_queue_metrics()
    return {"task_id": task_id, "status": "processing"}

@app.get("/result/{task_id}")
def get_result(task_id: str):
    task = tasks_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found or expired.")
    # Return without leaking internal metadata
    return {k: v for k, v in task.items() if k != "created_at"}


@app.get("/metrics")
def metrics_endpoint():
    return METRICS.snapshot()

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
