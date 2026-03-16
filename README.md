# TruthGuard

TruthGuard uses a Next.js frontend with a FastAPI backend that runs Gemini + RAG analysis with a local vector store plus live web grounding.

## Local setup

1. Start backend:

```powershell
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

2. Set frontend environment (`.env.local` at repo root):

```env
BACKEND_API_URL=http://127.0.0.1:8000
```

3. Start frontend:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Frontend `app/api/analyze` proxies to backend `/verify` and `/result/{task_id}`.
- Frontend `app/api/feedback` proxies to backend `/api/feedback`.
- Backend knowledge-base ingestion is file-based (`backend/data/kb/*.jsonl`) and can be rebuilt with:

```powershell
cd backend
uv run python ingest_kb.py
```

- Backend env vars live in `backend/.env` or `backend/.env.local`. Start from [backend/.env.example](C:/Tanay/TruthGuard/backend/.env.example).
- No extra API key is required for live web retrieval beyond `GEMINI_API_KEY`; live grounding is performed through the Gemini API.
