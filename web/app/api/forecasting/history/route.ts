import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Pastikan user sudah login.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda harus login terlebih dahulu",
        },
        { status: 401 },
      );
    }

    // 2. Ambil business milik user.
    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (businessError) {
      console.error(
        "Failed to retrieve business:",
        businessError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil data bisnis",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message: "Bisnis pengguna tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // 3. Ambil product_id dari query parameter.
    const url = new URL(request.url);
    const productId =
      url.searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "product_id wajib diberikan",
        },
        { status: 400 },
      );
    }

    // 4. Pastikan produk benar-benar milik business user.
    const { data: product, error: productError } =
      await supabase
        .from("products")
        .select("id, name, current_stock")
        .eq("id", productId)
        .eq("business_id", business.id)
        .maybeSingle();

    if (productError) {
      console.error(
        "Failed to retrieve product:",
        productError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil produk",
        },
        { status: 500 },
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    // 5. Ambil seluruh item transaksi SALE untuk produk tersebut.
    const { data: items, error: itemsError } =
      await supabase
        .from("transaction_items")
        .select(`
          quantity,
          transactions!inner (
            transaction_date,
            transaction_type,
            business_id
          )
        `)
        .eq("product_id", productId)
        .eq("transactions.transaction_type", "sale")
        .eq("transactions.business_id", business.id);

    if (itemsError) {
      console.error(
        "Failed to retrieve sales history:",
        itemsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil histori penjualan",
        },
        { status: 500 },
      );
    }

    // 6. Gabungkan semua penjualan berdasarkan tanggal.
    const dailySales = new Map<string, number>();

    for (const item of items ?? []) {
      const transaction = Array.isArray(
        item.transactions,
      )
        ? item.transactions[0]
        : item.transactions;

      if (!transaction) {
        continue;
      }

      const date = new Date(
        transaction.transaction_date,
      )
        .toISOString()
        .slice(0, 10);

      const previousQuantity =
        dailySales.get(date) ?? 0;

      dailySales.set(
        date,
        previousQuantity + Number(item.quantity),
      );
    }

    // 7. Ubah Map menjadi array yang siap dipakai forecasting.
    const history = Array.from(
      dailySales.entries(),
    )
      .map(([date, quantitySold]) => ({
        date,
        quantity_sold: quantitySold,
      }))
      .sort((a, b) =>
        a.date.localeCompare(b.date),
      );

    return NextResponse.json(
      {
        success: true,
        data: {
          product: {
            id: product.id,
            name: product.name,
            current_stock: product.current_stock,
          },
          history,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/forecasting/history error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}