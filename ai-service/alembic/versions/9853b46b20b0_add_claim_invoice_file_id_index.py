"""add index on ai_extraction_logs.claimInvoiceFileId

Revision ID: 9853b46b20b0
Revises: d3d4e5f80e2c
Create Date: 2026-07-24 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '9853b46b20b0'
down_revision: Union[str, Sequence[str], None] = 'd3d4e5f80e2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Backs logs.py's WHERE claim_invoice_file_id IN (...) — claim-service's
    # dedup-check (runExtractionForClaim) and status-poll (getProcessingStatus)
    # both query on this column and it had no index beyond the primary key.
    op.create_index('ix_ai_extraction_logs_claim_invoice_file_id', 'ai_extraction_logs', ['claimInvoiceFileId'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ai_extraction_logs_claim_invoice_file_id', table_name='ai_extraction_logs')
