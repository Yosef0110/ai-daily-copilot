import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { inventoryAdjustmentSchema } from "@/lib/validation/inventory";

export async function POST(request: Request) {
  try {
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

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error("Failed to retrieve business:", businessError);

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

    let body: unknown;

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

    const parsedBody = inventoryAdjustmentSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data adjustment tidak valid",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const adjustment = parsedBody.data;

    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_business_id: business.id,
      p_product_id: adjustment.product_id,
      p_adjustment_type: adjustment.adjustment_type,
      p_quantity: adjustment.quantity,
      p_reason: adjustment.reason,
      p_notes: adjustment.notes ?? null,
    });

    if (error) {
      console.error("Failed to adjust inventory:", error);

      if (error.message.includes("PRODUCT_NOT_FOUND")) {
        return NextResponse.json(
          {
            success: false,
            message: "Produk tidak ditemukan",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("PRODUCT_INACTIVE")) {
        return NextResponse.json(
          {
            success: false,
            message: "Produk sudah tidak aktif",
          },
          { status: 409 },
        );
      }

      if (error.message.includes("INSUFFICIENT_STOCK")) {
        return NextResponse.json(
          {
            success: false,
            message: "Stok tidak cukup untuk adjustment ini",
          },
          { status: 409 },
        );
      }

      if (error.message.includes("NO_STOCK_CHANGE")) {
        return NextResponse.json(
          {
            success: false,
            message: "Stok fisik sama dengan stok sistem",
          },
          { status: 409 },
        );
      }

      if (
        error.message.includes(
          "QUANTITY_MUST_BE_GREATER_THAN_ZERO",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Quantity harus lebih besar dari nol",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Gagal melakukan inventory adjustment",
        },
        { status: 500 },
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json(
      {
        success: true,
        message: "Inventory adjustment berhasil",
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Unexpected POST /api/inventory/adjustments error:",
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