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
        transaction_type,
        transaction_date,
        total_amount,
        source,
        created_at,
        transaction_items (
          id,
          product_id,
          quantity,
          unit_price,
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
        ascending: false,
      });

    // ============================================================
    // DATE FILTER
    // ============================================================

    if (startDate) {
      const start = `${startDate}T00:00:00`;

      query = query.gte(
        "transaction_date",
        start,
      );
    }

    if (endDate) {
      const end = `${endDate}T23:59:59.999`;

      query = query.lte(
        "transaction_date",
        end,
      );
    }

    const {
      data: transactions,
      error: transactionsError,
    } = await query;

    if (transactionsError) {
      console.error(
        "Failed to retrieve transactions:",
        transactionsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil riwayat transaksi",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: transactions ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/transactions error:",
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