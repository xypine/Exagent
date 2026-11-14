# Contributor guide

## Repository layout

- `frontend/` is a SolidJS + Tailwind application. Use TanStack Query for server state and TanStack Table for data-heavy views.
- `backend/` is the FastAPI API. Keep route handlers thin; provider-specific code belongs in `app/services/`.
- `compose.yaml` is the canonical local development environment. It runs PostgreSQL, the API, and Vite with reload enabled.

## Development

```bash
cp .env.example .env
docker compose up --build
make check
make test
```

## Command aliases

- Prefer the project aliases to long command chains: `make check`, `make test`,
  `make verify`, `make compose-config`, and `make dev`.
- `make verify` validates Compose, runs frontend checks/tests in the Compose
  container, then runs backend checks/tests. Use the narrower targets when
  only one area changed.
- The same aliases are available through the flake, for example `nix run
  .#verify`, `nix run .#backend-check`, `nix run .#frontend-compose-check`,
  and `nix run .#compose-config`. Prefer these stable prefixes for commands
  that need approval.

The frontend proxies `/api` requests to the backend. Do not expose API keys to browser code.

## Boundaries and conventions

- This project intentionally has no authentication. The browser stores one UUID and sends it as `X-Client-Id`; apply the existing rate-limit dependency to new application endpoints.
- The current limiter is in-memory and for local/single-instance use only. Use a shared store before horizontal deployment.
- SQLAlchemy and Alembic are configured, but no models or migration revisions exist yet. Add a model and migration together once a persistence feature is agreed.
- Exa and Gemini credentials are configuration placeholders. Add integrations behind services, not directly in routers or UI components.
- Keep bootstrap scope narrow: avoid adding product flows, accounts, or provider calls without an explicit request.
- Create additional Jujutsu working copies under `.jj-workspaces/<name>` with
  `jj workspace add .jj-workspaces/<name> --name <name>`. This directory is
  gitignored so workspace files do not enter the primary working copy.

## Verification

- Frontend: `cd frontend && pnpm check && pnpm test`
- Backend: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest`
- Validate Compose changes with `docker compose config`.
