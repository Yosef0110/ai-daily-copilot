"""
services/simplify.py
----------------------
Flattens a TransactionDraft (rich shape, built for the human review UI
in web/app/imports - has product_match, confidence, needs_review, etc.
per item) into a SimplifiedTransaction: a smaller shape meant for
handing off to another part of the project (the web layer writing to
`transactions`/`transaction_items`, a demo, a quick script) that just
wants product/quantity/sku/date/order id, not the review metadata.

order_id and imported_at are generated HERE, not read from the source:
neither a struk photo nor an excel row reliably carries its own order
id, and imported_at is this service's own processing timestamp.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Optional

from app.schemas.imports import SimplifiedItem, SimplifiedTransaction, TransactionDraft

_DATETIME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})")


def _split_date_time(raw: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """"2026-08-23T14:32:00" -> ("2026-08-23", "14:32"). Struk usually
    only has a bare date (Gemini's prompt asks for YYYY-MM-DD), but this
    stays forward-compatible if a source ever includes a time too."""
    if not raw:
        return None, None
    match = _DATETIME_RE.match(raw)
    if match:
        return match.group(1), match.group(2)
    return raw, None


def _make_order_id(source_file: str, transaction_date: Optional[str]) -> str:
    """Deterministic-looking but not globally unique across re-imports
    of the exact same file+date in the same second - fine for a demo /
    draft id. The web layer should assign the real `transactions.id`
    (DB-generated) when this draft is actually committed; this order_id
    is just something to display/reference before that happens."""
    basis = f"{source_file}:{transaction_date or ''}:{datetime.now(timezone.utc).isoformat()}"
    digest = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:10].upper()
    return f"ORD-{digest}"


def simplify_transaction(draft: TransactionDraft, source_file: str) -> SimplifiedTransaction:
    date_part, time_part = _split_date_time(draft.transaction_date)

    items = [
        SimplifiedItem(
            # Confident match -> use the canonical product name/SKU already
            # on file, not the raw OCR/excel text (which might be an
            # abbreviation, a typo, or ALL CAPS from a receipt printer).
            product_name=(
                item.product_match.matched_product_name
                if not item.product_match.is_new_product and item.product_match.matched_product_name
                else item.raw_name
            ),
            sku=item.product_match.matched_product_sku or item.sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal,
            is_new_product=item.product_match.is_new_product,
        )
        for item in draft.items
    ]

    return SimplifiedTransaction(
        order_id=_make_order_id(source_file, draft.transaction_date),
        transaction_date=date_part,
        transaction_time=time_part,
        imported_at=datetime.now(timezone.utc).isoformat(),
        source=draft.source,
        source_file=source_file,
        total_amount=draft.total_amount,
        items=items,
    )
