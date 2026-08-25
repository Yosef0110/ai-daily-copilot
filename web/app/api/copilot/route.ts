import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CopilotRequest = {
  message?: string;
};

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ??
  "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    // ============================================================
    // AUTH
    // ============================================================

    const supabase = await createClient();

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
    // REQUEST BODY
    // ============================================================

    let body: CopilotRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Request body harus berupa JSON yang valid",
        },
        { status: 400 },
      );
    }

    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Pesan tidak boleh kosong",
        },
        { status: 400 },
      );
    }

    // ============================================================
    // BUSINESS
    // ============================================================

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
          message: "Bisnis pengguna belum ditemukan",
        },
        { status: 404 },
      );
    }

    // ============================================================
    // BUSINESS CONTEXT
    // ============================================================

    const [
      productsResult,
      transactionsResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, sku, name, category, current_stock, minimum_stock, selling_price, unit",
        )
        .eq("business_id", business.id)
        .eq("is_active", true)
        .limit(100),

      supabase
        .from("transactions")
        .select(
          `
          id,
          transaction_date,
          total_amount,
          transaction_items (
            quantity,
            unit_price,
            subtotal,
            product_id,
            products (
              name,
              sku
            )
          )
        `,
        )
        .eq("business_id", business.id)
        .order("transaction_date", {
          ascending: false,
        })
        .limit(100),
    ]);

    if (productsResult.error) {
      console.error(
        "Failed to retrieve products for Copilot:",
        productsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal mengambil data produk untuk AI Copilot",
        },
        { status: 500 },
      );
    }

    if (transactionsResult.error) {
      console.error(
        "Failed to retrieve transactions for Copilot:",
        transactionsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal mengambil data transaksi untuk AI Copilot",
        },
        { status: 500 },
      );
    }

    // ============================================================
    // SEND TO AI SERVICE
    // ============================================================

    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/api/copilot`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message,

          context: {
            products: productsResult.data ?? [],
            transactions:
              transactionsResult.data ?? [],
          },
        }),
      },
    );

    let aiResult;

    try {
      aiResult = await aiResponse.json();
    } catch {
      console.error(
        "AI service returned non-JSON response",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "AI service memberikan response yang tidak valid",
        },
        { status: 502 },
      );
    }

    if (!aiResponse.ok) {
      console.error(
        "AI Copilot backend error:",
        aiResult,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            aiResult.detail ??
            aiResult.message ??
            "AI Copilot gagal memproses pertanyaan",
        },
        { status: aiResponse.status },
      );
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        data: {
          message: aiResult.message,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected POST /api/copilot error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Terjadi kesalahan internal pada AI Copilot",
      },
      { status: 500 },
    );
  }
}