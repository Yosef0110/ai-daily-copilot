"use client";

import { useEffect, useState } from "react";

import type {
  InventoryApiError,
  InventoryHistoryResponse,
  InventoryItem,
  InventoryMovement,
} from "@/types/inventory";

type Props = {
  product: InventoryItem | null;
  onClose: () => void;
};

function movementLabel(type: InventoryMovement["movement_type"]) {
  switch (type) {
    case "sale":
      return "Penjualan";
    case "purchase":
      return "Pembelian";
    case "damaged":
      return "Barang Rusak";
    case "lost":
      return "Barang Hilang";
    case "expired":
      return "Expired";
    case "stock_opname":
      return "Stock Opname";
    case "manual_correction":
      return "Koreksi Manual";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InventoryHistoryModal({
  product,
  onClose,
}: Props) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) {
        return;
    }

    const currentProduct = product;

    setMovements([]);
    setCurrentStock(null);

    async function fetchHistory() {
        setIsLoading(true);
        setError("");

        try {
        const response = await fetch(
            `/api/inventory/${currentProduct.id}/history`,
        );

        const result = (await response.json()) as
            | InventoryHistoryResponse
            | InventoryApiError;

        if (!response.ok) {
            throw new Error(
            "message" in result
                ? result.message
                : "Gagal mengambil histori inventory",
            );
        }

        if (!result.success) {
            throw new Error(result.message);
        }

        setMovements(result.data.movements);
        setCurrentStock(result.data.product.current_stock);
        } catch (error) {
        setError(
            error instanceof Error
            ? error.message
            : "Gagal mengambil histori inventory",
        );
        } finally {
        setIsLoading(false);
        }
    }
 
    void fetchHistory();
    }, [product]);

  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="max-h-[90vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl md:max-w-4xl md:rounded-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-semibold">
              Inventory History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {product.name} · {product.sku}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5 md:p-6">
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">
              Current Stock
            </div>

            <div className="mt-1 text-2xl font-semibold">
              {currentStock ?? product.current_stock} {product.unit}
            </div>
          </div>

          {isLoading && (
            <div className="py-10 text-center text-slate-500">
              Memuat histori...
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && movements.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              Belum ada histori perubahan stok.
            </div>
          )}

          {!isLoading && !error && movements.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-sm text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3 text-right">
                        Sebelum
                      </th>
                      <th className="px-4 py-3 text-right">
                        Perubahan
                      </th>
                      <th className="px-4 py-3 text-right">
                        Sesudah
                      </th>
                      <th className="px-4 py-3">
                        Alasan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {movements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-t"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {formatDate(movement.created_at)}
                        </td>

                        <td className="px-4 py-3">
                          {movementLabel(movement.movement_type)}
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {movement.stock_before}
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-medium tabular-nums ${
                            movement.quantity_change > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.quantity_change > 0 ? "+" : ""}
                          {movement.quantity_change}
                        </td>

                        <td className="px-4 py-3 text-right tabular-nums">
                          {movement.stock_after}
                        </td>

                        <td className="px-4 py-3">
                          <div>{movement.reason ?? "-"}</div>

                          {movement.notes && (
                            <div className="mt-1 text-xs text-slate-500">
                              {movement.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 md:hidden">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          {movementLabel(movement.movement_type)}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(movement.created_at)}
                        </div>
                      </div>

                      <div
                        className={`font-semibold ${
                          movement.quantity_change > 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {movement.quantity_change > 0 ? "+" : ""}
                        {movement.quantity_change}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">
                          Sebelum
                        </div>
                        <div className="font-medium">
                          {movement.stock_before}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">
                          Sesudah
                        </div>
                        <div className="font-medium">
                          {movement.stock_after}
                        </div>
                      </div>
                    </div>

                    {(movement.reason || movement.notes) && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                        {movement.reason && (
                          <div>{movement.reason}</div>
                        )}

                        {movement.notes && (
                          <div className="mt-1 text-xs text-slate-500">
                            {movement.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}