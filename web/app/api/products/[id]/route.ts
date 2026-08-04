import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  productIdSchema,
  updateProductSchema,
} from "@/lib/validation/product";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AuthBusinessResult =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      businessId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

async function getAuthenticatedBusinessId(): Promise<AuthBusinessResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Anda harus login terlebih dahulu",
        },
        { status: 401 },
      ),
    };
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error("Failed to retrieve business:", businessError);

    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil data bisnis",
        },
        { status: 500 },
      ),
    };
  }

  if (!business) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Bisnis untuk pengguna ini belum ditemukan",
        },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true,
    supabase,
    businessId: business.id,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const parsedId = productIdSchema.safeParse(id);

    if (!parsedId.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID tidak valid",
        },
        { status: 400 },
      );
    }

    const authResult = await getAuthenticatedBusinessId();

    if (!authResult.ok) {
    return authResult.response;
    }

    const { supabase, businessId } = authResult;

    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        product_aliases (
          id,
          alias_name,
          source,
          created_at
        )
      `)
      .eq("id", parsedId.data)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      console.error("Failed to retrieve product:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil detail produk",
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

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected GET /api/products/:id error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const parsedId = productIdSchema.safeParse(id);

    if (!parsedId.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID tidak valid",
        },
        { status: 400 },
      );
    }

    const authResult = await getAuthenticatedBusinessId();

    if (!authResult.ok) {
    return authResult.response;
    }

    const { supabase, businessId } = authResult;

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

    const parsedBody = updateProductSchema.safeParse(body);

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

    const updateInput = parsedBody.data;

    if (updateInput.sku) {
      const { data: duplicateProduct, error: duplicateError } =
        await supabase
          .from("products")
          .select("id")
          .eq("business_id", businessId)
          .eq("sku", updateInput.sku)
          .neq("id", parsedId.data)
          .maybeSingle();

      if (duplicateError) {
        console.error("Failed to check duplicate SKU:", duplicateError);

        return NextResponse.json(
          {
            success: false,
            message: "Gagal memeriksa SKU produk",
          },
          { status: 500 },
        );
      }

      if (duplicateProduct) {
        return NextResponse.json(
          {
            success: false,
            message: `SKU ${updateInput.sku} sudah digunakan`,
          },
          { status: 409 },
        );
      }
    }

    const { data: product, error: updateError } = await supabase
      .from("products")
      .update({
        ...updateInput,
      })
      .eq("id", parsedId.data)
      .eq("business_id", businessId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update product:", updateError);

      if (updateError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            message: "SKU produk sudah digunakan",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memperbarui produk",
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

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil diperbarui",
        data: product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected PATCH /api/products/:id error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const parsedId = productIdSchema.safeParse(id);

    if (!parsedId.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID tidak valid",
        },
        { status: 400 },
      );
    }

    const authResult = await getAuthenticatedBusinessId();

    if (!authResult.ok) {
    return authResult.response;
    }

    const { supabase, businessId } = authResult;

    const { data: product, error } = await supabase
      .from("products")
      .update({
        is_active: false,
      })
      .eq("id", parsedId.data)
      .eq("business_id", businessId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Failed to deactivate product:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal menonaktifkan produk",
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

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil dinonaktifkan",
        data: product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected DELETE /api/products/:id error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal pada server",
      },
      { status: 500 },
    );
  }
}