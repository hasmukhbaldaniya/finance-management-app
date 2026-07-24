from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


# Moved here from claim-service's Postgres (Phase 4 of
# docs/PLANS/microservices-plan.md) — this service now owns the pending →
# completed/failed lifecycle for every extraction it performs, instead of
# the caller writing the log row after the fact. `claimInvoiceFileId`,
# `expenseId`, and `suggestedCategoryId` all point at claim-service's own
# tables (ClaimInvoiceFile/Expense/Category) — a real FK constraint can't
# span two different databases/engines, so all three are plain, unenforced
# integer columns. Correlating a row back to a Claim/Expense is done by
# matching `claimInvoiceFileId` + `pageNumber` (both sides already have
# this — Expense itself carries sourceInvoiceFileId/sourcePageNumber), not
# by claim-service reading back a live expenseId this service would
# otherwise have to be told about after the fact.
class AiExtractionLog(Base):
    __tablename__ = "ai_extraction_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    claim_invoice_file_id: Mapped[int] = mapped_column("claimInvoiceFileId", nullable=False)
    page_number: Mapped[int | None] = mapped_column("pageNumber", nullable=True)
    expense_id: Mapped[int | None] = mapped_column("expenseId", nullable=True)
    requested_at: Mapped[datetime] = mapped_column("requestedAt", DateTime, nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column("respondedAt", DateTime, nullable=True)
    raw_request_summary: Mapped[dict | None] = mapped_column("rawRequestSummary", JSON, nullable=True)
    raw_model_response: Mapped[dict | None] = mapped_column("rawModelResponse", JSON, nullable=True)
    suggested_category_id: Mapped[int | None] = mapped_column("suggestedCategoryId", nullable=True)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    red_flag_evaluations: Mapped[list | None] = mapped_column("redFlagEvaluations", JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column("errorMessage", Text, nullable=True)
