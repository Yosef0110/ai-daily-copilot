import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Insight = {
  type: "warning" | "positive" | "info";
  message: string;
};

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function GET() {
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
    // DATE RANGE
    // ============================================================

    const today = new Date();

    const todayString = toDateString(today);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const sevenDaysAgoString =
      toDateString(sevenDaysAgo);

    // ============================================================
    // TODAY TRANSACTIONS
    // ============================================================

    const {
      data: todayTransactions,
      error: todayTransactionsError,
    } = await supabase
      .from("transactions")
      .select(`
        id,
        total_amount,
        transaction_items (
          quantity
        )
      `)
      .eq("business_id", business.id)
      .eq("transaction_type", "sale")
      .gte(
        "transaction_date",
        `${todayString}T00:00:00`,
      )
      .lte(
        "transaction_date",
        `${todayString}T23:59:59.999`,
      );

    if (todayTransactionsError) {
      console.error(
        "Failed to retrieve today's transactions:",
        todayTransactionsError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal mengambil transaksi hari ini",
        },
        { status: 500 },
      );
    }

    // ============================================================
    // WEEKLY SALES
    // ============================================================

    const {
      data: weeklyTransactions,
      error: weeklyTransactionsError,
    } = await supabase
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
      .gte(
        "transaction_date",
        `${sevenDaysAgoString}T00:00:00`,
      )
      .lte(
        "transaction_date",
        `${todayString}T23:59:59.999`,
      );

    if (weeklyTransactionsError) {
      console.error(
        "Failed to retrieve weekly transactions:",
        weeklyTransactionsError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal mengambil transaksi mingguan",
        },
        { status: 500 },
      );
    }

    // ============================================================
    // INVENTORY
    // ============================================================

    const {
      data: products,
      error: productsError,
    } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        unit,
        current_stock,
        minimum_stock,
        safety_stock,
        is_active
      `)
      .eq("business_id", business.id)
      .eq("is_active", true);

    if (productsError) {
      console.error(
        "Failed to retrieve products:",
        productsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil data produk",
        },
        { status: 500 },
      );
    }

    // ============================================================
    // TODAY SUMMARY
    // ============================================================

    const todayRows =
      todayTransactions ?? [];

    const todayRevenue =
      todayRows.reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.total_amount ?? 0,
          ),
        0,
      );

    const todayTransactionCount =
      todayRows.length;

    // ============================================================
    // LOW STOCK PRODUCTS
    // ============================================================

    const lowStockProducts =
      (products ?? []).filter(
        (product) =>
          Number(
            product.current_stock ?? 0,
          ) <=
          Number(
            product.minimum_stock ?? 0,
          ),
      );

    // ============================================================
    // TOP PRODUCT
    // ============================================================

    const productSalesMap = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const transaction of
      weeklyTransactions ?? []) {
      for (const item of
        transaction.transaction_items ?? []) {
        const product =
          Array.isArray(item.products)
            ? item.products[0]
            : item.products;

        if (!product) {
          continue;
        }

        const existing =
          productSalesMap.get(
            item.product_id,
          ) ?? {
            product_id:
              item.product_id,
            product_name:
              product.name,
            quantity: 0,
            revenue: 0,
          };

        existing.quantity +=
          Number(item.quantity ?? 0);

        existing.revenue +=
          Number(item.subtotal ?? 0);

        productSalesMap.set(
          item.product_id,
          existing,
        );
      }
    }

    const topProduct =
      Array.from(
        productSalesMap.values(),
      ).sort(
        (a, b) =>
          b.revenue - a.revenue,
      )[0] ?? null;

    // ============================================================
    // RULE-BASED INSIGHTS
    // ============================================================

    const insights: Insight[] = [];

    // Low stock insight
    if (lowStockProducts.length > 0) {
      const firstLowStock =
        lowStockProducts[0];

      insights.push({
        type: "warning",
        message:
          lowStockProducts.length === 1
            ? `${firstLowStock.name} sudah mencapai atau berada di bawah minimum stock.`
            : `${lowStockProducts.length} produk sudah mencapai atau berada di bawah minimum stock. Produk yang perlu diperhatikan terlebih dahulu adalah ${firstLowStock.name}.`,
      });
    }

    // Top product insight
    if (topProduct) {
      insights.push({
        type: "positive",
        message: `${topProduct.product_name} menjadi produk dengan omzet tertinggi selama 7 hari terakhir, dengan ${topProduct.quantity.toLocaleString(
          "id-ID",
        )} unit terjual.`,
      });
    }

    // Today's performance
    if (
      todayTransactionCount > 0
    ) {
      insights.push({
        type: "info",
        message: `Hari ini tercatat ${todayTransactionCount.toLocaleString(
          "id-ID",
        )} transaksi dengan total omzet ${formatCurrency(
          todayRevenue,
        )}.`,
      });
    } else {
      insights.push({
        type: "info",
        message:
          "Belum ada transaksi penjualan yang tercatat hari ini.",
      });
    }

    // No low-stock condition
    if (
      lowStockProducts.length === 0
    ) {
      insights.push({
        type: "positive",
        message:
          "Seluruh produk aktif masih berada di atas minimum stock.",
      });
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        data: insights.slice(0, 4),
        meta: {
          today: todayString,
          low_stock_count:
            lowStockProducts.length,
          today_revenue:
            todayRevenue,
          today_transactions:
            todayTransactionCount,
          top_product:
            topProduct,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/insights error:",
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