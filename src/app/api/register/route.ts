import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phoneNumber } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Cek apakah user sudah ada di Auth
    const { data: existingUser } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terpakai" },
        { status: 409 }
      );
    }

    // 2. Buat user baru di Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { fullName },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Gagal membuat user" },
        { status: 400 }
      );
    }

    // 3. Generate ID dengan format ADM-XXX
    const { data: existingAdmins, error: countError } = await supabase
      .from("admin_users")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (countError) {
      return NextResponse.json(
        { error: "Gagal cek admin existing" },
        { status: 500 }
      );
    }

    // Generate ID berikutnya
    let nextId = 1;
    if (existingAdmins && existingAdmins.length > 0) {
      // Extract number dari ID terakhir (misal ADM-001 -> 1)
      const lastId = existingAdmins[0].id;
      if (typeof lastId === 'string' && lastId.startsWith('ADM-')) {
        const lastNumber = parseInt(lastId.replace('ADM-', ''));
        nextId = lastNumber + 1;
      } else if (typeof lastId === 'number') {
        nextId = lastId + 1;
      }
    }

    // Format ID dengan padding 3 digit
    const formattedId = `ADM-${nextId.toString().padStart(3, '0')}`;

    // 4. Insert ke admin_users
    interface AdminUser {
      id: string;
      auth_user_id: string;
      full_name: string;
      email: string;
      phone_number: string | null;
      created_at: string;
      updated_at: string;
    }

    const insertData: AdminUser = {
      id: formattedId,
      auth_user_id: data.user.id,
      full_name: fullName,
      email,
      phone_number: phoneNumber || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from("admin_users").insert([insertData]);

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal simpan ke admin_users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Register berhasil" }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
