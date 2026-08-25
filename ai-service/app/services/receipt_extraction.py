"""
services/receipt_extraction.py
-------------------------------
Struk (retail receipt) photo -> a draft matching the `transactions` +
`transaction_items` shape from docs/ERD.md. Calls Gemini's multimodal
input directly on the image - unlike API/Phase1 (built for multi-page
supplier POs), a receipt is one photo, usually one column of items, so
the MinerU-to-markdown step that pipeline relies on isn't needed here.

Item-to-product matching is services/product_matching.py's job, kept
separate so both stay independently testable.
"""

from __future__ import annotations

import json
import logging
import re

from google.genai import types

_log = logging.getLogger(__name__)

from app.schemas.imports import ReceiptImportResult, TransactionDraft, TransactionItemDraft
from app.services.gemini_client import mark_bad, pick_client
from app.services.product_matching import match_product
from app.services.simplify import simplify_transaction

_MODEL = "gemini-3.6-flash"

_PROMPT = """Kamu membaca foto STRUK BELANJA (retail receipt) milik sebuah usaha kecil (UMKM) di Indonesia.
Baca semua baris item pada struk dan keluarkan HANYA satu objek JSON, tanpa teks lain di luar JSON, dengan bentuk persis ini:

{
  "transaction_date": "<tanggal transaksi format ISO 8601 YYYY-MM-DD, atau null jika tidak terbaca>",
  "total_amount": <angka total struk, tanpa simbol mata uang>,
  "items": [
    {
      "name": "<nama barang persis seperti tertulis di struk>",
      "sku": "<kode/barcode/PLU barang kalau tercetak di struk, null kalau tidak ada - kebanyakan struk retail kecil TIDAK mencetak ini, jangan mengarang>",
      "quantity": <angka, default 1 jika tidak tertulis>,
      "unit_price": <harga satuan>,
      "subtotal": <quantity dikali unit_price, atau nilai yang tertulis di struk untuk baris ini>
    }
  ],
  "warnings": ["<catatan singkat kalau ada bagian struk yang buram/tidak yakin, list kosong kalau tidak ada>"]
}

Aturan penting:
- Jangan mengarang nilai yang tidak terbaca di foto. Kalau benar-benar tidak terbaca, gunakan null untuk field itu dan tambahkan catatan singkat di "warnings".
- quantity dan harga harus angka murni (contoh: 15000, bukan "Rp15.000" atau "15rb").
- Kalau ada diskon/pajak/biaya layanan terpisah dari daftar barang, jangan masukkan sebagai item - cukup pastikan total_amount tetap sesuai total akhir struk, dan sebutkan di "warnings"."""

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json_block(text: str) -> dict:
    match = _JSON_BLOCK_RE.search(text)
    if not match:
        raise ValueError("no JSON object found in Gemini response")
    return json.loads(match.group(0))


def extract_receipt(
    image_bytes: bytes,
    mime_type: str,
    source_file: str,
    product_candidates: list[dict],
    transaction_type: str = "purchase",
) -> ReceiptImportResult:
    key, client = pick_client()
    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                _PROMPT,
            ],
        )
    except Exception as exc:
        # Full traceback goes to the uvicorn console only - never into the
        # HTTP response, since Google's SDK errors sometimes echo the
        # request URL (which can include the API key as a query param).
        _log.exception("Gemini call failed for %s", source_file)
        mark_bad(key)
        raise RuntimeError(
            f"Gagal memanggil Gemini untuk membaca struk ({type(exc).__name__}: {exc}). "
            "Coba lagi, atau cek GEMINI_API_KEY."
        )

    raw_text = response.text or ""
    try:
        parsed = _extract_json_block(raw_text)
    except (ValueError, json.JSONDecodeError):
        raise RuntimeError("Gemini membalas tapi hasilnya bukan JSON yang valid - coba foto struk yang lebih jelas.")

    items: list[TransactionItemDraft] = []
    for raw_item in parsed.get("items") or []:
        name = str(raw_item.get("name") or "").strip()
        if not name:
            continue
        quantity = float(raw_item.get("quantity") or 1)
        unit_price = float(raw_item.get("unit_price") or 0)
        subtotal = float(raw_item.get("subtotal") or (quantity * unit_price))
        raw_sku = raw_item.get("sku")
        sku = str(raw_sku).strip() if raw_sku not in (None, "", "null") else None
        match = match_product(name, product_candidates)
        needs_review = match.is_new_product or match.match_score < 0.85
        items.append(
            TransactionItemDraft(
                raw_name=name,
                sku=sku,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
                product_match=match,
                needs_review=needs_review,
                review_reason=None if not needs_review else "Produk baru atau kecocokan rendah - perlu dicek manual.",
            )
        )

    warnings = list(parsed.get("warnings") or [])
    if not items:
        warnings.append("Tidak ada item yang berhasil dibaca dari struk ini.")

    confident_items = sum(0 if i.needs_review else 1 for i in items)
    draft = TransactionDraft(
        transaction_type=transaction_type if transaction_type in ("sale", "purchase") else "purchase",
        transaction_date=parsed.get("transaction_date"),
        total_amount=float(parsed.get("total_amount") or sum(i.subtotal for i in items)),
        source="ocr",
        items=items,
        confidence=0.0 if not items else round(confident_items / len(items), 3),
        needs_review=True,
        warnings=warnings,
    )
    return ReceiptImportResult(
        source_file=source_file,
        draft=draft,
        simplified=simplify_transaction(draft, source_file),
        raw_text=raw_text,
    )
