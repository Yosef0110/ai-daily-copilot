import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  productQuerySchema,
} from "@/lib/validation/product";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Memastikan request berasal dari user yang sudah login.
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

    // Untuk MVP, satu user diasumsikan memiliki satu business.
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

    const url = new URL(request.url);

    const rawQuery = {
      search: url.searchParams.get("search") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      is_active: url.searchParams.get("is_active") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const parsedQuery = productQuerySchema.safeParse(rawQuery);

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

    const { search, category, is_active, page, limit } = parsedQuery.data;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      const sanitizedSearch = search.replace(/[(),]/g, " ");

      query = query.or(
        `name.ilike.%${sanitizedSearch}%,sku.ilike.%${sanitizedSearch}%`,
      );
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active);
    }

    const { data: products, error: productsError, count } = await query;

    if (productsError) {
      console.error("Failed to retrieve products:", productsError);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil daftar produk",
        },
        { status: 500 },
      );
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json(
      {
        success: true,
        data: products,
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
    console.error("Unexpected GET /api/products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}

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

    const parsedBody = createProductSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data produk tidak valid",
          errors: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const productInput = parsedBody.data;

    const { data: existingProduct, error: duplicateCheckError } =
      await supabase
        .from("products")
        .select("id")
        .eq("business_id", business.id)
        .eq("sku", productInput.sku)
        .maybeSingle();

    if (duplicateCheckError) {
      console.error(
        "Failed to check duplicate product:",
        duplicateCheckError,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memeriksa SKU produk",
        },
        { status: 500 },
      );
    }

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: `SKU ${productInput.sku} sudah digunakan`,
        },
        { status: 409 },
      );
    }

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        business_id: business.id,
        sku: productInput.sku,
        name: productInput.name,
        category: productInput.category ?? null,
        unit: productInput.unit,
        selling_price: productInput.selling_price,
        current_stock: productInput.current_stock,
        minimum_stock: productInput.minimum_stock,
        safety_stock: productInput.safety_stock,
        lead_time_days: productInput.lead_time_days,
        is_active: productInput.is_active,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to create product:", insertError);

      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            message: `SKU ${productInput.sku} sudah digunakan`,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Gagal menambahkan produk",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan",
        data: product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected POST /api/products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}