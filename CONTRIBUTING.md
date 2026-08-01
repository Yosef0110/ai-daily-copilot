# Contributing Guide

## Branch Structure

- `main`: versi stabil
- `develop`: integrasi fitur
- `feature/<nama-fitur>`: pengembangan fitur
- `fix/<nama-bug>`: perbaikan bug

## Workflow

1. Pull perubahan terbaru dari `develop`.
2. Buat branch baru.
3. Kerjakan fitur.
4. Commit menggunakan Conventional Commits.
5. Push branch.
6. Buat Pull Request ke `develop`.
7. Minta review minimal satu anggota.

## Commit Convention

```text
feat: menambahkan upload nota
fix: memperbaiki kalkulasi stok
docs: memperbarui API documentation
refactor: merapikan product matching
test: menambahkan forecast unit test
chore: memperbarui dependency