"""Add non-reusable, profile-scoped match runs.

Revision ID: 20261115_07
Revises: 20261115_06
Create Date: 2026-11-15 11:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261115_07"
down_revision: str | None = "20261115_06"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE match_runs (
            id UUID NOT NULL PRIMARY KEY,
            job_id UUID NOT NULL,
            client_id UUID NOT NULL,
            profile VARCHAR(4000),
            status VARCHAR(32) NOT NULL DEFAULT 'queued',
            candidate_ids JSON NOT NULL DEFAULT '[]'::json,
            results JSON NOT NULL DEFAULT '[]'::json,
            completed_count INTEGER NOT NULL DEFAULT 0,
            error VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            completed_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT ck_match_runs_status
                CHECK (status IN ('queued', 'researching', 'matching', 'done', 'failed'))
        )
        """
    )
    op.create_index("ix_match_runs_job_id", "match_runs", ["job_id"])
    op.create_index("ix_match_runs_client_id", "match_runs", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_match_runs_client_id", table_name="match_runs")
    op.drop_index("ix_match_runs_job_id", table_name="match_runs")
    op.drop_table("match_runs")
