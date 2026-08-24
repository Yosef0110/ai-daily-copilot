"use client";

/**
 * Halaman review import struk & excel.
 *
 * Masih berdiri sendiri di /imports, belum dipasang sebagai item menu
 * di components/layout/app-sidebar.tsx (sekarang sudah ada di branch
 * ini setelah diselaraskan ke develop) - tinggal tambah satu baris di
 * `navigation` array-nya: { href: "/imports", label: "Import" }, kapan
 * pun siap.
 *
 * Styling di file ini sengaja disamakan dengan konvensi yang sudah
 * dipakai di web/app/(app)/products/page.tsx (develop): bg-slate-100,
 * card putih rounded-xl shadow-sm, tombol biru-600, tabel dengan header
 * slate-50, badge status rounded-full - supaya begitu digabung, halaman
 * ini terasa satu tema dengan punya tim, bukan tempelan.
 */

import { useEffect, useRef, useState } from "react";

import { Toast } from "@/components/shared/toast";

type ProductMatch = {
  matched_product_id: string | null;
  matched_product_name: string | null;
  matched_product_sku: string | null;
  match_score: number;
  is_new_product: boolean;
};

type TransactionItemDraft = {
  raw_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  transaction_date: string | null;
  product_match: ProductMatch;
  needs_review: boolean;
  review_reason: string | null;
};

// Bentuk flat, siap pakai untuk bagian lain proyek (misal web/app/api/*
// yang nulis ke Supabase, atau skrip demo) - beda dari
// TransactionItemDraft di atas yang isinya buat halaman review ini
// sendiri (ada confidence, needs_review, dst).
type SimplifiedItem = {
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_new_product: boolean;
};

type SimplifiedTransaction = {
  order_id: string;
  transaction_date: string | null;
  transaction_time: string | null;
  imported_at: string;
  source: string;
  // Which pipeline actually produced this result: "gemini" or "mineru" for
  // a struk photo (mirrors ai-service's RECEIPT_BACKEND at the moment this
  // ran), "excel" for the Excel/CSV importer. Lets a person tell which
  // backend ran straight from the JSON, without checking /health.
  engine: "gemini" | "mineru" | "excel";
  source_file: string;
  total_amount: number;
  items: SimplifiedItem[];
};

type ColumnMapping = {
  source_header: string;
  mapped_field: string | null;
  confidence: number;
};

type ExcelImportPreview = {
  source_file: string;
  sheet_name: string;
  detected_row_count: number;
  column_mappings: ColumnMapping[];
  unmatched_columns: string[];
  sample_rows: Record<string, string>[];
  drafts: TransactionItemDraft[];
  simplified: SimplifiedTransaction;
  warnings: string[];
};

type ReceiptImportResult = {
  source_file: string;
  draft: {
    transaction_type: "sale" | "purchase";
    transaction_date: string | null;
    total_amount: number;
    source: string;
    items: TransactionItemDraft[];
    confidence: number;
    needs_review: boolean;
    warnings: string[];
  };
  simplified: SimplifiedTransaction;
  raw_text: string | null;
};

type ReceiptImportErrorItem = {
  source_file: string;
  message: string;
};

// POST /imports/receipt sekarang selalu balas bentuk batch, walau cuma
// unggah satu file - satu foto, beberapa foto sekaligus, PDF, atau .zip
// berisi banyak foto semuanya lewat bentuk yang sama. Satu file yang
// gagal dibaca (blur, korup) tidak menggagalkan seluruh unggahan - dia
// masuk ke `errors`, di samping `results` yang berhasil.
type ReceiptImportBatchResult = {
  results: ReceiptImportResult[];
  errors: ReceiptImportErrorItem[];
};

type ToastState = {
  visible: boolean;
  type: "success" | "danger" | "warning" | "info";
  message: string;
};

// ai-service jalan terpisah dari Next.js (lihat ai-service/README kalau
// ada, atau AI_PIPELINE.md) - default port 8000 saat dev lokal.
const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";

// Sama persis dengan CANONICAL_HEADERS di ai-service/app/services/excel_import.py
// - label yang ditampilkan ke orang, bukan field key internal.
const FIELD_LABELS: Record<string, string> = {
  product_name: "Nama Barang",
  sku: "SKU",
  category: "Kategori",
  unit: "Satuan",
  quantity: "Jumlah",
  unit_price: "Harga Satuan",
  subtotal: "Subtotal",
  transaction_date: "Tanggal",
  current_stock: "Stok",
};

export default function ImportsPage() {
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreview | null>(
    null,
  );
  const [receiptBatch, setReceiptBatch] =
    useState<ReceiptImportBatchResult | null>(null);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  // "sedang di tahap apa sekarang" - polled from GET /imports/progress
  // while isLoadingReceipt is true (see the useEffect below). Shape
  // matches ai-service's services/progress.py: {source_file: stage}.
  const [receiptProgress, setReceiptProgress] = useState<
    Record<string, string>
  >({});
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "info",
    message: "",
  });

  function showToast(type: ToastState["type"], message: string) {
    setToast({ visible: true, type, message });
  }

  // Polls GET /imports/progress every 1s while a receipt upload is in
  // flight, so the person watching the page sees which file/stage is
  // running right now (MinerU parsing, Ollama reshape on the rented
  // GPU, Gemini call, product matching) instead of just a static
  // "Membaca..." button with no sense of how long is left. Stops
  // polling as soon as isLoadingReceipt goes false (upload finished or
  // failed) - ai-service clears its side of this the moment each file
  // is done, so a stale stage never lingers past that.
  const isLoadingReceiptRef = useRef(isLoadingReceipt);
  isLoadingReceiptRef.current = isLoadingReceipt;

  useEffect(() => {
    if (!isLoadingReceipt) {
      setReceiptProgress({});
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${AI_SERVICE_URL}/imports/progress`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Record<string, string>;
        if (!cancelled) setReceiptProgress(data);
      } catch {
        // Polling failure isn't worth surfacing as an error toast - the
        // main upload request's own error handling covers real
        // failures; this is just a "nice to see" indicator.
      }
    };
    void poll();
    const interval = setInterval(() => {
      if (isLoadingReceiptRef.current) void poll();
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoadingReceipt]);

  async function handleExcelUpload(file: File) {
    setIsLoadingExcel(true);
    setExcelPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // TODO: isi dari daftar produk asli begitu halaman ini tersambung
      // ke /api/products (lihat web/app/api/products/route.ts di
      // develop) - untuk sekarang kosong, semua item akan tampil
      // sebagai "produk baru" karena tidak ada yang dibandingkan.
      formData.append("product_candidates", "[]");

      const response = await fetch(`${AI_SERVICE_URL}/imports/excel/preview`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail ?? "Gagal membaca file excel");
      }

      setExcelPreview(result as ExcelImportPreview);
      showToast(
        "success",
        `Berhasil membaca ${result.detected_row_count} baris dari "${file.name}".`,
      );
    } catch (error) {
      showToast(
        "danger",
        error instanceof Error ? error.message : "Gagal membaca file excel",
      );
    } finally {
      setIsLoadingExcel(false);
    }
  }

  async function handleReceiptUpload(files: File[]) {
    if (files.length === 0) return;

    setIsLoadingReceipt(true);
    setReceiptBatch(null);

    try {
      const formData = new FormData();
      // Field "files" (jamak) - backend menerima berapapun file dalam satu
      // request: campuran foto, PDF, dan/atau .zip berisi banyak foto
      // sekaligus dibaca sebagai satu batch.
      for (const file of files) formData.append("files", file);
      formData.append("product_candidates", "[]");
      formData.append("transaction_type", "purchase");

      const response = await fetch(`${AI_SERVICE_URL}/imports/receipt`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail ?? "Gagal membaca struk");
      }

      const batch = result as ReceiptImportBatchResult;
      setReceiptBatch(batch);

      if (batch.results.length > 0 && batch.errors.length === 0) {
        showToast(
          "success",
          `Berhasil membaca ${batch.results.length} struk.`,
        );
      } else if (batch.results.length > 0 && batch.errors.length > 0) {
        showToast(
          "warning",
          `${batch.results.length} struk berhasil dibaca, ${batch.errors.length} gagal - lihat detail di bawah.`,
        );
      } else {
        showToast("danger", "Tidak ada struk yang berhasil dibaca.");
      }
    } catch (error) {
      showToast(
        "danger",
        error instanceof Error ? error.message : "Gagal membaca struk",
      );
    } finally {
      setIsLoadingReceipt(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <Toast
        type={toast.type}
        visible={toast.visible}
        onClose={() =>
          setToast((current) => ({ ...current, visible: false }))
        }
      >
        {toast.message}
      </Toast>

      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Import Struk &amp; Excel</h1>
          <p className="mt-2 text-slate-600">
            Unggah foto struk atau file excel/csv - AI akan membaca dan
            mencocokkan ke produk yang sudah ada. Semua hasil di bawah masih
            draft, belum tersimpan ke database.
          </p>
        </div>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Import Excel / CSV</h2>
              <p className="text-sm text-slate-500">
                Hanya sheet pertama yang dibaca.
              </p>
            </div>

            <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {isLoadingExcel ? "Membaca..." : "Pilih File"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={isLoadingExcel}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleExcelUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {excelPreview && (
            <div className="mt-6 space-y-6">
              {excelPreview.warnings.length > 0 && (
                <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {excelPreview.warnings.map((warning, index) => (
                    <div key={index}>{warning}</div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Pencocokan Kolom - {excelPreview.sheet_name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {excelPreview.column_mappings.map((mapping) => (
                    <span
                      key={mapping.source_header}
                      className={
                        mapping.mapped_field
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"
                          : "rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600"
                      }
                    >
                      {mapping.source_header} →{" "}
                      {mapping.mapped_field
                        ? (FIELD_LABELS[mapping.mapped_field] ??
                          mapping.mapped_field)
                        : "tidak dikenali"}
                    </span>
                  ))}
                </div>
              </div>

              <ItemDraftsTable items={excelPreview.drafts} />

              <SimplifiedJsonBlock
                data={excelPreview.simplified}
                onCopy={() => showToast("info", "JSON disalin ke clipboard.")}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Import Struk</h2>
              <p className="text-sm text-slate-500">
                Foto (jpg/png/webp), PDF, atau .zip berisi banyak foto
                sekaligus - boleh pilih beberapa file dalam satu kali unggah.
              </p>
            </div>

            <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {isLoadingReceipt ? "Membaca..." : "Unggah Struk"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,.pdf,.zip,application/pdf,application/zip"
                multiple
                className="hidden"
                disabled={isLoadingReceipt}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) void handleReceiptUpload(files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {isLoadingReceipt && (
            <div className="mt-4 space-y-1.5 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {Object.keys(receiptProgress).length === 0 ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <span>Menyiapkan...</span>
                </div>
              ) : (
                Object.entries(receiptProgress).map(([file, stage]) => (
                  <div key={file} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-blue-500" />
                    <span>
                      <span className="font-medium">{file}</span>: {stage}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {receiptBatch && (
            <div className="mt-6 space-y-6">
              {receiptBatch.errors.length > 0 && (
                <div className="space-y-1 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div className="font-medium">
                    {receiptBatch.errors.length} file gagal dibaca:
                  </div>
                  {receiptBatch.errors.map((err, index) => (
                    <div key={index}>
                      <span className="font-medium">{err.source_file}</span>{" "}
                      - {err.message}
                    </div>
                  ))}
                </div>
              )}

              {receiptBatch.results.map((receiptResult, index) => (
                <div
                  key={`${receiptResult.source_file}-${index}`}
                  className="space-y-4 rounded-lg border p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-700">
                    {receiptResult.source_file}
                  </h3>

                  {receiptResult.draft.warnings.length > 0 && (
                    <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {receiptResult.draft.warnings.map((warning, wIndex) => (
                        <div key={wIndex}>{warning}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-6 text-sm text-slate-600">
                    <div>
                      <span className="font-medium text-slate-900">
                        Tanggal:
                      </span>{" "}
                      {receiptResult.draft.transaction_date ?? "-"}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">
                        Total:
                      </span>{" "}
                      Rp{" "}
                      {receiptResult.draft.total_amount.toLocaleString(
                        "id-ID",
                      )}
                    </div>
                  </div>

                  <ItemDraftsTable items={receiptResult.draft.items} />

                  <SimplifiedJsonBlock
                    data={receiptResult.simplified}
                    onCopy={() => showToast("info", "JSON disalin ke clipboard.")}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SimplifiedJsonBlock({
  data,
  onCopy,
}: {
  data: SimplifiedTransaction;
  onCopy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-2">
          JSON siap-integrasi (order_id: {data.order_id})
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              data.engine === "mineru"
                ? "bg-purple-100 text-purple-700"
                : data.engine === "gemini"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
            }`}
            title="Pipeline yang menghasilkan JSON ini"
          >
            {data.engine}
          </span>
        </span>
        <span className="text-xs text-blue-600 hover:underline">
          {expanded ? "Sembunyikan" : "Lihat JSON"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(json);
                onCopy();
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Copy JSON
            </button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}

function ItemDraftsTable({ items }: { items: TransactionItemDraft[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">
        Belum ada item.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Nama (mentah)</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Harga</th>
            <th className="px-4 py-3 text-right">Subtotal</th>
            <th className="px-4 py-3">Produk Cocok</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-3 font-medium">{item.raw_name}</td>
              <td className="px-4 py-3 text-slate-500">{item.sku ?? "-"}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                Rp {item.unit_price.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                Rp {item.subtotal.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3">
                {item.product_match.is_new_product ? (
                  <span className="text-slate-500">Produk baru</span>
                ) : (
                  <span>
                    {item.product_match.matched_product_name}{" "}
                    <span className="text-xs text-slate-400">
                      ({Math.round(item.product_match.match_score * 100)}%)
                    </span>
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.needs_review ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    Perlu dicek
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    Siap
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
