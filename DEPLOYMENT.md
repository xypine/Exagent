# Deployment guide

The checked-in `compose.yaml` is for local development only: it uses source
mounts, reload mode, and the Vite development server. Do not expose it directly
to the internet.

## Before deploying

1. Create production secrets outside version control. At minimum, set strong,
   unique values for `POSTGRES_PASSWORD` and `DATABASE_URL`; set provider keys
   only when their integrations are enabled.
2. Build a production frontend (`pnpm build`) and serve its `dist/` files from a
   web server or CDN. Route `/api` to the backend so browser requests remain
   same-origin.
3. Run the backend without `--reload`, behind a TLS-terminating reverse proxy.
   Set `FRONTEND_ORIGIN` to the public frontend URL (for example,
   `https://app.example.com`).
4. Run PostgreSQL with persistent storage, automated backups, and restricted
   network access. Do not publish its port unless a private network requires it.
5. Apply Alembic migrations during the release process, before serving code
   that depends on them:

   ```bash
   cd backend
   uv run alembic upgrade head
   ```

## Release checklist

- Run `make check` and `make test`.
- Confirm `GET /api/health` returns successfully through the public proxy.
- Keep API keys server-side; never place them in frontend build variables.
- Configure the reverse proxy to forward the client IP correctly.
- The current rate limiter is in-memory. Keep one backend instance, or replace
  it with a shared limiter (such as Redis) before scaling horizontally.

The application has no authentication by design. Limit access at the network or
proxy layer if the deployment should not be public.
