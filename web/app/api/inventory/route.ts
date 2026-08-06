import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { inventoryQuerySchema } from "@/lib/validation/inventory";

type StockStatus = "safe" | "low" | "out";

function getStockStatus(
  currentStock: number,
  minimumStock: number,
): StockStatus {
  if (currentStock === 0) {
    return "out";
  }

  if (currentStock <= minimumStock) {
    return "low";
  }

  return "safe";
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);

    const rawQuery = {
      search:
        url.searchParams.get("search") ?? undefined,
      status:
        url.searchParams.get("status") ?? undefined,
      page:
        url.searchParams.get("page") ?? undefined,
      limit:
        url.searchParams.get("limit") ?? undefined,
    };

    const parsedQuery =
      inventoryQuerySchema.safeParse(rawQuery);

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

    const { search, status, page, limit } =
      parsedQuery.data;

    let query = supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          category,
          unit,
          current_stock,
          minimum_stock,
          safety_stock,
          lead_time_days,
          is_active,
          updated_at
        `,
      )
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (search) {
      const sanitizedSearch = search.replace(
        /[(),]/g,
        " ",
      );

      query = query.or(
        `name.ilike.%${sanitizedSearch}%,sku.ilike.%${sanitizedSearch}%`,
      );
    }

    const {
      data: products,
      error: productsError,
    } = await query;

    if (productsError) {
      console.error(
        "Failed to retrieve inventory:",
        productsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil data inventory",
        },
        { status: 500 },
      );
    }

    const inventory = (products ?? []).map(
      (product) => {
        const currentStock = Number(
          product.current_stock,
        );

        const minimumStock = Number(
          product.minimum_stock,
        );

        return {
          ...product,
          current_stock: currentStock,
          minimum_stock: minimumStock,
          safety_stock: Number(
            product.safety_stock,
          ),
          stock_status: getStockStatus(
            currentStock,
            minimumStock,
          ),
        };
      },
    );

    const filteredInventory = status
      ? inventory.filter(
          (item) => item.stock_status === status,
        )
      : inventory;

    const totalItems = filteredInventory.length;
    const totalPages = Math.ceil(
      totalItems / limit,
    );

    const from = (page - 1) * limit;
    const to = from + limit;

    const paginatedInventory =
      filteredInventory.slice(from, to);

    return NextResponse.json(
      {
        success: true,
        data: paginatedInventory,
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
      "Unexpected GET /api/inventory error:",
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