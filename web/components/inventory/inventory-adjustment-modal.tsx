"use client";

import { FormEvent, useEffect, useState } from "react";

import type {
  InventoryApiError,
  InventoryItem,
} from "@/types/inventory";

type AdjustmentType =
  | "damaged"
  | "lost"
  | "expired"
  | "stock_opname"
  | "manual_correction";

type AdjustmentSuccessResponse = {
  success: true;
  message: string;
  data: {
    product_id: string;
    stock_before: number;
    quantity_change: number;
    stock_after: number;
    movement_id: string;
  };
};

type Props = {
  product: InventoryItem | null;
  isSaving: boolean;
  onClose: () => void;
  onAdjusted: () => void;
  setIsSaving: (value: boolean) => void;
};

export function InventoryAdjustmentModal({
  product,
  isSaving,
  onClose,
  onAdjusted,
  setIsSaving,
}: Props) {
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("damaged");

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) {
      return;
    }

    setAdjustmentType("damaged");
    setQuantity("");
    setReason("");
    setNotes("");
    setError("");
  }, [product]);

  if (!product) {
    return null;
  }

  const currentProduct = product;

  const usesTargetStock =
    adjustmentType === "stock_opname" ||
    adjustmentType === "manual_correction";

  function handleClose() {
    if (isSaving) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const numericQuantity = Number(quantity);

    if (
      Number.isNaN(numericQuantity) ||
      numericQuantity < 0
    ) {
      setError("Quantity harus berupa angka valid.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/inventory/adjustments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: currentProduct.id,
            adjustment_type: adjustmentType,
            quantity: numericQuantity,
            reason,
            notes,
          }),
        },
      );

      const result = (await response.json()) as
        | AdjustmentSuccessResponse
        | InventoryApiError;

      if (!response.ok || result.success === false) {
        throw new Error(
          "message" in result
            ? result.message
            : "Gagal melakukan inventory adjustment",
        );
      }

      onAdjusted();
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal melakukan inventory adjustment",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl md:max-w-xl md:rounded-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-semibold">
              Adjust Stock
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {currentProduct.name} · {currentProduct.sku}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="text-2xl leading-none text-slate-400 hover:text-slate-900 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5 md:p-6"
        >
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-500">
              Current Stock
            </div>

            <div className="mt-1 text-2xl font-semibold">
              {currentProduct.current_stock}{" "}
              {currentProduct.unit}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Adjustment Type
            </span>

            <select
              value={adjustmentType}
              onChange={(event) =>
                setAdjustmentType(
                  event.target.value as AdjustmentType,
                )
              }
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="damaged">
                Barang Rusak
              </option>

              <option value="lost">
                Barang Hilang
              </option>

              <option value="expired">
                Barang Expired
              </option>

              <option value="stock_opname">
                Stock Opname
              </option>

              <option value="manual_correction">
                Koreksi Manual
              </option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              {usesTargetStock
                ? "Stok Fisik Terbaru"
                : "Jumlah Barang"}
            </span>

            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) =>
                setQuantity(event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
              required
            />

            <p className="text-xs text-slate-500">
              {usesTargetStock
                ? "Masukkan total stok fisik yang sebenarnya saat ini."
                : "Masukkan jumlah barang yang akan dikurangi dari stok."}
            </p>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Alasan
            </span>

            <input
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Contoh: Barang rusak saat penyimpanan"
              className="w-full rounded-md border px-3 py-2"
              required
              maxLength={200}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Catatan
            </span>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Catatan tambahan (opsional)"
              rows={3}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>

          <div className="flex gap-3 border-t pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 rounded-md border px-4 py-2 font-medium disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {isSaving
                ? "Menyimpan..."
                : "Simpan Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}