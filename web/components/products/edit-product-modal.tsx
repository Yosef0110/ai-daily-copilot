"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ApiErrorResponse, Product } from "@/types/product";

type Props = {
  product: Product | null;
  isSaving: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  setIsSaving: (value: boolean) => void;
};

export function EditProductModal({
  product,
  isSaving,
  onClose,
  onSaved,
  setIsSaving,
}: Props) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [safetyStock, setSafetyStock] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) return;

    setSku(product.sku);
    setName(product.name);
    setCategory(product.category ?? "");
    setUnit(product.unit);
    setSellingPrice(String(product.selling_price));
    setMinimumStock(String(product.minimum_stock));
    setSafetyStock(String(product.safety_stock));
    setLeadTimeDays(String(product.lead_time_days));
    setError("");
  }, [product]);

  if (!product) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
        return;
    }

    const currentProduct = product;

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
            `/api/products/${currentProduct.id}`,
            {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku,
          name,
          category,
          unit,
          selling_price: Number(sellingPrice),
          minimum_stock: Number(minimumStock),
          safety_stock: Number(safetyStock),
          lead_time_days: Number(leadTimeDays),
        }),
      });

      const result = (await response.json()) as
        | {
            success: true;
            message: string;
            data: Product;
          }
        | ApiErrorResponse;

      if (!response.ok || result.success === false) {
        throw new Error(
          "message" in result
            ? result.message
            : "Gagal memperbarui produk",
        );
      }

      onSaved(result.data);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui produk",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Edit Produk</h2>
            <p className="text-sm text-slate-500">
              Perbarui informasi produk.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xl text-slate-500 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">SKU</span>
              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Nama Produk</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Kategori</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Satuan</span>
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Harga Jual</span>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Minimum Stock</span>
              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(event) => setMinimumStock(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Safety Stock</span>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(event) => setSafetyStock(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Lead Time (hari)</span>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(event) => setLeadTimeDays(event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border px-4 py-2"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}