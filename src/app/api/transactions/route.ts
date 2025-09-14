import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("Transaction API called");
    const { customer_name, items, amount_paid } = await req.json();
    console.log("Request data:", { customer_name, items, amount_paid });

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Items wajib diisi" },
        { status: 400 }
      );
    }

    // Test database connection first
    console.log("Testing database connection...");
    const { data: testData, error: testError } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error("Database connection error:", testError);
      return NextResponse.json(
        { error: "Database connection failed", details: testError.message },
        { status: 500 }
      );
    }
    
    console.log("Database connection OK, test data:", testData);

    // 1. Test transactions table
    console.log("Testing transactions table...");
    const { data: testTransactions, error: testTransactionsError } = await supabase
      .from("transactions")
      .select("id, transaction_number")
      .limit(1);
    
    if (testTransactionsError) {
      console.error("Transactions table error:", testTransactionsError);
      return NextResponse.json(
        { error: "Transactions table error", details: testTransactionsError.message },
        { status: 500 }
      );
    }
    
    console.log("Transactions table OK, test data:", testTransactions);

    // Generate transaction number
    const { data: lastTransaction } = await supabase
      .from("transactions")
      .select("transaction_number")
      .order("created_at", { ascending: false })
      .limit(1);

    let transactionNumber = "TRX-001";
    if (lastTransaction && lastTransaction.length > 0) {
      const lastNumber = lastTransaction[0].transaction_number;
      if (lastNumber && lastNumber.startsWith("TRX-")) {
        const number = parseInt(lastNumber.replace("TRX-", ""));
        transactionNumber = `TRX-${(number + 1).toString().padStart(3, "0")}`;
      }
    }

    // 2. Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 3. Get current user (cashier) - Simplified approach
    const authHeader = req.headers.get("authorization");
    console.log("Auth header:", authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token:", token.substring(0, 20) + "...");
    
    // Use service role to verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid token", details: authError?.message },
        { status: 401 }
      );
    }

    console.log("User authenticated:", user.email);

    // 4. Get cashier_id from admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      console.error("Admin user error:", adminError);
      return NextResponse.json(
        { error: "Admin user not found", details: adminError?.message },
        { status: 403 }
      );
    }

    console.log("Admin user found:", adminUser.id);

    // 5. Create transaction
    const transactionData = {
      transaction_number: transactionNumber,
      customer_name: customer_name || "Pelanggan",
      total_amount: totalAmount,
      amount_paid: amount_paid || 0,
      cashier_id: adminUser.id,
      is_paid: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Creating transaction with data:", transactionData);

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert([transactionData])
      .select()
      .single();

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      return NextResponse.json(
        { error: "Gagal membuat transaksi", details: transactionError.message },
        { status: 500 }
      );
    }

    // 6. Create transaction items
    const transactionItems = items.map((item: any) => ({
      transaction_id: transaction.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_per_unit: item.price,
      subtotal: item.price * item.quantity,
      unit: item.unit || 'pcs',
      qty_per_box: item.qty_per_box || 1,
      created_at: new Date().toISOString(),
    }));

    console.log("Creating transaction items:", transactionItems);

    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(transactionItems);

    if (itemsError) {
      console.error("Transaction items error:", itemsError);
      
      // Rollback transaction if items insert fails
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);
      
      return NextResponse.json(
        { error: "Gagal menyimpan detail transaksi", details: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Transaksi berhasil dibuat",
        transaction: {
          ...transaction,
          items: transactionItems
        }
      }, 
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Transaction API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error", details: err.stack },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(`
        *,
        admin_users!transactions_cashier_id_fkey (
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: "Gagal mengambil data transaksi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
