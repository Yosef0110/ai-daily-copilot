# AI Pipeline — Import Struk & Excel

Dua entry point baru di `ai-service` untuk mengubah sumber data mentah milik
pemilik UMKM (foto struk, atau file Excel/CSV) menjadi draft yang siap
direview, mengikuti struktur `docs/ERD.md` (`products`, `transactions`,
`transaction_items`, `product_aliases`, dst).

Kedua endpoint ini **read-only terhadap Supabase** — ai-service tidak pernah
menulis langsung ke database. Ini mengikuti pola tiga lapis tanggung jawab
yang sudah dipakai di `PastWorks/Phase4b`: AI mengusulkan, pengecekan
otomatis menandai apa yang perlu dicek, manusia yang memutuskan. Yang
menyimpan draft ke `products`/`transactions`/`transaction_items` adalah
layer web (`web/app/api/*`), setelah pemilik UMKM konfirmasi di
`web/app/imports`.

## POST /imports/receipt

Input: satu foto struk (jpg/png/webp/heic) + `product_candidates` (JSON
array produk yang sudah ada di bisnis ini, untuk fuzzy matching) +
`transaction_type` (`purchase` atau `sale`, default `purchase`).

Alurnya: foto dikirim langsung ke Gemini multimodal (`gemini-2.5-flash`)
dengan prompt yang minta JSON `{transaction_date, total_amount, items[],
warnings[]}`, lalu tiap item dicocokkan ke produk yang sudah ada lewat
`services/product_matching.py` (rapidfuzz). Hasilnya `ReceiptImportResult`:
draft transaksi + item, masing-masing ditandai `needs_review` kalau produknya
baru atau skor cocoknya rendah (<0.85).

Ini **bukan** port dari `API/Phase1` (mineru → markdown → Gemini). Struk itu
satu foto, satu kolom item — tidak butuh konversi ke markdown yang dibangun
`API/Phase1` untuk PO multi-halaman dari supplier. Yang dipakai ulang dari
`API/Phase1/tools/gemini_extract.py` cuma pola rotasi API key
(`services/gemini_client.py`), supaya satu key yang kena rate limit tidak
mematikan fitur ini.

## POST /imports/excel/preview

Input: satu file `.xlsx`/`.xls`/`.csv` + `product_candidates`.

Hanya **sheet pertama** yang dibaca (keputusan produk: pemilik UMKM pegang
satu sheet kerja, bukan banyak sheet seperti yang ditangani `API/Phase2`).
Header baris pertama dicocokkan lewat rapidfuzz ke daftar field ERD tetap di
`services/excel_import.py` (`CANONICAL_HEADERS` — campuran istilah Indonesia
& Inggris: "nama barang"/"product name" → `product_name`, dst). Hasilnya
`ExcelImportPreview`: mapping tiap kolom + skor, kolom yang tidak cocok
(`unmatched_columns`), lalu tiap baris dipetakan jadi `TransactionItemDraft`
yang sama dengan draft dari struk, lengkap dengan product matching.

Ini juga **bukan** port `API/Phase2/tools/qwen_matcher.py`. Phase2
menyelesaikan masalah yang lebih berat (mengelompokkan banyak format
BERBEDA dari banyak supplier, tanpa kosakata tetap, butuh LLM lokal/Ollama).
Di sini cuma satu sheet, satu pemilik, dan skema ERD yang kecil & tetap —
rapidfuzz terhadap daftar kosakata pendek sudah cukup, dan menghindari
dependensi Ollama/Qwen untuk fitur yang harus jalan tanpa GPU.

## Yang belum dibangun (sengaja, next step)

- UI review di `web/app/imports` + `web/components/imports/review` — di semua
  branch masih placeholder `.gitkeep`. Endpoint di atas sudah mengembalikan
  bentuk data yang pas untuk halaman review (mapping + confidence + item yang
  butuh dicek), tinggal dirender.
- Endpoint commit (`POST /imports/receipt/confirm` dsb.) yang benar-benar
  menulis ke Supabase setelah direview — sengaja belum dibuat karena itu milik
  layer web (lihat `web/app/api/products/route.ts` sebagai contoh pola yang
  sudah ada untuk endpoint yang menyentuh DB).
- `product_candidates` saat ini dikirim manual sebagai form field. Kalau mau,
  bisa diganti jadi ai-service query Supabase sendiri — tapi itu berarti
  ai-service butuh service-role key sendiri, keputusan arsitektur yang lebih
  besar dari sekadar fitur ini.

## UI review (web/app/imports/page.tsx)

Ditambahkan belakangan: halaman untuk mencoba dua endpoint di atas dari
browser, tanpa perlu Swagger UI atau curl.

Sengaja dibuat **berdiri sendiri**, tidak dipasang ke sidebar/layout tim
(`components/layout/app-sidebar.tsx`, `app/(app)/layout.tsx`) - file-file itu
cuma ada di branch `develop`, belum ada di checkout `main` tempat halaman ini
ditulis. Begitu branch diselaraskan, tinggal tambah satu baris di
`app-sidebar.tsx`'s `navigation` array: `{ href: "/imports", label: "Import" }`.

Styling-nya disamakan manual dengan konvensi `app/(app)/products/page.tsx`
di `develop` (dibaca langsung dari branch itu sebagai referensi): background
`bg-slate-100`, card putih `rounded-xl shadow-sm`, tombol `bg-blue-600`,
tabel dengan header `bg-slate-50` + baris `border-t`, badge status
`rounded-full` (emerald = beres, amber = perlu dicek, slate = netral). Komponen
`Toast` di-copy verbatim dari `components/shared/toast.tsx` versi `develop`
(byte-identik) supaya nanti waktu branch digabung, git tidak melihatnya
sebagai konflik.

Halaman ini manggil `ai-service` LANGSUNG dari browser (bukan lewat proxy
`web/app/api/*` seperti pola produk/inventory) - alamatnya diatur lewat
`NEXT_PUBLIC_AI_SERVICE_URL` (default `http://localhost:8000`). Karena itu
`ai-service/app/main.py` sekarang punya `CORSMiddleware` (baru, sebelumnya
tidak ada) supaya browser tidak diblokir manggil origin yang beda port -
diatur lewat `CORS_ALLOW_ORIGINS` di `ai-service/.env` (default sudah include
`localhost:3000`, port dev Next.js).

`product_candidates` di halaman ini masih hardcode `"[]"` (array kosong) -
belum disambungkan ke `/api/products` yang sebenarnya (lihat TODO di kode),
jadi setiap item saat ini akan selalu tampil "Produk baru" sampai itu
disambungkan.

Cara coba: jalankan `ai-service` (`uvicorn app.main:app --reload`, port 8000)
dan `web` (`npm run dev`, port 3000) bersamaan, buka `http://localhost:3000/imports`.
