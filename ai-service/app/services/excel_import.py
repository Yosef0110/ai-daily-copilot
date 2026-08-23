"""
services/excel_import.py
--------------------------
Excel/CSV import: reads ONLY the first sheet (product decision - a
UMKM owner keeps one working sheet, this isn't API/Phase2's multi-
supplier, multi-format problem), fuzzy-matches its header row against
the canonical ERD field vocabulary below, and returns a column-mapped
preview a person confirms in web/app/imports before anything is
written to `products` / `transactions` / `transaction_items`.

Deliberately NOT a port of API/Phase2's qwen_matcher.py: that engine
solves a harder problem (grouping many DIFFERENT supplier formats, no
fixed vocabulary, needs a local LLM/Ollama). Here there is one sheet,
one owner, and a small fixed ERD - a rapidfuzz match against a short
canonical list is enough, and it avoids the Ollama/Qwen dependency for
a UMKM-facing feature that has to run without a GPU.
"""

from __future__ import annotations

import io

import pandas as pd
from rapidfuzz import fuzz, process

from app.schemas.imports import ColumnMapping, ExcelImportPreview, ProductMatch, TransactionDraft, TransactionItemDraft
from app.services.product_matching import match_product
from app.services.simplify import simplify_transaction

HEADER_MATCH_THRESHOLD = 0.6

# canonical ERD field -> header synonyms a person might actually type.
# Indonesian and English mixed on purpose - this is a UMKM tool, most
# source sheets will be Indonesian.
CANONICAL_HEADERS: dict[str, list[str]] = {
    "product_name": ["nama barang", "nama produk", "item", "produk", "product name", "product", "description", "nama"],
    "sku": ["sku", "kode barang", "kode produk", "product code", "kode"],
    "category": ["kategori", "category", "jenis"],
    "unit": ["satuan", "unit", "uom"],
    "quantity": ["qty", "jumlah", "quantity", "kuantitas", "banyak"],
    "unit_price": ["harga satuan", "harga", "unit price", "price", "harga jual", "harga beli"],
    "subtotal": ["subtotal", "total", "jumlah harga", "sub total", "total harga"],
    "transaction_date": ["tanggal", "date", "tgl", "waktu transaksi"],
    "current_stock": ["stok", "stock", "sisa stok", "current stock"],
}


def _match_header(header: str) -> ColumnMapping:
    header_norm = str(header).strip().lower()
    best_field, best_score = None, 0.0
    for field, synonyms in CANONICAL_HEADERS.items():
        result = process.extractOne(header_norm, synonyms, scorer=fuzz.WRatio)
        if result is None:
            continue
        _, score, _ = result
        score = score / 100.0
        if score > best_score:
            best_field, best_score = field, score
    if best_score < HEADER_MATCH_THRESHOLD:
        return ColumnMapping(source_header=str(header), mapped_field=None, confidence=round(best_score, 3))
    return ColumnMapping(source_header=str(header), mapped_field=best_field, confidence=round(best_score, 3))


def _normalize_date(raw: str) -> str | None:
    """Excel/CSV dates arrive as whatever a person typed or however
    Excel serialized them - "23/08/2026", "2026-08-23 00:00:00", a
    bare Excel serial number, etc. dayfirst=True because this targets
    Indonesian-owner sheets (DD/MM/YYYY), not US-locale files."""
    try:
        parsed = pd.to_datetime(raw, dayfirst=True, errors="raise")
    except (ValueError, TypeError):
        return None
    return parsed.strftime("%Y-%m-%d")


def _to_float(value, default: float = 0.0) -> float:
    """Assumes Indonesian number formatting (1.000,50 -> 1000.50) since
    this targets UMKM-owner sheets, not imported English-locale files."""
    if value is None:
        return default
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return default
    s = s.replace("Rp", "").replace("rp", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return default


def preview_excel_import(file_bytes: bytes, filename: str, product_candidates: list[dict]) -> ExcelImportPreview:
    """product_candidates: existing products for this business, same
    shape services.product_matching.match_product expects - passed in
    by the router (which gets it from the web/DB layer), keeping this
    function DB-free and unit-testable."""
    is_csv = filename.lower().endswith(".csv")
    if is_csv:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
        sheet_name = filename
    else:
        excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
        sheet_name = excel_file.sheet_names[0]
        df = excel_file.parse(sheet_name, dtype=str)

    df = df.dropna(how="all")
    mappings = [_match_header(col) for col in df.columns]
    unmatched = [m.source_header for m in mappings if m.mapped_field is None]
    field_to_col = {m.mapped_field: m.source_header for m in mappings if m.mapped_field}

    warnings: list[str] = []
    if "product_name" not in field_to_col:
        warnings.append("Tidak ada kolom yang cocok dengan 'nama barang' - baris tidak bisa diproses tanpa ini.")

    drafts: list[TransactionItemDraft] = []
    for _, row in df.iterrows():
        if "product_name" not in field_to_col:
            break
        name = str(row.get(field_to_col["product_name"], "")).strip()
        if not name or name.lower() == "nan":
            continue
        qty = _to_float(row.get(field_to_col.get("quantity", "")), default=1.0)
        price = _to_float(row.get(field_to_col.get("unit_price", "")), default=0.0)
        subtotal_col = field_to_col.get("subtotal")
        subtotal = _to_float(row.get(subtotal_col), default=qty * price) if subtotal_col else qty * price

        sku_col = field_to_col.get("sku")
        sku_val = str(row.get(sku_col, "")).strip() if sku_col else ""
        sku = sku_val if sku_val and sku_val.lower() != "nan" else None

        date_col = field_to_col.get("transaction_date")
        date_val = str(row.get(date_col, "")).strip() if date_col else ""
        transaction_date = _normalize_date(date_val) if date_val and date_val.lower() != "nan" else None

        match: ProductMatch = match_product(name, product_candidates)
        needs_review = match.is_new_product or match.match_score < 0.85
        drafts.append(
            TransactionItemDraft(
                raw_name=name,
                sku=sku,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
                transaction_date=transaction_date,
                product_match=match,
                needs_review=needs_review,
                review_reason=None if not needs_review else "Produk baru atau kecocokan rendah - perlu dicek manual.",
            )
        )

    # One TransactionDraft summarizing the whole sheet, purely so
    # simplify_transaction() has one shape to flatten - an excel import
    # isn't really "one transaction" the way a single struk is, but the
    # web layer integrating this only needs order_id/date/items/total,
    # not a rigid transaction boundary.
    first_date = next((d.transaction_date for d in drafts if d.transaction_date), None)
    summary_draft = TransactionDraft(
        transaction_type="purchase",
        transaction_date=first_date,
        total_amount=sum(d.subtotal for d in drafts),
        source="csv" if is_csv else "excel",
        items=drafts,
        confidence=1.0 if drafts else 0.0,
        needs_review=any(d.needs_review for d in drafts),
        warnings=warnings,
    )

    return ExcelImportPreview(
        source_file=filename,
        sheet_name=str(sheet_name),
        detected_row_count=len(df),
        column_mappings=mappings,
        unmatched_columns=unmatched,
        sample_rows=df.head(5).fillna("").to_dict(orient="records"),
        drafts=drafts,
        simplified=simplify_transaction(summary_draft, filename),
        warnings=warnings,
    )
