from __future__ import annotations

import json
import time
from collections import Counter, deque
from pathlib import Path
from threading import Lock
from typing import Any


class MetricsStore:
    def __init__(self, events_path: Path, max_recent: int = 200) -> None:
        self._lock = Lock()
        self.events_path = events_path
        self.events_path.parent.mkdir(parents=True, exist_ok=True)
        self.max_recent = max_recent
        self.request_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.degraded_count = 0
        self.cache_hit_count = 0
        self.latencies_ms: deque[float] = deque(maxlen=max_recent)
        self.error_buckets: Counter[str] = Counter()
        self.model_usage: Counter[str] = Counter()
        self.flag_usage: Counter[str] = Counter()
        self.trust_bands: Counter[str] = Counter()
        self.queue_depth = 0
        self.active_workers = 0
        self.recent_outcomes: deque[dict[str, Any]] = deque(maxlen=max_recent)

    def set_queue_state(self, queue_depth: int, active_workers: int) -> None:
        with self._lock:
            self.queue_depth = max(0, queue_depth)
            self.active_workers = max(0, active_workers)

    def record_enqueue(self) -> None:
        with self._lock:
            self.request_count += 1

    def record_success(self, latency_ms: float, metadata: dict[str, Any], result: dict[str, Any]) -> None:
        trust_score = int(result.get("trustScore", 0))
        trust_band = "low" if trust_score < 40 else "medium" if trust_score < 70 else "high"
        flags = [flag.get("tag", "") for flag in result.get("flags", []) if isinstance(flag, dict)]
        model_used = str(metadata.get("model_used", "unknown"))
        degraded = bool(metadata.get("degraded_mode"))
        cache_hit = bool(metadata.get("cache_hit"))

        event = {
            "timestamp": time.time(),
            "kind": "success",
            "latency_ms": round(latency_ms, 2),
            "model_used": model_used,
            "degraded": degraded,
            "cache_hit": cache_hit,
            "trust_band": trust_band,
            "flags": flags,
            "error_buckets": metadata.get("error_buckets", []),
        }
        self._append_event(event)

        with self._lock:
            self.success_count += 1
            self.latencies_ms.append(latency_ms)
            self.model_usage[model_used] += 1
            self.trust_bands[trust_band] += 1
            self.flag_usage.update([flag for flag in flags if flag])
            self.recent_outcomes.append(event)
            if degraded:
                self.degraded_count += 1
            if cache_hit:
                self.cache_hit_count += 1
            for bucket in metadata.get("error_buckets", []):
                self.error_buckets[str(bucket)] += 1

    def record_failure(self, latency_ms: float, error_bucket: str, detail: str) -> None:
        event = {
            "timestamp": time.time(),
            "kind": "failure",
            "latency_ms": round(latency_ms, 2),
            "error_bucket": error_bucket,
            "detail": detail[:300],
        }
        self._append_event(event)

        with self._lock:
            self.failure_count += 1
            self.latencies_ms.append(latency_ms)
            self.error_buckets[error_bucket] += 1
            self.recent_outcomes.append(event)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            recent = list(self.recent_outcomes)
            average_latency = (
                round(sum(self.latencies_ms) / len(self.latencies_ms), 2)
                if self.latencies_ms
                else 0.0
            )
            return {
                "requests": self.request_count,
                "successes": self.success_count,
                "failures": self.failure_count,
                "degraded_responses": self.degraded_count,
                "cache_hits": self.cache_hit_count,
                "average_latency_ms": average_latency,
                "queue_depth": self.queue_depth,
                "active_workers": self.active_workers,
                "error_buckets": dict(self.error_buckets),
                "model_usage": dict(self.model_usage),
                "recent_drift": {
                    "trust_bands": dict(self.trust_bands),
                    "top_flags": dict(self.flag_usage.most_common(8)),
                    "recent_events": recent[-10:],
                },
            }

    def _append_event(self, payload: dict[str, Any]) -> None:
        line = json.dumps(payload, ensure_ascii=True)
        with self.events_path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
