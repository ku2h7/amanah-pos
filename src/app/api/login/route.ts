import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // pakai service_role biar bisa cek table
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Login user
    const {
      data: { user },
      error: loginError,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !user) {
      return NextResponse.json(
        { error: loginError?.message || "Email atau password salah" },
        { status: 401 }
      );
    }

    // 2. Cek apakah ada di admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: "Hanya admin yang bisa login" },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: "Login berhasil", user });
  } catch (error) {
    console.error("Login API error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
