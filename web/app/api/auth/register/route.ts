import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let body: {
      email?: string;
      password?: string;
      business_name?: string;
      business_type?: string;
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
    const businessName = body.business_name?.trim();
    const businessType = body.business_type?.trim();

    if (!email || !password || !businessName) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, password, dan nama bisnis wajib diisi",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password minimal 6 karakter",
        },
        { status: 400 },
      );
    }

    const {
      data,
      error: signUpError,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      console.error("Failed to register user:", signUpError);

      return NextResponse.json(
        {
          success: false,
          message:
            signUpError?.message ??
            "Gagal membuat akun pengguna",
        },
        { status: 400 },
      );
    }

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .insert({
          owner_user_id: data.user.id,
          name: businessName,
          business_type: businessType || null,
          currency: "IDR",
        })
        .select("*")
        .single();

    if (businessError) {
      console.error(
        "Failed to create business:",
        businessError,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Akun berhasil dibuat, tetapi bisnis gagal dibuat",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registrasi berhasil",
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          business,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Unexpected POST /api/auth/register error:",
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