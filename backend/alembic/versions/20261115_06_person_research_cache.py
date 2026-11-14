"""Add cached, on-demand person-background research.

Revision ID: 20261115_06
Revises: 20261114_05
Create Date: 2026-11-15 09:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261115_06"
down_revision: str | None = "20261114_05"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE person_research_cache (
            person_id UUID NOT NULL PRIMARY KEY,
            person_name VARCHAR(256) NOT NULL,
            company_name VARCHAR(256) NOT NULL,
            profile_url VARCHAR(2048) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'queued',
            work_history JSON NOT NULL DEFAULT '[]'::json,
            education JSON NOT NULL DEFAULT '[]'::json,
            volunteer_experience JSON NOT NULL DEFAULT '[]'::json,
            error VARCHAR(500),
            fetched_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT ck_person_research_cache_status
                CHECK (status IN ('queued', 'researching', 'done', 'failed'))
        )
        """
    )


def downgrade() -> None:
    op.drop_table("person_research_cache")
