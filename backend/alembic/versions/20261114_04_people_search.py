"""Add key-people discovery batches and cache.

Revision ID: 20261114_04
Revises: 20261114_03
Create Date: 2026-11-14 00:10:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261114_04"
down_revision: str | None = "20261114_03"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # These objects may already exist in local databases affected by the
    # former duplicate revision ID. Keep the migration convergent so they can
    # be brought back under Alembic's linear history without losing data.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS people_search_cache (
            cache_key VARCHAR(64) NOT NULL PRIMARY KEY,
            people JSON NOT NULL DEFAULT '[]'::json,
            people_error VARCHAR(500),
            companies_searched INTEGER NOT NULL DEFAULT 0,
            request_count INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP WITH TIME ZONE,
            refreshing_job_id UUID
        )
        """
    )
    op.execute(
        "ALTER TABLE search_jobs ADD COLUMN IF NOT EXISTS people JSON NOT NULL DEFAULT '[]'::json"
    )
    op.execute("ALTER TABLE search_jobs ADD COLUMN IF NOT EXISTS people_error VARCHAR(500)")
    op.execute(
        "ALTER TABLE search_jobs "
        "ADD COLUMN IF NOT EXISTS people_companies_searched INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE search_jobs "
        "ADD COLUMN IF NOT EXISTS people_request_count INTEGER NOT NULL DEFAULT 0"
    )
    op.execute("ALTER TABLE search_jobs DROP CONSTRAINT IF EXISTS ck_search_jobs_status")
    op.create_check_constraint(
        "ck_search_jobs_status",
        "search_jobs",
        "status IN ('queued', 'finding_companies', 'finding_people', 'done', 'failed')",
    )


def downgrade() -> None:
    op.execute("ALTER TABLE search_jobs DROP CONSTRAINT IF EXISTS ck_search_jobs_status")
    op.create_check_constraint(
        "ck_search_jobs_status",
        "search_jobs",
        "status IN ('queued', 'finding_companies', 'done', 'failed')",
    )
    op.drop_column("search_jobs", "people_request_count")
    op.drop_column("search_jobs", "people_companies_searched")
    op.drop_column("search_jobs", "people_error")
    op.drop_column("search_jobs", "people")
    op.drop_table("people_search_cache")
