"""Replace company-stage labels with headcount ranges.

Revision ID: 20261114_03
Revises: 20261114_02
Create Date: 2026-11-14 21:40:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261114_03"
down_revision: str | None = "20261114_02"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_search_jobs_company_size", "search_jobs", type_="check")
    op.execute(
        """
        UPDATE search_jobs
        SET company_size = CASE company_size
            WHEN 'startup' THEN 'small'
            WHEN 'sme' THEN 'medium'
            ELSE company_size
        END
        """
    )
    op.create_check_constraint(
        "ck_search_jobs_company_size",
        "search_jobs",
        "company_size IN ('small', 'medium', 'large')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_search_jobs_company_size", "search_jobs", type_="check")
    op.execute(
        """
        UPDATE search_jobs
        SET company_size = CASE company_size
            WHEN 'small' THEN 'startup'
            WHEN 'medium' THEN 'sme'
            ELSE company_size
        END
        """
    )
    op.create_check_constraint(
        "ck_search_jobs_company_size",
        "search_jobs",
        "company_size IN ('startup', 'sme', 'large')",
    )
