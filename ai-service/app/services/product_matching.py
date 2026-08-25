"""
services/product_matching.py
------------------------------
Fuzzy-matches one raw item name (from a receipt or an Excel row)
against a business's existing `products` + `product_aliases`, so an
import draft references an existing product_id instead of silently
creating a duplicate every time a name is spelled slightly differently
("Indomie Goreng" vs "INDOMIE GORENG 85GR").

rapidfuzz over exact matching: receipts and hand-typed Excel sheets are
never byte-identical to the canonical product name twice in a row.
"""

from __future__ import annotations

from rapidfuzz import fuzz, process

from app.schemas.imports import ProductMatch

MATCH_THRESHOLD = 0.72  # below this: "no confident match" -> propose as a new product instead


def match_product(raw_name: str, candidates: list[dict]) -> ProductMatch:
    """candidates: [{"id": ..., "name": ..., "aliases": [...]}], pulled
    by the caller (web layer) from `products` + `product_aliases` for
    the current business. Kept as plain dicts rather than a DB call so
    this stays a pure function, testable without Supabase."""
    if not raw_name or not raw_name.strip():
        return ProductMatch(match_score=0.0, is_new_product=True)

    choices: dict[str, dict] = {}
    for c in candidates:
        choices.setdefault(c["name"], c)
        for alias in c.get("aliases", []):
            choices.setdefault(alias, c)

    if not choices:
        return ProductMatch(match_score=0.0, is_new_product=True)

    best = process.extractOne(raw_name, list(choices.keys()), scorer=fuzz.WRatio)
    if best is None:
        return ProductMatch(match_score=0.0, is_new_product=True)

    matched_text, score, _ = best
    normalized_score = round(score / 100.0, 3)
    product = choices[matched_text]

    if normalized_score < MATCH_THRESHOLD:
        return ProductMatch(match_score=normalized_score, is_new_product=True)

    return ProductMatch(
        matched_product_id=product["id"],
        matched_product_name=product["name"],
        matched_product_sku=product.get("sku"),  # optional key - caller may not always have/send it
        match_score=normalized_score,
        is_new_product=False,
    )
