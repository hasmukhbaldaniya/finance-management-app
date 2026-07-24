from typing import Literal

from pydantic import BaseModel

# Field names deliberately stay camelCase, not the usual Python snake_case —
# this is the wire contract with the main Node.js backend
# (backend/src/services/ai-extraction.service.ts), which sends/expects these
# exact JSON keys. Kept in sync by hand across the two codebases, the same
# convention this monorepo already uses for shared constants between
# frontend/backend.


class CategoryFieldForExtraction(BaseModel):
    id: int
    fieldName: str
    fieldType: str
    tooltip: str | None = None
    config: dict = {}
    redFlagMode: str | None = None
    redFlagValue: str | None = None


class CategoryForExtraction(BaseModel):
    id: int
    name: str
    description: str | None = None
    fields: list[CategoryFieldForExtraction] = []


class ExtractRequestBody(BaseModel):
    documentBase64: str
    mediaType: Literal["application/pdf", "image/jpeg", "image/png"]
    categories: list[CategoryForExtraction]
    # Phase 4 of docs/PLANS/microservices-plan.md — this service now writes
    # its own AiExtractionLog row (it owns the table), so it needs these two
    # correlation keys from the caller instead of just being handed a
    # document to extract. `pageNumber` is the first page of the group for a
    # merged multi-page extraction, matching claim-service's own
    # runSourceExtraction semantics.
    claimInvoiceFileId: int
    pageNumber: int | None = None


class ExtractionLogEntry(BaseModel):
    claimInvoiceFileId: int
    pageNumber: int | None
    status: str


class ExtractionRedFlag(BaseModel):
    categoryFieldId: int
    triggered: bool
    reason: str


class ExtractSuccessResponse(BaseModel):
    suggestedCategoryId: int | None
    confidence: float | None
    extractedFields: dict[str, str]
    redFlags: list[ExtractionRedFlag]
    rawRequestSummary: dict
    rawModelResponse: dict


class ExtractErrorResponse(BaseModel):
    error: str
