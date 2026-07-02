# Finance Management

Two independent apps:

- `frontend/` — Next.js (App Router, TypeScript, Tailwind CSS 4, shadcn/ui)
- `backend/` — Node.js + Express + TypeScript, Sequelize ORM, PostgreSQL

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

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`.
# finance-management-app
