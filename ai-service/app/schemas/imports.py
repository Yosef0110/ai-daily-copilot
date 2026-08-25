"""
schemas/imports.py
-------------------
Pydantic response/request shapes for the two import entry points
(struk/receipt photo -> data, and Excel/CSV -> data). Everything here
is a DRAFT: nothing in this module ever gets written to Supabase
directly. Same three-layer split as PastWorks/Phase4b (AI proposes,
deterministic checks flag what needs a look, a person decides) - the
ai-service's job stops at proposing a mapped, confidence-scored draft;
committing it to `products` / `transactions` / `transaction_items`
(see docs/ERD.md) is the web layer's job (web/app/api/*), only after a
person has reviewed it in web/app/imports.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ProductMatch(BaseModel):
    """Result of matching one extracted/imported item name against a
    business's existing `products` (+ `product_aliases`)."""

    matched_product_id: Optional[str] = None
    matched_product_name: Optional[str] = None
    matched_product_sku: Optional[str] = None
    match_score: float = Field(ge=0, le=1, description="0-1 fuzzy match confidence; 1.0 = exact alias/name hit")
    is_new_product: bool = False


class TransactionItemDraft(BaseModel):
    raw_name: str
    sku: Optional[str] = None  # from the source (excel "sku" column, or a barcode/code printed on the struk) - not the same as product_match.matched_product_sku, which comes from an EXISTING product record
    quantity: float
    unit_price: float
    subtotal: float
    transaction_date: Optional[str] = None  # ISO 8601 date; per-row because one excel sheet can span several purchase dates
    product_match: ProductMatch
    needs_review: bool = False
    review_reason: Optional[str] = None


class TransactionDraft(BaseModel):
    transaction_type: Literal["sale", "purchase"] = "purchase"
    transaction_date: Optional[str] = None
    total_amount: float
    source: Literal["ocr", "excel", "csv", "manual"] = "ocr"
    items: list[TransactionItemDraft]
    confidence: float = Field(ge=0, le=1)
    needs_review: bool = True
    warnings: list[str] = Field(default_factory=list)


class ReceiptImportResult(BaseModel):
    source_file: str
    draft: TransactionDraft
    simplified: SimplifiedTransaction  # defined below in this module - flattened shape ready for downstream integration
    raw_text: Optional[str] = None  # what Gemini actually read, so a person can sanity-check it against the photo


class ReceiptImportError(BaseModel):
    source_file: str
    message: str


class ReceiptImportBatchResult(BaseModel):
    """Response for POST /imports/receipt. Always a batch, even for one
    file, so the frontend has one shape to render whether the person
    uploaded a single photo, several photos, a PDF, or a .zip of
    photos. One bad file (blurry photo, corrupt page, non-receipt
    entry inside a zip) never fails the whole upload - it just lands
    in `errors` next to the `results` that did work."""

    results: list[ReceiptImportResult]
    errors: list[ReceiptImportError] = Field(default_factory=list)


class SimplifiedItem(BaseModel):
    """Flattened item shape for downstream integration (e.g. the web
    layer writing to `transaction_items`, or a quick demo) - one level
    less nested than TransactionItemDraft, and uses the matched
    product's name/SKU when there's a confident match instead of the
    raw OCR/excel text."""

    product_name: str
    sku: Optional[str] = None
    quantity: float
    unit_price: float
    subtotal: float
    is_new_product: bool = False


class SimplifiedTransaction(BaseModel):
    """Flattened, ready-to-integrate shape derived from a
    TransactionDraft (either source: struk photo or excel row group).
    order_id/imported_at are generated here, not by Gemini or the
    excel reader - a receipt/sheet rarely carries its own order id, and
    imported_at is this service's own processing timestamp, not
    anything read from the source file."""

    order_id: str
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    imported_at: str  # ISO 8601 UTC timestamp - when THIS import ran, not the transaction date
    source: Literal["ocr", "excel", "csv", "manual"]
    source_file: str
    total_amount: float
    items: list[SimplifiedItem]


class ColumnMapping(BaseModel):
    source_header: str
    mapped_field: Optional[str]  # canonical ERD field, e.g. "product_name", "quantity" - None if unmatched
    confidence: float = Field(ge=0, le=1)


class ExcelImportPreview(BaseModel):
    source_file: str
    sheet_name: str
    detected_row_count: int
    column_mappings: list[ColumnMapping]
    unmatched_columns: list[str]
    sample_rows: list[dict]
    drafts: list[TransactionItemDraft]
    simplified: SimplifiedTransaction  # flattened shape ready for downstream integration
    warnings: list[str] = Field(default_factory=list)
