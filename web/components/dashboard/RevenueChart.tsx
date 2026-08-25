"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RevenueData = {
  date: string;
  revenue: number;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default function RevenueChart({
  data,
  loading,
}: {
  data: RevenueData[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">
          Tren Pendapatan
        </h2>

        <p className="text-sm text-slate-500">
          14 hari terakhir
        </p>
      </div>

      <div className="mt-6 h-[320px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Memuat data...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Belum ada transaksi.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="dashboardRevenue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                fontSize={12}
              />

              <YAxis
                tickFormatter={formatCompact}
                fontSize={12}
              />

              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  "Pendapatan",
                ]}
                labelFormatter={(value) =>
                  formatDate(String(value))
                }
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#dashboardRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}