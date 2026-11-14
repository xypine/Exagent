.PHONY: check test frontend-check backend-check frontend-test backend-test

check: frontend-check backend-check

test: frontend-test backend-test

frontend-check:
	cd frontend && pnpm check

backend-check:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app

frontend-test:
	cd frontend && pnpm test

backend-test:
	cd backend && uv run pytest
