"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Receipt,
  Package,
  PackageX,
} from "lucide-react";

import RevenueChart from "@/components/dashboard/RevenueChart";
import LowStockList from "@/components/dashboard/LowStockList";

// ============================================================
// TYPES
// ============================================================

type Summary = {
  total_revenue: number;
  total_transactions: number;
  total_items_sold: number;
  average_transaction_value: number;
};

type RevenueByDate = {
  date: string;
  revenue: number;
  transactions: number;
  items_sold: number;
};

type ProductSales = {
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  revenue: number;
};

type InventoryItem = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  is_active?: boolean;
};

type Insight = {
  type: "warning" | "positive" | "info";
  message: string;
};

// ============================================================
// HELPERS
// ============================================================

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================
// PAGE
// ============================================================

export default function DashboardPage() {
  const today = useMemo(() => toInputDate(new Date()), []);

  const fourteenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 13);
    return toInputDate(date);
  }, []);

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toInputDate(date);
  }, []);

  const [todaySummary, setTodaySummary] =
    useState<Summary | null>(null);

  const [revenueChart, setRevenueChart] = useState<
    RevenueByDate[]
  >([]);

  const [weeklyProducts, setWeeklyProducts] = useState<
    ProductSales[]
  >([]);

  const [inventoryItems, setInventoryItems] = useState<
    InventoryItem[]
  >([]);

  const [lowStockItems, setLowStockItems] = useState<
    InventoryItem[]
  >([]);

  const [insights, setInsights] = useState<Insight[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          todayResponse,
          chartResponse,
          weeklyResponse,
          inventoryResponse,
          insightsResponse,
        ] = await Promise.all([
          fetch(
            `/api/transactions/summary?start_date=${today}&end_date=${today}`,
          ),
          fetch(
            `/api/transactions/analytics?start_date=${fourteenDaysAgo}&end_date=${today}`,
          ),
          fetch(
            `/api/transactions/analytics?start_date=${sevenDaysAgo}&end_date=${today}`,
          ),
          fetch("/api/inventory"),
          fetch("/api/insights"),
        ]);

        const [
          todayResult,
          chartResult,
          weeklyResult,
          inventoryResult,
          insightsResult,
        ] = await Promise.all([
          todayResponse.json(),
          chartResponse.json(),
          weeklyResponse.json(),
          inventoryResponse.json(),
          insightsResponse.json(),
        ]);

        if (!todayResponse.ok || !todayResult.success) {
          throw new Error(
            todayResult.message ??
              "Gagal mengambil ringkasan hari ini",
          );
        }

        if (!chartResponse.ok || !chartResult.success) {
          throw new Error(
            chartResult.message ??
              "Gagal mengambil tren penjualan",
          );
        }

        if (!weeklyResponse.ok || !weeklyResult.success) {
          throw new Error(
            weeklyResult.message ??
              "Gagal mengambil produk terlaris",
          );
        }

        if (!inventoryResponse.ok || !inventoryResult.success) {
          throw new Error(
            inventoryResult.message ??
              "Gagal mengambil data inventory",
          );
        }

        if (!insightsResponse.ok || !insightsResult.success) {
          throw new Error(
            insightsResult.message ??
              "Gagal mengambil AI Daily Insight",
          );
        }

        setTodaySummary(todayResult.data);

        setRevenueChart(
          chartResult.data?.revenue_by_date ?? [],
        );

        setWeeklyProducts(
          weeklyResult.data?.product_sales ?? [],
        );

        const inventoryData: InventoryItem[] =
          inventoryResult.data ?? [];

        setInventoryItems(inventoryData);

        const lowStock = inventoryData.filter(
          (item) =>
            Number(item.current_stock) <=
            Number(item.minimum_stock),
        );

        setLowStockItems(lowStock);

        setInsights(insightsResult.data ?? []);
      } catch (error) {
        console.error("Failed to load dashboard:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [today, fourteenDaysAgo, sevenDaysAgo]);

  // ============================================================
  // DERIVED DATA
  // ============================================================

  const activeProducts = inventoryItems.filter(
    (item) => item.is_active !== false,
  );

  const topFiveProducts = weeklyProducts.slice(0, 5);

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Ringkasan bisnis Anda hari ini.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ======================================================
            TOP SECTION
        ====================================================== */}

        <section className="grid gap-6 xl:grid-cols-5">
          {/* AI DAILY INSIGHT */}
          <div className="xl:col-span-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                🤖 AI Daily Insight
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Ringkasan penting untuk bisnismu hari ini
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Insight otomatis berdasarkan transaksi dan kondisi inventory.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <p className="text-sm text-slate-500">
                  Menganalisis data bisnis...
                </p>
              ) : insights.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada insight yang tersedia.
                </p>
              ) : (
                insights.map((insight, index) => (
                  <InsightItem
                    key={`${insight.type}-${index}`}
                    insight={insight}
                  />
                ))
              )}
            </div>
          </div>

          {/* KPI GRID */}
          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
            <StatCard
              label="Pendapatan Hari Ini"
              value={
                isLoading
                  ? "..."
                  : formatCurrency(
                      todaySummary?.total_revenue ?? 0,
                    )
              }
              icon={Wallet}
              tone="green"
            />

            <StatCard
              label="Transaksi Hari Ini"
              value={
                isLoading
                  ? "..."
                  : (
                      todaySummary?.total_transactions ?? 0
                    ).toLocaleString("id-ID")
              }
              icon={Receipt}
              tone="blue"
            />

            <StatCard
              label="Total Produk"
              value={
                isLoading
                  ? "..."
                  : `${activeProducts.length.toLocaleString(
                      "id-ID",
                    )} produk`
              }
              hint="Produk aktif"
              icon={Package}
              tone="blue"
            />

            <StatCard
              label="Stok Rendah"
              value={
                isLoading
                  ? "..."
                  : `${lowStockItems.length.toLocaleString(
                      "id-ID",
                    )} produk`
              }
              hint={
                lowStockItems.length > 0
                  ? "Perlu perhatian"
                  : "Semua stok aman"
              }
              icon={PackageX}
              tone="red"
            />
          </div>
        </section>

        {/* ======================================================
            ANALYTICS SECTION
        ====================================================== */}

        <section className="grid gap-6 xl:grid-cols-12">
          {/* REVENUE CHART */}
          <div className="xl:col-span-7">
            <RevenueChart
              data={revenueChart}
              loading={isLoading}
            />
          </div>

          {/* TOP PRODUCTS */}
          <div className="xl:col-span-3">
            <TopProductsList
              products={topFiveProducts}
              loading={isLoading}
            />
          </div>

          {/* LOW STOCK */}
          <div className="xl:col-span-2">
            <LowStockList
              items={lowStockItems}
              loading={isLoading}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  tone: "green" | "blue" | "red";
}) {
  const styles = {
    green: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
    },
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
    },
    red: {
      iconBg: "bg-red-50",
      iconText: "text-red-600",
    },
  }[tone];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-3 truncate text-xl font-bold text-slate-900">
            {value}
          </p>

          {hint && (
            <p className="mt-2 text-xs text-slate-500">
              {hint}
            </p>
          )}
        </div>

        <div
          className={`shrink-0 rounded-full p-3 ${styles.iconBg}`}
        >
          <Icon
            size={20}
            className={styles.iconText}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AI INSIGHT ITEM
// ============================================================

function InsightItem({
  insight,
}: {
  insight: Insight;
}) {
  const config = {
    warning: {
      icon: "⚠️",
      className:
        "border-amber-100 bg-amber-50 text-slate-800",
    },

    positive: {
      icon: "📈",
      className:
        "border-emerald-100 bg-emerald-50 text-slate-800",
    },

    info: {
      icon: "💡",
      className:
        "border-blue-100 bg-white/80 text-slate-700",
    },
  }[insight.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${config.className}`}
    >
      <span className="mt-0.5 shrink-0 text-lg">
        {config.icon}
      </span>

      <p className="text-sm leading-6">
        {insight.message}
      </p>
    </div>
  );
}

// ============================================================
// TOP PRODUCTS LIST
// ============================================================

function TopProductsList({
  products,
  loading,
}: {
  products: ProductSales[];
  loading: boolean;
}) {
  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold text-slate-900">
          Top 5 Produk Terlaris
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          7 hari terakhir
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">
          Memuat data...
        </p>
      ) : products.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Belum ada data penjualan.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {products.map((product, index) => (
            <div
              key={product.product_id}
              className="flex items-center gap-3 py-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {product.product_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {product.quantity.toLocaleString("id-ID")} unit
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-slate-700">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}