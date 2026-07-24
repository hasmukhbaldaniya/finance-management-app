from fastapi import APIRouter, Depends, Query

from app.db import get_session
from app.db_models import AiExtractionLog
from app.dependencies import require_internal_auth
from app.models import ExtractionLogEntry

router = APIRouter(prefix="/extraction-logs", dependencies=[Depends(require_internal_auth)])


# The one read claim-service still needs against this service's own table,
# now that AiExtractionLog moved here (Phase 4 of
# docs/PLANS/microservices-plan.md) — replaces what used to be a local
# AiExtractionLog.findAll query in claim-ai.controller.ts, both for the
# already-logged dedup check (runExtractionForClaim) and the processing-
# status poll (getProcessingStatus). Correlates purely by
# claimInvoiceFileId, matching the caller's own file ids — no expenseId
# round trip needed.
@router.get("")
async def list_extraction_logs(claimInvoiceFileIds: str = Query(...)) -> dict:
    ids = [int(value) for value in claimInvoiceFileIds.split(",") if value.strip().isdigit()]
    if not ids:
        return {"logs": []}

    session = get_session()
    try:
        rows = session.query(AiExtractionLog).filter(AiExtractionLog.claim_invoice_file_id.in_(ids)).all()
        return {
            "logs": [
                ExtractionLogEntry(
                    claimInvoiceFileId=row.claim_invoice_file_id,
                    pageNumber=row.page_number,
                    status=row.status,
                ).model_dump()
                for row in rows
            ]
        }
    finally:
        session.close()
