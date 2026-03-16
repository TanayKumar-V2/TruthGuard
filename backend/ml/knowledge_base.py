from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable, List

from pydantic import BaseModel, Field


DEFAULT_KB_DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "kb"


class KnowledgeDocument(BaseModel):
    id: str
    title: str
    source: str
    url: str = ""
    content: str
    published_at: str = ""
    updated_at: str = ""
    tags: List[str] = Field(default_factory=list)


def load_knowledge_documents(data_dir: Path | None = None) -> List[KnowledgeDocument]:
    kb_dir = Path(data_dir or DEFAULT_KB_DATA_DIR)
    if not kb_dir.exists():
        raise FileNotFoundError(
            f"Knowledge base directory does not exist: {kb_dir}. "
            "Create it or set KB_DATA_DIR to a valid location."
        )

    files = sorted(kb_dir.rglob("*.jsonl"))
    if not files:
        raise FileNotFoundError(
            f"No .jsonl knowledge base files were found in {kb_dir}."
        )

    documents: List[KnowledgeDocument] = []
    seen_ids: set[str] = set()

    for file_path in files:
        for line_number, raw_line in enumerate(file_path.read_text(encoding="utf-8").splitlines(), start=1):
            line = raw_line.strip()
            if not line:
                continue

            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON in {file_path}:{line_number}") from exc

            document = KnowledgeDocument.model_validate(payload)
            if document.id in seen_ids:
                raise ValueError(f"Duplicate knowledge document id '{document.id}' in {file_path}:{line_number}")

            seen_ids.add(document.id)
            documents.append(document)

    if not documents:
        raise ValueError(f"No valid knowledge documents were loaded from {kb_dir}.")

    return documents


def build_documents_fingerprint(documents: Iterable[KnowledgeDocument]) -> str:
    payload = json.dumps(
        [document.model_dump(mode="json") for document in documents],
        ensure_ascii=True,
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def read_manifest(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_manifest(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
