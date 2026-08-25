"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type TransactionItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products:
    | {
        id: string;
        name: string;
        sku: string | null;
      }
    | {
        id: string;
        name: string;
        sku: string | null;
      }[]
    | null;
};

type Transaction = {
  id: string;
  transaction_type: string;
  transaction_date: string;
  total_amount: number;
  source: string | null;
  created_at: string;
  transaction_items: TransactionItem[];
};

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function TransactionsPage() {
  const today = useMemo(() => new Date(), []);

  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);

    return toInputDate(date);
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(toInputDate(today));

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [summary, setSummary] = useState<Summary>({
    total_revenue: 0,
    total_transactions: 0,
    total_items_sold: 0,
    average_transaction_value: 0,
  });

  const [revenueByDate, setRevenueByDate] = useState<
    RevenueByDate[]
  >([]);

  const [productSales, setProductSales] = useState<
    ProductSales[]
  >([]);

  const [productMetric, setProductMetric] = useState<
    "revenue" | "quantity"
  >("revenue");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTransactions(
    selectedStartDate = startDate,
    selectedEndDate = endDate,
  ) {
    setIsLoading(true);
    setErrorMessage("");
    setCurrentPage(1);

    try {
      const params = new URLSearchParams({
        start_date: selectedStartDate,
        end_date: selectedEndDate,
      });

      const [
        transactionsResponse,
        summaryResponse,
        analyticsResponse,
      ] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch(`/api/transactions/summary?${params.toString()}`),
        fetch(`/api/transactions/analytics?${params.toString()}`),
      ]);

      const [
        transactionsResult,
        summaryResult,
        analyticsResult,
      ] = await Promise.all([
        transactionsResponse.json(),
        summaryResponse.json(),
        analyticsResponse.json(),
      ]);

      if (
        !transactionsResponse.ok ||
        !transactionsResult.success
      ) {
        throw new Error(
          transactionsResult.message ??
            "Gagal mengambil riwayat transaksi",
        );
      }

      if (!summaryResponse.ok || !summaryResult.success) {
        throw new Error(
          summaryResult.message ??
            "Gagal mengambil ringkasan transaksi",
        );
      }

      if (
        !analyticsResponse.ok ||
        !analyticsResult.success
      ) {
        throw new Error(
          analyticsResult.message ??
            "Gagal mengambil analytics transaksi",
        );
      }

      setTransactions(transactionsResult.data ?? []);
      setSummary(summaryResult.data);
      setRevenueByDate(
        analyticsResult.data.revenue_by_date ?? [],
      );
      setProductSales(
        analyticsResult.data.product_sales ?? [],
      );
    } catch (error) {
      console.error(
        "Failed to load transaction page:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal memuat data transaksi",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  function applyQuickRange(days: number) {
    const end = new Date();
    const start = new Date();

    start.setDate(start.getDate() - (days - 1));

    const nextStart = toInputDate(start);
    const nextEnd = toInputDate(end);

    setStartDate(nextStart);
    setEndDate(nextEnd);

    void loadTransactions(nextStart, nextEnd);
  }

  function applyToday() {
    const current = toInputDate(new Date());

    setStartDate(current);
    setEndDate(current);

    void loadTransactions(current, current);
  }

  function applyThisMonth() {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const nextStart = toInputDate(start);
    const nextEnd = toInputDate(now);

    setStartDate(nextStart);
    setEndDate(nextEnd);

    void loadTransactions(nextStart, nextEnd);
  }

  const totalPages = Math.ceil(
    transactions.length / itemsPerPage,
  );

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            Transaksi & Penjualan
          </h1>

          <p className="mt-2 text-slate-600">
            Pantau histori transaksi, omzet, dan performa
            penjualan berdasarkan periode.
          </p>
        </div>

        {/* FILTER */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyToday}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Hari Ini
              </button>

              <button
                type="button"
                onClick={() => applyQuickRange(7)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                7 Hari
              </button>

              <button
                type="button"
                onClick={() => applyQuickRange(30)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                30 Hari
              </button>

              <button
                type="button"
                onClick={applyThisMonth}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Bulan Ini
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Dari
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Sampai
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadTransactions()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Terapkan
            </button>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Omzet"
            value={formatCurrency(summary.total_revenue)}
          />

          <SummaryCard
            title="Total Transaksi"
            value={summary.total_transactions.toLocaleString(
              "id-ID",
            )}
          />

          <SummaryCard
            title="Produk Terjual"
            value={`${summary.total_items_sold.toLocaleString(
              "id-ID",
            )} unit`}
          />

          <SummaryCard
            title="Rata-rata Transaksi"
            value={formatCurrency(
              summary.average_transaction_value,
            )}
          />
        </section>

        {/* REVENUE CHART */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Tren Omzet
            </h2>

            <p className="text-sm text-slate-500">
              Total omzet penjualan per hari.
            </p>
          </div>

          <div className="h-[340px]">
            {isLoading ? (
              <LoadingState />
            ) : revenueByDate.length === 0 ? (
              <EmptyState message="Belum ada transaksi pada periode ini." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByDate}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      formatDate(value)
                    }
                    fontSize={12}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("id-ID", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                    fontSize={12}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Omzet",
                    ]}
                    labelFormatter={(label) =>
                      formatDate(String(label))
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Omzet"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* PRODUCT SALES */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Penjualan per Produk
              </h2>

              <p className="text-sm text-slate-500">
                Bandingkan performa setiap produk.
              </p>
            </div>

            <select
              value={productMetric}
              onChange={(event) =>
                setProductMetric(
                  event.target.value as
                    | "revenue"
                    | "quantity",
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="revenue">Omzet</option>
              <option value="quantity">
                Jumlah Terjual
              </option>
            </select>
          </div>

          <div className="h-[360px]">
            {isLoading ? (
              <LoadingState />
            ) : productSales.length === 0 ? (
              <EmptyState message="Belum ada penjualan produk pada periode ini." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productSales}
                  layout="vertical"
                  margin={{
                    top: 0,
                    right: 24,
                    bottom: 0,
                    left: 40,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      productMetric === "revenue"
                        ? new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                          }).format(value)
                        : Number(value).toLocaleString(
                            "id-ID",
                          )
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="product_name"
                    width={130}
                    fontSize={12}
                  />

                  <Tooltip
                    formatter={(value) => [
                      productMetric === "revenue"
                        ? formatCurrency(Number(value))
                        : `${Number(
                            value,
                          ).toLocaleString("id-ID")} unit`,
                      productMetric === "revenue"
                        ? "Omzet"
                        : "Terjual",
                    ]}
                  />

                  <Bar
                    dataKey={productMetric}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* TRANSACTION TABLE */}
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold">
              Riwayat Transaksi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {transactions.length.toLocaleString("id-ID")}{" "}
              transaksi pada periode terpilih.
            </p>
          </div>

          {isLoading ? (
            <div className="p-8">
              <LoadingState />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8">
              <EmptyState message="Belum ada transaksi." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3">
                      Tanggal
                    </th>

                    <th className="px-6 py-3">
                      Transaction ID
                    </th>

                    <th className="px-6 py-3">
                      Produk
                    </th>

                    <th className="px-6 py-3 text-right">
                      Qty
                    </th>

                    <th className="px-6 py-3 text-right">
                      Total
                    </th>

                    <th className="px-6 py-3">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedTransactions.map((transaction) => {
                    const totalQuantity =
                      transaction.transaction_items?.reduce(
                        (total, item) =>
                          total +
                          Number(item.quantity ?? 0),
                        0,
                      ) ?? 0;

                    const productNames =
                      transaction.transaction_items
                        ?.map((item) => {
                          const product =
                            Array.isArray(
                              item.products,
                            )
                              ? item.products[0]
                              : item.products;

                          return product?.name;
                        })
                        .filter(Boolean)
                        .join(", ");

                    return (
                      <tr
                        key={transaction.id}
                        className="border-t hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          {formatDate(
                            transaction.transaction_date,
                          )}
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {transaction.id.slice(0, 8)}
                        </td>

                        <td className="max-w-[320px] px-6 py-4">
                          {productNames || "-"}
                        </td>

                        <td className="px-6 py-4 text-right tabular-nums">
                          {totalQuantity.toLocaleString(
                            "id-ID",
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-medium tabular-nums">
                          {formatCurrency(
                            Number(
                              transaction.total_amount,
                            ),
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {transaction.source ?? "manual"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            
          )}

          {transactions.length > 0 && (
            <div className="flex flex-col gap-4 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan{" "}
                <span className="font-medium text-slate-700">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {" - "}
                <span className="font-medium text-slate-700">
                  {Math.min(
                    currentPage * itemsPerPage,
                    transactions.length,
                  )}
                </span>{" "}
                dari{" "}
                <span className="font-medium text-slate-700">
                  {transactions.length}
                </span>{" "}
                transaksi
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1),
                    )
                  }
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-slate-600">
                  Page{" "}
                  <span className="font-semibold text-slate-900">
                    {currentPage}
                  </span>{" "}
                  / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(page + 1, totalPages),
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      Memuat data...
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      {message}
    </div>
  );
}