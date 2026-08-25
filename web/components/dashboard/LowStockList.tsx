import Link from "next/link";
import { PackageX } from "lucide-react";

type LowStockItem = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
};

export default function LowStockList({
  items,
  loading,
}: {
  items: LowStockItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <PackageX
          size={18}
          className="text-amber-500"
        />

        <h2 className="text-lg font-semibold">
          Stok Menipis
        </h2>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">
          Memuat data...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Semua stok produk masih aman.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Minimum: {item.minimum_stock}{" "}
                  {item.unit}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {item.current_stock} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/inventory"
        className="mt-5 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        Lihat Inventory →
      </Link>
    </div>
  );
}