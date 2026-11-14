.PHONY: \
	backend-check \
	backend-test \
	check \
	compose-config \
	dev \
	frontend-check \
	frontend-compose-check \
	frontend-compose-test \
	frontend-test \
	test \
	verify

RUFF ?= $(shell command -v ruff >/dev/null 2>&1 && echo ruff || echo 'uv run ruff')
RUFF_FLAGS ?= --no-cache
MYPY_CACHE_DIR ?= /tmp/prospecting-mypy-cache

check: frontend-check backend-check

test: frontend-test backend-test

frontend-check:
	cd frontend && pnpm check

backend-check:
	cd backend && $(RUFF) check $(RUFF_FLAGS) . && $(RUFF) format --check $(RUFF_FLAGS) . && uv run python -m mypy app --cache-dir=$(MYPY_CACHE_DIR)

frontend-test:
	cd frontend && pnpm test

backend-test:
	cd backend && uv run python -m pytest -p no:cacheprovider

dev:
	docker compose up --build

compose-config:
	docker compose config --quiet

frontend-compose-check:
	docker compose run --rm --no-deps frontend pnpm check

frontend-compose-test:
	docker compose run --rm --no-deps frontend pnpm test

verify: compose-config frontend-compose-check frontend-compose-test backend-check backend-test
