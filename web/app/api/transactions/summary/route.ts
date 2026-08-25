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
          quantity
        )
      `)
      .eq("business_id", business.id)
      .eq("transaction_type", "sale");

    // ============================================================
    // DATE FILTER
    // ============================================================

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
        "Failed to retrieve transaction summary:",
        transactionsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil ringkasan transaksi",
        },
        { status: 500 },
      );
    }

    // ============================================================
    // SUMMARY CALCULATION
    // ============================================================

    const rows = transactions ?? [];

    const totalRevenue = rows.reduce(
      (total, transaction) =>
        total + Number(transaction.total_amount ?? 0),
      0,
    );

    const totalTransactions = rows.length;

    const totalItemsSold = rows.reduce(
      (transactionTotal, transaction) => {
        const itemTotal =
          transaction.transaction_items?.reduce(
            (itemSum, item) =>
              itemSum + Number(item.quantity ?? 0),
            0,
          ) ?? 0;

        return transactionTotal + itemTotal;
      },
      0,
    );

    const averageTransactionValue =
      totalTransactions > 0
        ? totalRevenue / totalTransactions
        : 0;

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_transactions: totalTransactions,
          total_items_sold: totalItemsSold,
          average_transaction_value: averageTransactionValue,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/transactions/summary error:",
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