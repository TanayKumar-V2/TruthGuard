from __future__ import annotations

import asyncio
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency is optional until installed
    load_dotenv = None

from ml.classifier import get_engine


def load_environment() -> None:
    if load_dotenv is None:
        return

    backend_dir = Path(__file__).resolve().parent
    load_dotenv(backend_dir / ".env")
    load_dotenv(backend_dir / ".env.local", override=True)


async def main() -> None:
    load_environment()
    engine = await get_engine()
    document_count = await engine.rebuild_knowledge_collection(force=True)
    print(
        f"Indexed {document_count} knowledge documents into "
        f"'{engine.knowledge_collection_name}' from {engine.kb_data_dir}."
    )


if __name__ == "__main__":
    asyncio.run(main())
