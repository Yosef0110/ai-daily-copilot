import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_ORIGINS = [
  "https://skittish-alpinely-james.ngrok-free.dev",
];

export async function GET(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      {
        success: false,
        message: "Origin tidak diizinkan",
      },
      { status: 403 },
    );
  }

  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Failed to retrieve internal products:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil products",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: products,
  });
}