from fastapi import APIRouter, Depends

from app.dependencies import require_internal_auth
from app.models import ExtractRequestBody
from app.services.anthropic_extraction import extract_invoice_data

router = APIRouter(prefix="/extract", dependencies=[Depends(require_internal_auth)])


# The one endpoint this service exposes. Stateless: no database, no audit
# logging here (the caller — the main backend's AiExtractionLog — owns
# that), just "given this document and these categories, return a
# structured extraction."
@router.post("")
async def extract(body: ExtractRequestBody) -> dict:
    return extract_invoice_data(body.documentBase64, body.mediaType, body.categories)
