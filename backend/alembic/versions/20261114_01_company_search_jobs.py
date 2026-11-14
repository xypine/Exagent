"""Add company-search jobs and cache.

Revision ID: 20261114_01
Revises:
Create Date: 2026-11-14 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261114_01"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "company_search_cache",
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("companies", sa.JSON(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refreshing_job_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("cache_key"),
    )
    op.create_table(
        "search_jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("area", sa.String(length=120), nullable=False),
        sa.Column("industry", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("companies", sa.JSON(), nullable=False),
        sa.Column("error", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'finding_companies', 'done', 'failed')",
            name="ck_search_jobs_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_search_jobs_cache_key", "search_jobs", ["cache_key"])
    op.create_index("ix_search_jobs_client_id", "search_jobs", ["client_id"])
    op.create_index("ix_search_jobs_status", "search_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_search_jobs_status", table_name="search_jobs")
    op.drop_index("ix_search_jobs_client_id", table_name="search_jobs")
    op.drop_index("ix_search_jobs_cache_key", table_name="search_jobs")
    op.drop_table("search_jobs")
    op.drop_table("company_search_cache")
