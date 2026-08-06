"use client";

import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ApiResult = {
  status: number;
  body: unknown;
};

const initialProduct = {
  sku: "TEST-002",
  name: "Produk Test Browser",
  category: "Testing",
  unit: "pcs",
  selling_price: 5000,
  current_stock: 10,
  minimum_stock: 3,
  safety_stock: 2,
  lead_time_days: 1,
  is_active: true,
};

export function ProductApiTester() {
  const supabase = createClient();

  const [email, setEmail] = useState("demo2@aidailycopilot.local");
  const [password, setPassword] = useState("demo123456");
  const [productId, setProductId] = useState("");
  const [productJson, setProductJson] = useState(
    JSON.stringify(initialProduct, null, 2),
  );
  const [adjustmentJson, setAdjustmentJson] = useState(
    JSON.stringify(
        {
        product_id: "33333333-3333-3333-3333-333333333331",
        adjustment_type: "damaged",
        quantity: 2,
        reason: "Barang rusak saat penyimpanan",
        notes: "Testing melalui browser",
        },
        null,
        2,
    ),
    );
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyProductId, setHistoryProductId] = useState(
    "33333333-3333-4333-8333-333333333331",
    );

  async function parseResponse(response: Response): Promise<ApiResult> {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      status: response.status,
      body,
    };
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setResult({
          status: 401,
          body: {
            success: false,
            message: error.message,
          },
        });
        return;
      }

      setResult({
        status: 200,
        body: {
          success: true,
          message: "Login berhasil",
          user: data.user,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      setResult({
        status: error ? 500 : 200,
        body: error
          ? {
              success: false,
              message: error.message,
            }
          : {
              success: true,
              message: "Logout berhasil",
            },
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function callApi(
    url: string,
    options?: RequestInit,
  ) {
    setIsLoading(true);

    try {
      const response = await fetch(url, options);
      setResult(await parseResponse(response));
    } catch (error) {
      setResult({
        status: 0,
        body: {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Request gagal",
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  function parseProductBody(): unknown | null {
    try {
      return JSON.parse(productJson);
    } catch {
      setResult({
        status: 400,
        body: {
          success: false,
          message: "Product JSON tidak valid",
        },
      });

      return null;
    }
  }

  async function createProduct() {
    const body = parseProductBody();

    if (!body) {
      return;
    }

    await callApi("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  function parseAdjustmentBody(): unknown | null {
    try {
        return JSON.parse(adjustmentJson);
    } catch {
        setResult({
        status: 400,
        body: {
            success: false,
            message: "Adjustment JSON tidak valid",
        },
        });

        return null;
    }
    }

    async function createInventoryAdjustment() {
    const body = parseAdjustmentBody();

    if (!body) {
        return;
    }

    await callApi("/api/inventory/adjustments", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    }

  async function updateProduct() {
    if (!productId.trim()) {
      setResult({
        status: 400,
        body: {
          success: false,
          message: "Product ID wajib diisi",
        },
      });
      return;
    }

    const body = parseProductBody();

    if (!body) {
      return;
    }

    await callApi(`/api/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Product API Tester
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Development-only interface untuk menguji Product Master API.
          </p>
        </div>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Authentication</h2>

          <form
            onSubmit={handleLogin}
            className="mt-4 grid gap-4 md:grid-cols-3"
          >
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="rounded-md border px-3 py-2"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="rounded-md border px-3 py-2"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Login
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
              >
                Logout
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Product Collection
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => callApi("/api/products")}
              disabled={isLoading}
              className="rounded-md bg-slate-900 px-4 py-2 text-white"
            >
              GET Products
            </button>

            <button
              onClick={() =>
                callApi("/api/products?search=indomie")
              }
              disabled={isLoading}
              className="rounded-md border px-4 py-2"
            >
              Search Indomie
            </button>

            <button
              onClick={() =>
                callApi("/api/products?category=Minuman")
              }
              disabled={isLoading}
              className="rounded-md border px-4 py-2"
            >
              Filter Minuman
            </button>

            <button
              onClick={createProduct}
              disabled={isLoading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white"
            >
              POST Product
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
                Inventory API
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                onClick={() => callApi("/api/inventory")}
                disabled={isLoading}
                className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                GET Inventory
                </button>

                <button
                onClick={() =>
                    callApi("/api/inventory?status=safe")
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                Filter Aman
                </button>

                <button
                onClick={() =>
                    callApi("/api/inventory?status=low")
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                Filter Menipis
                </button>

                <button
                onClick={() =>
                    callApi("/api/inventory?status=out")
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                Filter Habis
                </button>

                <button
                onClick={() =>
                    callApi("/api/inventory?search=indomie")
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                Search Indomie
                </button>

                <button
                onClick={() =>
                    callApi("/api/inventory?page=1&limit=2")
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                Pagination 2
                </button>
            </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
                Inventory Adjustment
            </h2>

            <p className="mt-2 text-sm text-slate-600">
                Untuk damaged, lost, dan expired, quantity adalah jumlah barang
                yang dikurangi. Untuk stock_opname dan manual_correction, quantity
                adalah stok fisik terbaru.
            </p>

            <textarea
                value={adjustmentJson}
                onChange={(event) => setAdjustmentJson(event.target.value)}
                rows={10}
                className="mt-4 w-full rounded-md border p-3 font-mono text-sm"
            />

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                onClick={createInventoryAdjustment}
                disabled={isLoading}
                className="rounded-md bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
                >
                POST Adjustment
                </button>

                <button
                onClick={() =>
                    setAdjustmentJson(
                    JSON.stringify(
                        {
                        product_id:
                            "33333333-3333-3333-3333-333333333331",
                        adjustment_type: "damaged",
                        quantity: 2,
                        reason: "Barang rusak",
                        notes: "Preset damaged",
                        },
                        null,
                        2,
                    ),
                    )
                }
                type="button"
                className="rounded-md border px-4 py-2"
                >
                Preset Damaged
                </button>

                <button
                onClick={() =>
                    setAdjustmentJson(
                    JSON.stringify(
                        {
                        product_id:
                            "33333333-3333-3333-3333-333333333331",
                        adjustment_type: "stock_opname",
                        quantity: 60,
                        reason: "Hasil stock opname",
                        notes: "Stok fisik dihitung ulang",
                        },
                        null,
                        2,
                    ),
                    )
                }
                type="button"
                className="rounded-md border px-4 py-2"
                >
                Preset Stock Opname
                </button>

                <button
                onClick={() =>
                    setAdjustmentJson(
                    JSON.stringify(
                        {
                        product_id:
                            "33333333-3333-3333-3333-333333333331",
                        adjustment_type: "manual_correction",
                        quantity: 75,
                        reason: "Koreksi stok manual",
                        notes: "Preset manual correction",
                        },
                        null,
                        2,
                    ),
                    )
                }
                type="button"
                className="rounded-md border px-4 py-2"
                >
                Preset Manual Correction
                </button>

                <button
                onClick={() => callApi("/api/inventory")}
                disabled={isLoading}
                type="button"
                className="rounded-md border px-4 py-2"
                >
                Refresh Inventory
                </button>
            </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
                Inventory History
            </h2>

            <input
                value={historyProductId}
                onChange={(event) =>
                setHistoryProductId(event.target.value)
                }
                placeholder="Product UUID"
                className="mt-4 w-full rounded-md border px-3 py-2"
            />

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                onClick={() =>
                    callApi(
                    `/api/inventory/${historyProductId}/history`,
                    )
                }
                disabled={isLoading}
                className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                GET Inventory History
                </button>

                <button
                onClick={() =>
                    callApi(
                    `/api/inventory/${historyProductId}/history?page=1&limit=2`,
                    )
                }
                disabled={isLoading}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                History Pagination 2
                </button>
            </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Product Detail
          </h2>

          <input
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            placeholder="Product UUID"
            className="mt-4 w-full rounded-md border px-3 py-2"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() =>
                callApi(`/api/products/${productId}`)
              }
              disabled={isLoading}
              className="rounded-md bg-slate-900 px-4 py-2 text-white"
            >
              GET Detail
            </button>

            <button
              onClick={updateProduct}
              disabled={isLoading}
              className="rounded-md bg-amber-500 px-4 py-2 text-white"
            >
              PATCH Product
            </button>

            <button
              onClick={() =>
                callApi(`/api/products/${productId}`, {
                  method: "DELETE",
                })
              }
              disabled={isLoading}
              className="rounded-md bg-red-600 px-4 py-2 text-white"
            >
              DELETE Product
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Request JSON
          </h2>

          <textarea
            value={productJson}
            onChange={(event) => setProductJson(event.target.value)}
            rows={14}
            className="mt-4 w-full rounded-md border p-3 font-mono text-sm"
          />
        </section>

        <section className="rounded-xl bg-slate-950 p-6 text-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Response</h2>
            <span className="rounded bg-slate-800 px-3 py-1 text-sm">
              Status: {result?.status ?? "-"}
            </span>
          </div>

          <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">
            {result
              ? JSON.stringify(result.body, null, 2)
              : "Belum ada request."}
          </pre>
        </section>
      </div>
    </main>
  );
}