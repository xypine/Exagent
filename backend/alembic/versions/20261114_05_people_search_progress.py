"""Track live Exa request progress for people-search batches.

Revision ID: 20261114_05
Revises: 20261114_04
Create Date: 2026-11-14 00:20:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261114_05"
down_revision: str | None = "20261114_04"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE search_jobs "
        "ADD COLUMN IF NOT EXISTS people_requests_completed INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE search_jobs "
        "ADD COLUMN IF NOT EXISTS people_requests_failed INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE people_search_cache "
        "ADD COLUMN IF NOT EXISTS requests_completed INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE people_search_cache "
        "ADD COLUMN IF NOT EXISTS requests_failed INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.drop_column("people_search_cache", "requests_failed")
    op.drop_column("people_search_cache", "requests_completed")
    op.drop_column("search_jobs", "people_requests_failed")
    op.drop_column("search_jobs", "people_requests_completed")
