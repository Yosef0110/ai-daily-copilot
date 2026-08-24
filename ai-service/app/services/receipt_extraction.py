"""
services/receipt_extraction.py
-------------------------------
Struk (retail receipt) photo -> a draft matching the `transactions` +
`transaction_items` shape from docs/ERD.md. Two backends, switched by
RECEIPT_BACKEND (env var, default "gemini"):

- "gemini" (default): Gemini's multimodal input reads the photo
  directly. A receipt is one photo, usually one column of items, so
  the MinerU-to-markdown step API/Phase1 relies on (built for
  multi-page supplier POs) isn't strictly needed here - this path
  skips it.
- "mineru": mirrors API/Phase1's actual pipeline instead - MinerU
  reads the photo's layout locally (CPU, no GPU, no network) into
  markdown, then a Qwen model via Ollama (see ollama_client.py, meant
  to run on a rented GPU) reshapes that markdown into the same JSON
  schema Gemini produces on the other path. Useful when you'd rather
  not depend on Gemini's API (network reliability, wanting to show a
  self-hosted model, no per-request API cost) and already have MinerU
  + an Ollama-reachable GPU set up.

Both backends produce the exact same TransactionDraft/SimplifiedTransaction
shape - routers/imports.py and web/app/imports/page.tsx don't need to
know or care which one ran.

Item-to-product matching is services/product_matching.py's job, kept
separate so both stay independently testable.
"""

from __future__ import annotations

import json
import logging
import os
import re

from google.genai import types

from app.schemas.imports import ReceiptImportResult, TransactionDraft, TransactionItemDraft
from app.services.gemini_client import mark_bad, pick_client
from app.services.product_matching import match_product
from app.services.progress import clear_stage, set_stage
from app.services.simplify import simplify_transaction

_log = logging.getLogger(__name__)

RECEIPT_BACKEND = os.environ.get("RECEIPT_BACKEND", "gemini")

_GEMINI_MODEL = "gemini-3.6-flash"

_JSON_SCHEMA_BLOCK = """{
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
}"""

_RULES_BLOCK = """Aturan penting:
- Jangan mengarang nilai yang tidak terbaca. Kalau benar-benar tidak terbaca/tidak ada, gunakan null untuk field itu dan tambahkan catatan singkat di "warnings".
- quantity dan harga harus angka murni (contoh: 15000, bukan "Rp15.000" atau "15rb").
- Kalau ada diskon/pajak/biaya layanan terpisah dari daftar barang, jangan masukkan sebagai item - cukup pastikan total_amount tetap sesuai total akhir struk, dan sebutkan di "warnings"."""

_GEMINI_PROMPT = f"""Kamu membaca foto STRUK BELANJA (retail receipt) milik sebuah usaha kecil (UMKM) di Indonesia.
Baca semua baris item pada struk dan keluarkan HANYA satu objek JSON, tanpa teks lain di luar JSON, dengan bentuk persis ini:

{_JSON_SCHEMA_BLOCK}

{_RULES_BLOCK}"""

_MINERU_SYSTEM_PROMPT = f"""Kamu menerima hasil OCR (markdown) dari sebuah STRUK BELANJA (retail receipt) milik usaha kecil (UMKM) di Indonesia. Teks ini sudah dibaca oleh alat OCR terpisah (MinerU) - tugasmu HANYA merapikan/reshape teks itu jadi satu objek JSON, tanpa teks lain di luar JSON, dengan bentuk persis ini:

{_JSON_SCHEMA_BLOCK}

{_RULES_BLOCK}
- Teks sumbernya hasil OCR, jadi mungkin ada typo/kesalahan baca kecil dari OCR-nya sendiri - perbaiki kalau jelas maksudnya (misal angka yang kepisah baris), tapi jangan mengarang item yang tidak ada di teks."""

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json_block(text: str) -> dict:
    match = _JSON_BLOCK_RE.search(text)
    if not match:
        raise ValueError("no JSON object found in model response")
    return json.loads(match.group(0))


def _call_gemini(image_bytes: bytes, mime_type: str, source_file: str) -> str:
    # print(), not _log.info(): guaranteed to show in the uvicorn console
    # regardless of logging config, so a person watching the terminal can
    # see which stage a request is at right now - not just the final
    # result or an error after the fact.
    print(f"[receipt:{source_file}] backend=gemini - mengirim foto ke Gemini ({_GEMINI_MODEL})...")
    set_stage(source_file, f"Mengirim foto ke Gemini ({_GEMINI_MODEL})...")
    key, client = pick_client()
    try:
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                _GEMINI_PROMPT,
            ],
        )
    except Exception as exc:
        # Full traceback goes to the uvicorn console only - never into the
        # HTTP response, since Google's SDK errors sometimes echo the
        # request URL (which can include the API key as a query param).
        _log.exception("Gemini call failed for %s", source_file)
        print(f"[receipt:{source_file}] GAGAL di panggilan Gemini: {type(exc).__name__}: {exc}")
        mark_bad(key)
        raise RuntimeError(
            f"Gagal memanggil Gemini untuk membaca struk ({type(exc).__name__}: {exc}). "
            "Coba lagi, atau cek GEMINI_API_KEY."
        )
    print(f"[receipt:{source_file}] Gemini selesai membaca struk.")
    return response.text or ""


def _call_mineru_ollama(image_bytes: bytes, source_file: str) -> str:
    from app.services import mineru_ocr, ollama_client  # imported lazily: this path is optional (mineru[all] is a heavy, not-default dependency, see requirements.txt)

    print(f"[receipt:{source_file}] backend=mineru - tahap 1/2: MinerU membaca layout struk (lokal/CPU)...")
    set_stage(source_file, "Tahap 1/2: MinerU membaca layout struk (lokal/CPU)...")
    try:
        markdown = mineru_ocr.parse_image_to_markdown(image_bytes, source_file)
    except mineru_ocr.MinerUNotFoundError as exc:
        print(f"[receipt:{source_file}] GAGAL di tahap MinerU: belum terinstall.")
        raise RuntimeError(str(exc))
    except RuntimeError as exc:
        _log.exception("MinerU failed for %s", source_file)
        print(f"[receipt:{source_file}] GAGAL di tahap MinerU: {exc}")
        raise RuntimeError(f"MinerU gagal membaca {source_file}: {exc}")
    print(f"[receipt:{source_file}] MinerU selesai ({len(markdown)} karakter markdown). "
          f"tahap 2/2: reshape via Ollama ({ollama_client.MODEL} @ {ollama_client.HOST})...")
    set_stage(
        source_file,
        f"Tahap 2/2: reshape via Ollama ({ollama_client.MODEL} @ {ollama_client.HOST})... "
        "bisa lama kalau model baru pertama kali dimuat ke GPU.",
    )

    try:
        parsed = ollama_client.post_json(_MINERU_SYSTEM_PROMPT, markdown)
    except RuntimeError as exc:
        _log.exception("Ollama reshape call failed for %s", source_file)
        print(f"[receipt:{source_file}] GAGAL di tahap Ollama: {exc}")
        raise
    print(f"[receipt:{source_file}] Ollama selesai reshape ke JSON.")
    # ollama_client.post_json already returns a parsed dict, not raw text -
    # re-serialize so the rest of this module (which expects a JSON STRING
    # to run through _extract_json_block, same as Gemini's response.text)
    # doesn't need a second code path.
    return json.dumps(parsed)


def _build_result(
    raw_text: str,
    source_file: str,
    product_candidates: list[dict],
    transaction_type: str,
) -> ReceiptImportResult:
    try:
        parsed = _extract_json_block(raw_text)
    except (ValueError, json.JSONDecodeError):
        raise RuntimeError("Model membalas tapi hasilnya bukan JSON yang valid - coba foto struk yang lebih jelas.")

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
        # Mirrors the actual dispatch logic in extract_receipt() below: any
        # RECEIPT_BACKEND value other than "mineru" runs the gemini path, so
        # the marker here must follow the same either/or, not echo the raw
        # env string (which could be some third typo'd value).
        simplified=simplify_transaction(draft, source_file, engine="mineru" if RECEIPT_BACKEND == "mineru" else "gemini"),
        raw_text=raw_text,
    )


def extract_receipt(
    image_bytes: bytes,
    mime_type: str,
    source_file: str,
    product_candidates: list[dict],
    transaction_type: str = "purchase",
) -> ReceiptImportResult:
    try:
        if RECEIPT_BACKEND == "mineru":
            raw_text = _call_mineru_ollama(image_bytes, source_file)
        else:
            raw_text = _call_gemini(image_bytes, mime_type, source_file)
        set_stage(source_file, "Mencocokkan item ke produk yang sudah ada...")
        return _build_result(raw_text, source_file, product_candidates, transaction_type)
    finally:
        # Always clear, success or failure - otherwise a stale stage from a
        # crashed request would keep showing on the NEXT file/upload, since
        # this is a plain source_file-keyed dict, not tied to one request.
        clear_stage(source_file)
