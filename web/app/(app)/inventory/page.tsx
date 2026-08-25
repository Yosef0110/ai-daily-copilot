"use client";

import { useEffect, useState } from "react";
import { InventoryAdjustmentModal } from "@/components/inventory/inventory-adjustment-modal";
import { InventoryHistoryModal } from "@/components/inventory/inventory-history-modal";
import { Toast } from "@/components/shared/toast";
import StatusCell from "@/components/verification/TableUtility/StatusCell";
import Table from "@/components/verification/Table/Table";

import type {
  InventoryApiError,
  InventoryItem,
  InventoryListResponse,
} from "@/types/inventory";


const COLUMNS = [
  {
    header: "SKU",
    accessorKey: "sku",

    size: 125,
    minSize: 100,

    cell: ({ row }: any) => {
      const item = row.original;

      return (
        <span className="font-semibold">
          {item.sku}
        </span>
      );
    },
  },

  {
    header: "Produk",
    accessorKey: "name",

    size: 190,
    minSize: 160,

    cell: ({ row }: any) => {
      const item = row.original;

      return (
        <div className="min-w-0">
          <div className="truncate font-medium">
            {item.name}
          </div>

          <div className="truncate text-sm text-slate-500">
            {item.category ?? "-"}
          </div>
        </div>
      );
    },
  },

  {
    header: "Stok",
    accessorKey: "current_stock",

    size: 100,
    minSize: 100,

    cell: ({ row }: any) => {
      const item = row.original;

      return (
        <span className="font-semibold">
          {item.current_stock} {item.unit}
        </span>
      );
    },

    filterFn: "equalsNumber",
  },

  {
    header: "Minimum",
    accessorKey: "minimum_stock",

    size: 100,
    minSize: 100,
  },

  {
    header: "Safety",
    accessorKey: "safety_stock",

    size: 100,
    minSize: 100,
  },

  {
    header: "Status",
    accessorKey: "stock_status",

    size: 140,
    minSize: 110,

    cell: StatusCell,
    enableColumnSearch: false,
  },

  {
    header: "Update Terakhir",
    accessorKey: "updated_at",

    size: 190,
    minSize: 190,
  },
];

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

  const [historyProduct, setHistoryProduct] = useState<InventoryItem | null>(
    null,
  );

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
        const response = await fetch(`/api/inventory?${params.toString()}`);

        const result = (await response.json()) as
          | InventoryListResponse
          | InventoryApiError;

        if (!response.ok) {
          throw new Error(
            "message" in result ? result.message : "Gagal mengambil inventory",
          );
        }

        if (!result.success) {
          throw new Error(result.message);
        }

        setInventory(result.data);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Gagal mengambil inventory",
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

  console.log(inventory);
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
          <h1 className="text-3xl font-bold">Inventory Management</h1>

          <p className="mt-2 text-slate-600">
            Pantau stok, lakukan adjustment, dan lihat histori perubahan.
          </p>
        </div>

        <section className="mt-6 overflow-hidden">
          {isLoading && (
            <div className="p-8 text-center text-slate-500 rounded-xl bg-white shadow-sm">
              Memuat inventory...
            </div>
          )}

          {!isLoading && error && (
            <div className="p-8 text-center text-red-600 rounded-xl bg-white shadow-sm">{error}</div>
          )}

          {!isLoading && !error && inventory.length === 0 && (
            <div className="p-8 text-center text-slate-500 rounded-xl bg-white shadow-sm">
              Tidak ada produk yang ditemukan.
            </div>
          )}

          {!isLoading && !error && inventory.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <Table
                  HeaderProps={COLUMNS}
                  data={inventory}
                  onAdjust={setAdjustingProduct}
                  onHistory={setHistoryProduct}
                />
              </div>

              {/* Mobile */}
              <div className="space-y-3 p-4 md:hidden rounded-xl bg-white shadow-sm">
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
                {inventory.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{item.name}</div>

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
                        <div className="text-slate-500">Stock</div>
                        <div className="font-semibold">
                          {item.current_stock} {item.unit}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Minimum</div>
                        <div className="font-medium">{item.minimum_stock}</div>
                      </div>

                      <div>
                        <div className="text-slate-500">Safety</div>
                        <div className="font-medium">{item.safety_stock}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustingProduct(item)}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Adjust
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryProduct(item)}
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

      {
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
      }

      <InventoryHistoryModal
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
    </main>
  );
}
