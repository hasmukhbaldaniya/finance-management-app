# Finance Management

Three independent apps:

- `frontend/` — Next.js (App Router, TypeScript, Tailwind CSS 4, shadcn/ui)
- `backend/` — Node.js + Express + TypeScript, Sequelize ORM, PostgreSQL
- `ai-service/` — Python + FastAPI, the standalone AI/ML extraction microservice behind Claim Management's Automated Extraction flow (stateless, called only by `backend` over HTTP)

## Local setup

1. Start Postgres: `docker compose up -d`
2. Backend:
   ```
   cd backend
   cp .env.example .env
   npm install
   npm run migrate
   npm run dev
   ```
3. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
4. AI service (only needed for the Automated Extraction claim flow — everything else works without it):
   ```
   cd ai-service
   cp .env.example .env   # set ANTHROPIC_API_KEY to enable real extraction
   uv sync
   uv run python run.py
   ```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`, ai-service on `http://localhost:4100`.
