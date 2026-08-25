"use client";

import { useEffect, useState } from "react";
import { InventoryAdjustmentModal } from "@/components/inventory/inventory-adjustment-modal";
import { InventoryHistoryModal } from "@/components/inventory/inventory-history-modal";
import { Toast } from "@/components/shared/toast";


import type {
  InventoryApiError,
  InventoryItem,
  InventoryListResponse,
} from "@/types/inventory";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "danger" | "warning" | "info";
    message: string;
  }>({
    visible: false,
    type: "info",
    message: "",
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [adjustingProduct, setAdjustingProduct] =
    useState<InventoryItem | null>(null);

  const [historyProduct, setHistoryProduct] =
    useState<InventoryItem | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) {
        params.set("search", search);
      }

      if (status) {
        params.set("status", status);
      }

      try {
        const response = await fetch(
          `/api/inventory?${params.toString()}`,
        );

        const result = (await response.json()) as
          | InventoryListResponse
          | InventoryApiError;

        if (!response.ok) {
          throw new Error(
            "message" in result
              ? result.message
              : "Gagal mengambil inventory",
          );
        }

        if (!result.success) {
          throw new Error(result.message);
        }

        setInventory(result.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil inventory",
        );
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = setTimeout(() => {
      void fetchInventory();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, status, refreshKey]);

  function stockStatusLabel(status: InventoryItem["stock_status"]) {
    if (status === "out") return "Habis";
    if (status === "low") return "Menipis";

    return "Aman";
  }

  function stockStatusClass(status: InventoryItem["stock_status"]) {
    if (status === "out") {
      return "bg-red-100 text-red-700";
    }

    if (status === "low") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-emerald-100 text-emerald-700";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <Toast
        type={toast.type}
        visible={toast.visible}
        onClose={() =>
          setToast((current) => ({
            ...current,
            visible: false,
          }))
        }
      >
        {toast.message}
      </Toast>
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">
            Inventory Management
          </h1>

          <p className="mt-2 text-slate-600">
            Pantau stok, lakukan adjustment, dan lihat histori perubahan.
          </p>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau SKU..."
            className="rounded-md border px-3 py-2"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border px-3 py-2"
          >
            <option value="">Semua status stok</option>
            <option value="safe">Aman</option>
            <option value="low">Menipis</option>
            <option value="out">Habis</option>
          </select>
        </div>

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-slate-500">
              Memuat inventory...
            </div>
          )}

          {!isLoading && error && (
            <div className="p-8 text-center text-red-600">
              {error}
            </div>
          )}

          {!isLoading && !error && inventory.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Tidak ada produk yang ditemukan.
            </div>
          )}

          {!isLoading && !error && inventory.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-sm text-slate-600">
                    <tr>
                      <th className="px-5 py-4">SKU</th>
                      <th className="px-5 py-4">Produk</th>
                      <th className="px-5 py-4">Stok</th>
                      <th className="px-5 py-4">Minimum</th>
                      <th className="px-5 py-4">Safety</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-mono text-sm">
                          {item.sku}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium">
                            {item.name}
                          </div>

                          <div className="text-sm text-slate-500">
                            {item.category ?? "-"}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {item.current_stock} {item.unit}
                        </td>

                        <td className="px-5 py-4">
                          {item.minimum_stock}
                        </td>

                        <td className="px-5 py-4">
                          {item.safety_stock}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${stockStatusClass(
                              item.stock_status,
                            )}`}
                          >
                            {stockStatusLabel(item.stock_status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustingProduct(item)
                              }
                              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                            >
                              Adjust
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setHistoryProduct(item)
                              }
                              className="rounded-md border px-3 py-2 text-sm font-medium"
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-3 p-4 md:hidden">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">
                          {item.name}
                        </div>

                        <div className="mt-1 font-mono text-xs text-slate-500">
                          {item.sku}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${stockStatusClass(
                          item.stock_status,
                        )}`}
                      >
                        {stockStatusLabel(item.stock_status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">
                          Stock
                        </div>
                        <div className="font-semibold">
                          {item.current_stock} {item.unit}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">
                          Minimum
                        </div>
                        <div className="font-medium">
                          {item.minimum_stock}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">
                          Safety
                        </div>
                        <div className="font-medium">
                          {item.safety_stock}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAdjustingProduct(item)
                        }
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Adjust
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setHistoryProduct(item)
                        }
                        className="rounded-md border px-3 py-2 text-sm font-medium"
                      >
                        History
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {<InventoryAdjustmentModal
        product={adjustingProduct}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        onClose={() => setAdjustingProduct(null)}
        onAdjusted={() => {
          setRefreshKey((current) => current + 1);

          setToast({
            visible: true,
            type: "success",
            message: "Stock berhasil diperbarui.",
          });
        }}
      />}

      <InventoryAdjustmentModal
        product={adjustingProduct}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        onClose={() => setAdjustingProduct(null)}
        onAdjusted={() => {
          setRefreshKey((current) => current + 1);

          setToast({
            visible: true,
            type: "success",
            message: "Stock berhasil diperbarui.",
          });
        }}
      />

      <InventoryHistoryModal
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
    </main>
  );
}