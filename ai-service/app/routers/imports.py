"""
routers/imports.py
--------------------
Two entry points for turning a UMKM owner's raw source (a photo of a
struk, or an Excel/CSV export) into a reviewable draft matching
docs/ERD.md. Both endpoints are read-only from the AI service's
perspective - they never write to Supabase. The web layer
(web/app/imports + web/app/api/*) is what persists a draft after a
person confirms it in the review UI - same three-layer split as
PastWorks/Phase4b: AI proposes, this layer flags what needs review, a
person decides.

product_candidates (existing products, for fuzzy matching) is passed
in as a form field rather than fetched here: ai-service has no
Supabase credentials/session of its own, and the web layer already has
the business's product list on the page and can pass it straight
through as JSON.
"""

from __future__ import annotations

import json
import mimetypes
import zipfile
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.imports import (
    ExcelImportPreview,
    ReceiptImportBatchResult,
    ReceiptImportError,
    ReceiptImportResult,
)
from app.services.excel_import import preview_excel_import
from app.services.receipt_extraction import extract_receipt

router = APIRouter(prefix="/imports", tags=["imports"])

# Gemini's multimodal input accepts these directly (bytes + mime_type) with
# no conversion on our side - including "application/pdf", which Gemini
# reads as a document (all pages), not just an image.
_ALLOWED_RECEIPT_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
}
_ALLOWED_RECEIPT_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"}
_ZIP_MIME = {"application/zip", "application/x-zip-compressed"}
_ALLOWED_EXCEL_EXT = (".xlsx", ".xls", ".csv")
# Entries a zip export commonly carries that are never a receipt - skip
# silently instead of reporting them as errors.
_ZIP_SKIP_NAMES = {"__macosx", ".ds_store", "thumbs.db"}


def _parse_candidates(raw: str) -> list[dict]:
    try:
        candidates = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "product_candidates harus berupa JSON array yang valid.")
    if not isinstance(candidates, list):
        raise HTTPException(400, "product_candidates harus berupa JSON array.")
    return candidates


def _looks_like_zip(filename: str, content_type: Optional[str]) -> bool:
    return filename.lower().endswith(".zip") or content_type in _ZIP_MIME


def _guess_mime(filename: str, content_type: Optional[str]) -> Optional[str]:
    if content_type in _ALLOWED_RECEIPT_MIME:
        return content_type
    guessed, _ = mimetypes.guess_type(filename)
    return guessed if guessed in _ALLOWED_RECEIPT_MIME else None


def _process_one(
    data: bytes,
    filename: str,
    mime_type: str,
    candidates: list[dict],
    transaction_type: str,
    results: list[ReceiptImportResult],
    errors: list[ReceiptImportError],
) -> None:
    try:
        results.append(extract_receipt(data, mime_type, filename, candidates, transaction_type))
    except RuntimeError as exc:
        errors.append(ReceiptImportError(source_file=filename, message=str(exc)))


def _process_zip(
    data: bytes,
    zip_name: str,
    candidates: list[dict],
    transaction_type: str,
    results: list[ReceiptImportResult],
    errors: list[ReceiptImportError],
) -> None:
    try:
        archive = zipfile.ZipFile(BytesIO(data))
    except zipfile.BadZipFile:
        errors.append(ReceiptImportError(source_file=zip_name, message="File .zip rusak atau tidak valid."))
        return

    with archive:
        entries = [e for e in archive.infolist() if not e.is_dir()]
        found_any = False
        for entry in entries:
            base_name = entry.filename.rsplit("/", 1)[-1]
            if not base_name or base_name.startswith("."):
                continue
            lower = base_name.lower()
            if any(skip in entry.filename.lower() for skip in _ZIP_SKIP_NAMES):
                continue
            ext = "." + lower.rsplit(".", 1)[-1] if "." in lower else ""
            if ext not in _ALLOWED_RECEIPT_EXT:
                continue  # ignore non-receipt entries (readme, folders, etc.) rather than erroring the batch
            found_any = True
            mime_type = _guess_mime(base_name, None) or "application/octet-stream"
            entry_bytes = archive.read(entry)
            _process_one(
                entry_bytes,
                f"{zip_name}/{base_name}",
                mime_type,
                candidates,
                transaction_type,
                results,
                errors,
            )
        if not found_any:
            errors.append(
                ReceiptImportError(
                    source_file=zip_name,
                    message="Tidak ada foto struk (.jpg/.png/.webp/.pdf) yang ditemukan di dalam .zip ini.",
                )
            )


@router.post("/receipt", response_model=ReceiptImportBatchResult)
async def import_receipt(
    files: list[UploadFile] = File(...),
    product_candidates: str = Form("[]"),
    transaction_type: str = Form("purchase"),
):
    """Accepts one or more files in a single request: any mix of receipt
    photos (jpg/png/webp/heic), PDFs, and .zip archives of receipt
    photos. Every file/zip-entry is processed independently - one bad
    photo doesn't fail the rest of the batch.

    product_candidates: JSON string, [{"id": ..., "name": ..., "aliases": [...]}].
    """
    candidates = _parse_candidates(product_candidates)
    results: list[ReceiptImportResult] = []
    errors: list[ReceiptImportError] = []

    for file in files:
        filename = file.filename or "receipt"
        data = await file.read()
        if not data:
            errors.append(ReceiptImportError(source_file=filename, message="File kosong."))
            continue

        if _looks_like_zip(filename, file.content_type):
            _process_zip(data, filename, candidates, transaction_type, results, errors)
            continue

        mime_type = _guess_mime(filename, file.content_type)
        if not mime_type:
            errors.append(
                ReceiptImportError(
                    source_file=filename,
                    message=f"Tipe file tidak didukung: {file.content_type or 'tidak diketahui'}. "
                    "Unggah foto struk (jpg/png/webp), PDF, atau .zip berisi foto-foto struk.",
                )
            )
            continue

        _process_one(data, filename, mime_type, candidates, transaction_type, results, errors)

    return ReceiptImportBatchResult(results=results, errors=errors)


@router.post("/excel/preview", response_model=ExcelImportPreview)
async def import_excel_preview(
    file: UploadFile = File(...),
    product_candidates: str = Form("[]"),
):
    if not (file.filename or "").lower().endswith(_ALLOWED_EXCEL_EXT):
        raise HTTPException(400, "Tipe file tidak didukung. Unggah .xlsx, .xls, atau .csv.")
    file_bytes = await file.read()
    candidates = _parse_candidates(product_candidates)
    try:
        return preview_excel_import(file_bytes, file.filename, candidates)
    except Exception as exc:  # pandas/openpyxl raise many different error types on a malformed sheet
        raise HTTPException(400, f"Gagal membaca file: {exc}")
