# Prospecting workspace

A lightweight job-search research tool. The browser can create and poll cached company-search jobs, then automatically research and score the top five people with Exa and Gemini.

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
The backend service applies Alembic migrations before it starts, so the company-search job and cache tables are available locally.


## Local commands

Running the apps outside Docker is optional. Install dependencies first with `pnpm install` in `frontend/` and `uv sync --all-groups` in `backend/`.

```bash
make check   # formatting/lint/type checks
make test    # frontend and backend tests
make verify  # Compose config, containerized frontend checks/tests, backend checks/tests
```

The same commands are available as Nix flake apps. These provide stable command
prefixes for approval rules and use the flake's tools:

```bash
nix run .#check
nix run .#test
nix run .#verify
nix run .#frontend-compose-check
nix run .#compose-config
nix run .#dev
```

## Agent CLI

Use the Node CLI to test the application through the same HTTP API as the
frontend. It defaults to the local backend at `http://localhost:8000` and
creates a local, gitignored `.exagent-cli.json` containing its anonymous client
UUID. Reusing that UUID is important: the API only lets a client read jobs that
it created.

```bash
# Confirm the backend accepts the CLI's client identity.
pnpm agent -- client

# Create a search and wait for the background work to finish.
pnpm agent -- search create \
  --area Helsinki \
  --industry SaaS \
  --company-size small \
  --wait \
  --json

# Continue a completed search or inspect its people.
pnpm agent -- search get <job-id> --json
pnpm agent -- search more-people <job-id> --wait --json
pnpm agent -- person research <job-id> <person-id> --wait --json

# Start and poll a match run with a profile stored outside the command history.
pnpm agent -- match start <job-id> --profile-file ./profile.txt --wait --json
```

Pass `--api-url https://your-app.example` to test a deployed API or
`--client-id <uuid>` to use an explicit identity in a scripted environment.
Run `pnpm agent -- --help` for all commands. The CLI test suite is available as
`pnpm agent:test`.

## Exa company and people search

Set `EXA_API_KEY` in `.env`, then discover companies by industry and area:

```bash
bin/exa-search --industry "wealth management" --area Helsinki --limit 5
```

Pick a company from the structured JSON results, then search for its current employees using an industry preset from `job_titles.json`:

```bash
bin/exa-people-search \
  --company "Example Wealth" \
  --company-url "https://example.fi" \
  --industry-key wealth_management \
  --limit 10
```

Available preset keys are `investment_banking`, `saas_company`, `wealth_management`, `marketing_agency`, and `recruiters`. The people command finds current employees for the selected titles, then researches their public background. Previous roles, education, and volunteering are emitted only with a source URL for that specific entry. Equivalent specialized or compound titles are accepted, but current employment must be at the selected company rather than another division in its corporate group. No API keys are exposed to browser code.

## Anonymous clients and rate limits

The browser creates a UUID once and stores it in local storage. API calls include it as `X-Client-Id`. The backend validates that header and provides an in-memory, per-client and per-IP limiter for future application endpoints. It deliberately has no user accounts or sessions.

The in-memory limiter is suitable only for one local process. Before deploying more than one backend instance, replace it with a shared limiter (for example, Redis) and configure trusted proxy handling.

## Database and migrations

SQLAlchemy, database sessions, and Alembic persist company-search jobs and their cache. Create future persistence features with a model and migration together:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

## Provider integrations

`EXA_API_KEY` enables company and people research. `GEMINI_API_KEY` enables stateless,
structured match scoring with the fixed free-tier `gemini-3.5-flash-lite` model. The
results page keeps an optional seeker profile in browser local storage, attaches its
snapshot to a bounded top-five background run, and clears the server-side task payload
when the run finishes. Matching results are never reused for a profile. Keep calls to
external providers behind services in `backend/app/services/` so routes and persistence
do not depend directly on a provider SDK.
