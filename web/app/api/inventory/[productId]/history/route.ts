import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  inventoryHistoryQuerySchema,
  inventoryProductIdSchema,
} from "@/lib/validation/inventory";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { productId } = await context.params;

    const parsedProductId =
      inventoryProductIdSchema.safeParse(productId);

    if (!parsedProductId.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID tidak valid",
        },
        { status: 400 },
      );
    }

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
          message: "Bisnis untuk pengguna ini belum ditemukan",
        },
        { status: 404 },
      );
    }

    const { data: product, error: productError } =
      await supabase
        .from("products")
        .select(
          `
            id,
            sku,
            name,
            current_stock,
            minimum_stock,
            unit,
            is_active
          `,
        )
        .eq("id", parsedProductId.data)
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
          message: "Gagal mengambil data produk",
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

    const url = new URL(request.url);

    const rawQuery = {
      page:
        url.searchParams.get("page") ?? undefined,
      limit:
        url.searchParams.get("limit") ?? undefined,
    };

    const parsedQuery =
      inventoryHistoryQuerySchema.safeParse(rawQuery);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter tidak valid",
          errors: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { page, limit } = parsedQuery.data;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: movements,
      error: movementsError,
      count,
    } = await supabase
      .from("inventory_movements")
      .select(
        `
          id,
          movement_type,
          quantity_change,
          stock_before,
          stock_after,
          reference_type,
          reference_id,
          reason,
          notes,
          created_at
        `,
        { count: "exact" },
      )
      .eq("business_id", business.id)
      .eq("product_id", parsedProductId.data)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (movementsError) {
      console.error(
        "Failed to retrieve inventory history:",
        movementsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil histori stok",
        },
        { status: 500 },
      );
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          product: {
            ...product,
            current_stock: Number(product.current_stock),
            minimum_stock: Number(product.minimum_stock),
          },
          movements: (movements ?? []).map((movement) => ({
            ...movement,
            quantity_change: Number(
              movement.quantity_change,
            ),
            stock_before: Number(
              movement.stock_before,
            ),
            stock_after: Number(
              movement.stock_after,
            ),
          })),
        },
        pagination: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected GET /api/inventory/:productId/history error:",
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