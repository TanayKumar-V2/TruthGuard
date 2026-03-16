---
description: Implement FastAPI backend to replace existing backend
---

This workflow details the steps to implement a FastAPI backend for the current project, completely replacing the existing Next.js API routes with a new Python-based backend.

// turbo
1. Create the `backend` directory
```powershell
mkdir backend
```

// turbo
2. Initialize a Python virtual environment
```powershell
cd backend
python -m venv venv
```

3. Install FastAPI and Uvicorn
```powershell
cd backend
.\venv\Scripts\activate
pip install fastapi "uvicorn[standard]"
pip freeze > requirements.txt
```

// turbo
4. Create the main FastAPI application file
```powershell
New-Item -Path backend\main.py -ItemType File -Value 'from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Backend API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "FastAPI backend is running!"}
'
```

// turbo
5. Update `next.config.js` to proxy API requests to FastAPI
```powershell
Rename-Item -Path next.config.js -NewName next.config.js.bak
New-Item -Path next.config.js -ItemType File -Value '/** @type {import(''next'').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*", # Proxy to FastAPI Backend
      },
    ];
  },
};

module.exports = nextConfig;
'
```

6. Migrate existing API routes
Review existing logic inside `app/api/` (or equivalent backend folders) and recreate those endpoints in FastAPI (`backend/main.py` or separate router modules). Use Pydantic models for request validation and response formatting.

7. Start the FastAPI development server
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

8. Start the Next.js frontend server
In a separate terminal:
```powershell
npm run dev
```

9. Verify Integration
Ensure the frontend successfully communicates with the new FastAPI backend at `http://localhost:3000/api/health`.
