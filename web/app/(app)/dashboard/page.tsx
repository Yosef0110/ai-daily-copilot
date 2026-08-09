import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">
            AI Daily Copilot
          </h1>

          <p className="mt-2 text-slate-600">
            Kelola produk, stok, dan aktivitas bisnis dari satu tempat.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/products"
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-blue-600">
              Product Master
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Kelola Produk
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Tambah, edit, aktifkan, dan nonaktifkan produk.
            </p>

            <div className="mt-5 text-sm font-medium text-blue-600">
              Buka Product Master →
            </div>
          </Link>

          <Link
            href="/inventory"
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-medium text-emerald-600">
              Inventory
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Kelola Stok
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Pantau stok, adjustment, dan histori perubahan inventory.
            </p>

            <div className="mt-5 text-sm font-medium text-emerald-600">
              Buka Inventory →
            </div>
          </Link>

          <div className="rounded-xl border border-dashed bg-white p-6 text-slate-400">
            <div className="text-sm font-medium">
              Coming Soon
            </div>

            <h2 className="mt-2 text-xl font-semibold text-slate-500">
              Modul Berikutnya
            </h2>

            <p className="mt-2 text-sm">
              Forecasting, recommendation, dan analytics akan terhubung di sini.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}