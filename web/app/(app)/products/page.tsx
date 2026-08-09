"use client";

import { useEffect, useState } from "react";
import { EditProductModal } from "@/components/products/edit-product-modal";
import { CreateProductModal } from "@/components/products/create-product-modal";

import type {
  ApiErrorResponse,
  Product,
  ProductListResponse,
} from "@/types/product";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
        setIsLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (status) params.set("is_active", status);

        try {
        const response = await fetch(
            `/api/products?${params.toString()}`,
        );

        const result = (await response.json()) as
            | ProductListResponse
            | ApiErrorResponse;

        if (!response.ok) {
            throw new Error(
            "message" in result
                ? result.message
                : "Gagal mengambil produk",
            );
        }

        if (!result.success) {
            throw new Error(result.message);
        }

        setProducts(result.data);
        } catch (error) {
        setError(
            error instanceof Error
            ? error.message
            : "Gagal mengambil produk",
        );
        } finally {
        console.log("Fetch selesai");
        setIsLoading(false);
        }
    }

    const timeout = setTimeout(() => {
        void fetchProducts();
    }, 300);

    return () => clearTimeout(timeout);
    }, [search, category, status]);

    async function toggleProductStatus(product: Product) {
        const nextStatus = !product.is_active;

        const confirmed = window.confirm(
            nextStatus
            ? `Aktifkan kembali produk "${product.name}"?`
            : `Nonaktifkan produk "${product.name}"?`,
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = nextStatus
            ? await fetch(`/api/products/${product.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    is_active: true,
                }),
                })
            : await fetch(`/api/products/${product.id}`, {
                method: "DELETE",
                });

            const result = (await response.json()) as
            | {
                success: true;
                message: string;
                data: Product;
                }
            | ApiErrorResponse;

            if (!response.ok || result.success === false) {
            throw new Error(
                "message" in result
                ? result.message
                : "Gagal memperbarui status produk",
            );
            }

            setProducts((currentProducts) =>
            currentProducts.map((currentProduct) =>
                currentProduct.id === product.id
                ? {
                    ...currentProduct,
                    is_active: nextStatus,
                    updated_at: result.data.updated_at,
                    }
                : currentProduct,
            ),
            );
        } catch (error) {
            window.alert(
            error instanceof Error
                ? error.message
                : "Gagal memperbarui status produk",
            );
        }
    }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Product Master
            </h1>
            <p className="mt-2 text-slate-600">
              Kelola katalog produk dan informasi stok dasar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            + Tambah Produk
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau SKU..."
            className="rounded-md border px-3 py-2"
          />

          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Filter kategori..."
            className="rounded-md border px-3 py-2"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border px-3 py-2"
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-slate-500">
              Memuat produk...
            </div>
          )}

          {!isLoading && error && (
            <div className="p-8 text-center text-red-600">
              {error}
            </div>
          )}

          {!isLoading && !error && products.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Belum ada produk.
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-right">
                        Harga
                    </th>
                    <th className="px-4 py-3">Stok</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">
                        Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-mono text-sm">
                        {product.sku}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {product.name}
                      </td>

                      <td className="px-4 py-3">
                        {product.category ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        Rp{" "}
                        {product.selling_price.toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3">
                        {product.current_stock} {product.unit}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            product.is_active
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700"
                              : "rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-600"
                          }
                        >
                          {product.is_active
                            ? "Aktif"
                            : "Nonaktif"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingProduct(product)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                            </button>

                            <button
                            type="button"
                            onClick={() => toggleProductStatus(product)}
                            className={
                                product.is_active
                                ? "rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                : "rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                            }
                            >
                            {product.is_active
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                            </button>
                        </div>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>

        <EditProductModal
          product={editingProduct}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          onClose={() => setEditingProduct(null)}
          onSaved={(updatedProduct: Product) => {
            setProducts((currentProducts) =>
              currentProducts.map((product) =>
                product.id === updatedProduct.id
                  ? updatedProduct
                  : product,
              ),
            );
          }}
        />

        <CreateProductModal
          isOpen={isCreateOpen}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newProduct: Product) => {
            setProducts((currentProducts) => [
              newProduct,
              ...currentProducts,
            ]);
          }}
        />
          </main>
        );
}