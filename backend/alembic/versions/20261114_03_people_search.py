"""Add key-people discovery batches and cache.

Revision ID: 20261114_03
Revises: 20261114_02
Create Date: 2026-11-14 00:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261114_03"
down_revision: str | None = "20261114_02"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "people_search_cache",
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("people", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("people_error", sa.String(length=500), nullable=True),
        sa.Column("companies_searched", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refreshing_job_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("cache_key"),
    )
    op.add_column(
        "search_jobs",
        sa.Column("people", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column("search_jobs", sa.Column("people_error", sa.String(length=500), nullable=True))
    op.add_column(
        "search_jobs",
        sa.Column("people_companies_searched", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "search_jobs",
        sa.Column("people_request_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.drop_constraint("ck_search_jobs_status", "search_jobs", type_="check")
    op.create_check_constraint(
        "ck_search_jobs_status",
        "search_jobs",
        "status IN ('queued', 'finding_companies', 'finding_people', 'done', 'failed')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_search_jobs_status", "search_jobs", type_="check")
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
