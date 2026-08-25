import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // ============================================================
    // AUTH
    // ============================================================

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

    // ============================================================
    // BUSINESS
    // ============================================================

    const { data: business, error: businessError } = await supabase
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
          message: "Bisnis untuk pengguna ini belum ditemukan",
        },
        { status: 404 },
      );
    }

    // ============================================================
    // QUERY PARAMS
    // ============================================================

    const url = new URL(request.url);

    const startDate =
      url.searchParams.get("start_date");

    const endDate =
      url.searchParams.get("end_date");

    // ============================================================
    // TRANSACTION QUERY
    // ============================================================

    let query = supabase
      .from("transactions")
      .select(`
        id,
        transaction_date,
        total_amount,
        transaction_items (
          product_id,
          quantity,
          subtotal,
          products (
            id,
            name,
            sku
          )
        )
      `)
      .eq("business_id", business.id)
      .eq("transaction_type", "sale")
      .order("transaction_date", {
        ascending: true,
      });

    if (startDate) {
      query = query.gte(
        "transaction_date",
        `${startDate}T00:00:00`,
      );
    }

    if (endDate) {
      query = query.lte(
        "transaction_date",
        `${endDate}T23:59:59.999`,
      );
    }

    const {
      data: transactions,
      error: transactionsError,
    } = await query;

    if (transactionsError) {
      console.error(
        "Failed to retrieve transaction analytics:",
        transactionsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil analytics transaksi",
        },
        { status: 500 },
      );
    }

    const rows = transactions ?? [];

    // ============================================================
    // REVENUE BY DATE
    // ============================================================

    const revenueByDateMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        transactions: number;
        items_sold: number;
      }
    >();

    for (const transaction of rows) {
      const date = new Date(
        transaction.transaction_date,
      )
        .toISOString()
        .slice(0, 10);

      const existing = revenueByDateMap.get(date) ?? {
        date,
        revenue: 0,
        transactions: 0,
        items_sold: 0,
      };

      existing.revenue += Number(
        transaction.total_amount ?? 0,
      );

      existing.transactions += 1;

      existing.items_sold +=
        transaction.transaction_items?.reduce(
          (total, item) =>
            total + Number(item.quantity ?? 0),
          0,
        ) ?? 0;

      revenueByDateMap.set(date, existing);
    }

    const revenueByDate = Array.from(
      revenueByDateMap.values(),
    ).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // ============================================================
    // PRODUCT SALES
    // ============================================================

    const productSalesMap = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        sku: string | null;
        quantity: number;
        revenue: number;
      }
    >();

    for (const transaction of rows) {
      for (const item of transaction.transaction_items ?? []) {
        const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

        if (!product) {
        continue;
        }

        const existing =
        productSalesMap.get(item.product_id) ?? {
            product_id: item.product_id,
            product_name: product.name,
            sku: product.sku ?? null,
            quantity: 0,
            revenue: 0,
        };

        existing.quantity += Number(
          item.quantity ?? 0,
        );

        existing.revenue += Number(
          item.subtotal ?? 0,
        );

        productSalesMap.set(
          item.product_id,
          existing,
        );
      }
    }

    const productSales = Array.from(
      productSalesMap.values(),
    ).sort((a, b) => b.revenue - a.revenue);

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        data: {
          revenue_by_date: revenueByDate,
          product_sales: productSales,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/transactions/analytics error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}