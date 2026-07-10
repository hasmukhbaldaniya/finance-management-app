from anthropic import Anthropic

from app.config import settings
from app.models import CategoryForExtraction, ExtractErrorResponse, ExtractSuccessResponse

# The one place that talks to the AI/ML provider — 023's own "The AI/ML
# Service" design section calls for a dedicated service, not something
# inlined into the claims controller; this package IS that dedicated
# service (a genuinely separate backend process, not just a separate code
# module), per explicit instruction — and, per a later instruction, written
# in Python rather than Node/TypeScript, since Python is the better fit for
# AI/ML work (the official Anthropic SDK, and the broader ecosystem, both
# assume Python first).

EXTRACTION_TOOL_NAME = "record_extraction"


def _build_tool_schema() -> dict:
    return {
        "name": EXTRACTION_TOOL_NAME,
        "description": "Record the result of reading one expense bill/invoice.",
        "input_schema": {
            "type": "object",
            "properties": {
                "suggestedCategoryName": {
                    "type": "string",
                    "description": "The exact name of the best-matching category from the provided list. Empty string if none fit.",
                },
                "confidence": {"type": "number", "description": "How confident you are in the category match, from 0 to 1."},
                "extractedFields": {
                    "type": "object",
                    "additionalProperties": {"type": "string"},
                    "description": (
                        "Map of the matched category's field name (exactly as given) to the value you read from the "
                        "bill, as a plain string. Omit any field you could not confidently read — do not guess."
                    ),
                },
                "redFlags": {
                    "type": "array",
                    "description": "Only for the matched category's fields whose Red Flag mode is 'ai' — one entry per such field.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "fieldName": {"type": "string"},
                            "triggered": {"type": "boolean"},
                            "reason": {"type": "string"},
                        },
                        "required": ["fieldName", "triggered", "reason"],
                    },
                },
            },
            "required": ["suggestedCategoryName", "confidence", "extractedFields", "redFlags"],
        },
    }


def _describe_categories_for_prompt(categories: list[CategoryForExtraction]) -> str:
    lines: list[str] = []
    for category in categories:
        field_lines: list[str] = []
        for field in category.fields:
            hints = [field.fieldType]
            if field.config.get("useAsClaimAmount") is True:
                hints.append("this is the Claim Amount field — use the bill's final grand total, not a subtotal or line item")
            if field.config.get("useAsExpenseDate") is True:
                hints.append("this is the Expense Date field")
            if field.config.get("useAsInvoiceNumber") is True:
                hints.append("this is the Invoice/Bill Number field")
            if field.redFlagMode == "ai" and field.redFlagValue:
                hints.append(f'AI red flag check: "{field.redFlagValue}"')
            if field.tooltip:
                hints.append(field.tooltip)
            field_lines.append(f'    - "{field.fieldName}" ({"; ".join(hints)})')
        description_suffix = f" — {category.description}" if category.description else ""
        lines.append(f'- "{category.name}"{description_suffix}\n' + "\n".join(field_lines))
    return "\n".join(lines)


def _get_client() -> Anthropic | None:
    if not settings.anthropic_api_key:
        return None
    return Anthropic(api_key=settings.anthropic_api_key)


# `document_base64` is either a single-page/whole-image or a standalone PDF
# (one page, or several merged pages — see the backend's Merge/Unmerge)
# built via pdf-lib on the Node.js side, never rasterized to an image —
# Claude's vision API accepts PDF documents natively.
def extract_invoice_data(document_base64: str, media_type: str, categories: list[CategoryForExtraction]) -> dict:
    client = _get_client()
    prompt_text = (
        "You are extracting data from one expense bill/invoice for an expense-claim system. "
        "Choose which of the following categories best matches this bill, then extract the "
        "values for that category's own fields, and evaluate any AI red flag checks that "
        "category's fields define.\n\n"
        f"Available categories:\n{_describe_categories_for_prompt(categories)}\n\n"
        f"Call the {EXTRACTION_TOOL_NAME} tool with your result. If nothing matches, use an "
        "empty suggestedCategoryName and leave extractedFields/redFlags empty."
    )

    if media_type == "application/pdf":
        content_block = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": document_base64}}
    else:
        content_block = {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": document_base64}}

    raw_request_summary = {
        "model": settings.ai_model,
        "mediaType": media_type,
        "categoryNames": [category.name for category in categories],
        "promptText": prompt_text,
    }

    if client is None:
        return ExtractErrorResponse(error="AI/ML service is not configured — set ANTHROPIC_API_KEY to enable real extraction.").model_dump()

    try:
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=2048,
            tools=[_build_tool_schema()],
            tool_choice={"type": "tool", "name": EXTRACTION_TOOL_NAME},
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": prompt_text}]}],
        )
    except Exception as err:  # A provider error should degrade the one source, not crash the request.
        return ExtractErrorResponse(error=str(err) or "AI/ML service call failed.").model_dump()

    tool_use = next((block for block in response.content if block.type == "tool_use"), None)
    if tool_use is None:
        return ExtractErrorResponse(error="AI/ML service returned no structured result.").model_dump()

    result = tool_use.input if isinstance(tool_use.input, dict) else {}
    suggested_name = str(result.get("suggestedCategoryName") or "").lower()
    matched_category = next((category for category in categories if category.name.lower() == suggested_name), None)
    field_by_name = {field.fieldName.lower(): field for field in (matched_category.fields if matched_category else [])}

    extracted_fields: dict[str, str] = {}
    for name, value in (result.get("extractedFields") or {}).items():
        field = field_by_name.get(str(name).lower())
        if field and isinstance(value, str) and value.strip():
            extracted_fields[str(field.id)] = value.strip()

    red_flags: list[dict] = []
    for flag in result.get("redFlags") or []:
        field = field_by_name.get(str(flag.get("fieldName", "")).lower())
        if field:
            red_flags.append({"categoryFieldId": field.id, "triggered": flag.get("triggered") is True, "reason": flag.get("reason") or ""})

    confidence = result.get("confidence")
    return ExtractSuccessResponse(
        suggestedCategoryId=matched_category.id if matched_category else None,
        confidence=confidence if isinstance(confidence, (int, float)) else None,
        extractedFields=extracted_fields,
        redFlags=red_flags,
        rawRequestSummary=raw_request_summary,
        rawModelResponse=result,
    ).model_dump()
