# Prospecting workspace

A lightweight starting point for a job-search research tool. The eventual product will use Exa to discover companies and relevant people, and Gemini to help synthesize results. Those integrations and product workflows are intentionally not implemented yet.

## Stack

- **Frontend:** SolidJS, Vite, Tailwind CSS, TanStack Query/Table
- **Backend:** FastAPI, SQLAlchemy, Alembic
- **Data:** PostgreSQL
- **Local environment:** Docker Compose with hot reload

## Quick start

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Start the development stack:

   ```bash
   docker compose up --build
   ```

3. Open http://localhost:5173. The API health endpoint is at http://localhost:8000/api/health.

The Compose services bind mount the source directories. Changes to the frontend use Vite HMR; changes to the backend trigger Uvicorn reload.

## Local commands

Running the apps outside Docker is optional. Install dependencies first with `pnpm install` in `frontend/` and `uv sync --all-groups` in `backend/`.

```bash
make check   # formatting/lint/type checks
make test    # frontend and backend tests
```

## Anonymous clients and rate limits

The browser creates a UUID once and stores it in local storage. API calls include it as `X-Client-Id`. The backend validates that header and provides an in-memory, per-client and per-IP limiter for future application endpoints. It deliberately has no user accounts or sessions.

The in-memory limiter is suitable only for one local process. Before deploying more than one backend instance, replace it with a shared limiter (for example, Redis) and configure trusted proxy handling.

## Database and migrations

SQLAlchemy, database sessions, and Alembic are wired in, but there are intentionally no models or migration revisions. When the first persistence feature is agreed, add its model and generate the first revision with:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

## Future integrations

`EXA_API_KEY` and `GEMINI_API_KEY` are configuration placeholders only. Keep calls to external providers behind services in `backend/app/services/` so routes and persistence do not depend directly on a provider SDK.
