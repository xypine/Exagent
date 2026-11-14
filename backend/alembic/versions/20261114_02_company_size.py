"""Add company-size filtering to company-search jobs.

Revision ID: 20261114_02
Revises: 20261114_01
Create Date: 2026-11-14 19:20:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261114_02"
down_revision: str | None = "20261114_01"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "search_jobs",
        sa.Column("company_size", sa.String(length=32), nullable=True),
    )
    op.create_check_constraint(
        "ck_search_jobs_company_size",
        "search_jobs",
        "company_size IN ('startup', 'sme', 'large')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_search_jobs_company_size", "search_jobs", type_="check")
    op.drop_column("search_jobs", "company_size")
