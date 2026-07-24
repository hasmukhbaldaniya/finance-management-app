from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.db import get_session
from app.db_models import AiExtractionLog
from app.dependencies import require_internal_auth
from app.models import ExtractRequestBody
from app.services.anthropic_extraction import extract_invoice_data

router = APIRouter(prefix="/extract", dependencies=[Depends(require_internal_auth)])


# Phase 4 of docs/PLANS/microservices-plan.md — this service now owns the
# full pending → completed/failed lifecycle for every extraction it
# performs, writing its own AiExtractionLog row (this service's own table,
# in its own MySQL database) instead of the caller (claim-service) writing
# one after the fact. The extraction result payload returned to the caller
# is unchanged from before this move — only the logging responsibility
# shifted sides.
@router.post("")
async def extract(body: ExtractRequestBody) -> dict:
    session = get_session()
    log = AiExtractionLog(
        claim_invoice_file_id=body.claimInvoiceFileId,
        page_number=body.pageNumber,
        expense_id=None,
        requested_at=datetime.now(timezone.utc),
        responded_at=None,
        status="pending",
    )
    session.add(log)
    session.commit()

    try:
        result = extract_invoice_data(body.documentBase64, body.mediaType, body.categories)
    except Exception as err:
        result = {"error": str(err) or "AI/ML service call failed."}

    log.responded_at = datetime.now(timezone.utc)
    if "error" in result:
        log.status = "failed"
        log.error_message = result["error"]
    else:
        log.status = "completed"
        log.raw_request_summary = result.get("rawRequestSummary")
        log.raw_model_response = result.get("rawModelResponse")
        log.suggested_category_id = result.get("suggestedCategoryId")
        confidence = result.get("confidence")
        log.confidence = confidence
    session.commit()
    session.close()

    return result
