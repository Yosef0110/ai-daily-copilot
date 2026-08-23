import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let body: {
      email?: string;
      password?: string;
    };

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

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password wajib diisi",
        },
        { status: 400 },
      );
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.user) {
      console.error("Login failed:", error);

      return NextResponse.json(
        {
          success: false,
          message: error?.message ?? "Email atau password salah",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil",
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected POST /api/auth/login error:",
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