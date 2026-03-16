from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from threading import Lock
from typing import Any

from pydantic import BaseModel


class CacheEntry(BaseModel):
    key: str
    created_at: float
    expires_at: float
    payload: dict[str, Any]


class FileAnalysisCache:
    def __init__(
        self,
        cache_dir: Path,
        ttl_seconds: int,
        max_entries: int = 256,
        namespace: str = "",
    ) -> None:
        self.cache_dir = cache_dir
        self.ttl_seconds = max(0, ttl_seconds)
        self.max_entries = max(32, max_entries)
        self.namespace = namespace
        self._lock = Lock()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def build_key(self, parts: list[str]) -> str:
        digest = hashlib.sha256()
        digest.update(self.namespace.encode("utf-8"))
        digest.update(b"\n")
        for part in parts:
            digest.update(part.encode("utf-8"))
            digest.update(b"\n")
        return digest.hexdigest()

    def get(self, key: str) -> dict[str, Any] | None:
        if self.ttl_seconds <= 0:
            return None

        path = self.cache_dir / f"{key}.json"
        if not path.exists():
            return None

        with self._lock:
            try:
                entry = CacheEntry.model_validate_json(path.read_text(encoding="utf-8"))
            except Exception:
                path.unlink(missing_ok=True)
                return None

            if entry.expires_at <= time.time():
                path.unlink(missing_ok=True)
                return None
            return entry.payload

    def set(self, key: str, payload: dict[str, Any], ttl_seconds: int | None = None) -> None:
        effective_ttl = self.ttl_seconds if ttl_seconds is None else max(0, ttl_seconds)
        if effective_ttl <= 0:
            return

        now = time.time()
        entry = CacheEntry(
            key=key,
            created_at=now,
            expires_at=now + effective_ttl,
            payload=payload,
        )
        path = self.cache_dir / f"{key}.json"
        with self._lock:
            path.write_text(entry.model_dump_json(indent=2), encoding="utf-8")
            self._evict_if_needed()

    def _evict_if_needed(self) -> None:
        files = sorted(
            self.cache_dir.glob("*.json"),
            key=lambda item: item.stat().st_mtime,
            reverse=True,
        )
        for stale in files[self.max_entries :]:
            stale.unlink(missing_ok=True)
