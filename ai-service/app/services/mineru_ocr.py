"""
services/mineru_ocr.py
------------------------
Runs MinerU on one struk image and returns its markdown reading of the
layout - the same tool `API/Phase1/tools/mineru_parse.py` already uses
for supplier PO/invoice documents, adapted here for ai-service (kept
as its own copy rather than an import across packages, per this
project's convention that Phase1/Phase2/ai-service stay isolated - see
Phase1/main.py's docstring and app/services/gemini_client.py's own
note about the same choice).

Used by services/receipt_extraction.py ONLY when RECEIPT_BACKEND=mineru
- the default RECEIPT_BACKEND=gemini path never touches this module,
since Gemini reads the photo directly and doesn't need a markdown
intermediate step first.

Runs entirely locally, CPU by default (MinerU's "pipeline" backend) -
no GPU, no network call. The GPU-backed step in the mineru pipeline is
the LLM reshape that happens AFTER this (see ollama_client.py), not
MinerU itself.
"""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import tempfile

BACKEND = os.environ.get("MINERU_BACKEND", "pipeline")
TIMEOUT_SECONDS = int(os.environ.get("MINERU_TIMEOUT", "300"))


class MinerUNotFoundError(RuntimeError):
    pass


def is_installed() -> bool:
    try:
        return importlib.util.find_spec("mineru.cli.client") is not None
    except ModuleNotFoundError:
        return False


def _find_markdown_file(output_root: str) -> str | None:
    """MinerU writes to <output_root>/<name>/<backend>/<name>.md - walk
    rather than hardcode that path, since it has shifted across MinerU
    versions before (see Phase1/tools/mineru_parse.py, same approach)."""
    for root, _dirs, files in os.walk(output_root):
        for fname in files:
            if fname.lower().endswith(".md"):
                return os.path.join(root, fname)
    return None


def parse_image_to_markdown(image_bytes: bytes, filename: str) -> str:
    """Writes image_bytes to a temp file (MinerU's CLI takes a file
    path, not bytes) and runs MinerU on it. Raises MinerUNotFoundError
    if the CLI isn't installed, or RuntimeError on a genuine parse
    failure (non-zero exit, or no markdown produced)."""
    if not is_installed():
        raise MinerUNotFoundError(
            'MinerU belum terinstall di environment ini. Install dengan:\n'
            '    pip install -U "mineru[all]"\n'
            "lalu coba lagi. (Atau set RECEIPT_BACKEND=gemini untuk pakai jalur Gemini, tidak butuh MinerU.)"
        )

    suffix = os.path.splitext(filename)[1] or ".jpg"
    with tempfile.TemporaryDirectory(prefix="mineru_struk_") as tmp_dir:
        input_path = os.path.join(tmp_dir, f"input{suffix}")
        with open(input_path, "wb") as f:
            f.write(image_bytes)

        with tempfile.TemporaryDirectory(prefix="mineru_out_") as tmp_out:
            cmd = [sys.executable, "-m", "mineru.cli.client", "-p", input_path, "-o", tmp_out, "-b", BACKEND]
            try:
                result = subprocess.run(cmd, timeout=TIMEOUT_SECONDS, capture_output=True, text=True)
            except subprocess.TimeoutExpired as e:
                raise RuntimeError(
                    f"MinerU tidak selesai dalam {TIMEOUT_SECONDS} detik untuk {filename}."
                ) from e

            if result.returncode != 0:
                raise RuntimeError(
                    f"MinerU keluar dengan kode {result.returncode} untuk {filename}: "
                    f"{result.stderr[-500:] if result.stderr else '(tidak ada output error)'}"
                )

            md_path = _find_markdown_file(tmp_out)
            if md_path is None:
                raise RuntimeError(f"MinerU jalan tanpa error tapi tidak menghasilkan markdown untuk {filename}.")

            with open(md_path, "r", encoding="utf-8") as f:
                return f.read()
