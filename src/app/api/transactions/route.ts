import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { customer_name, items, amount_paid } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Items wajib diisi" },
        { status: 400 }
      );
    }

    // Test database connection first
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    // 1. Test transactions table
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: testTransactions, error: testTransactionsError } = await supabase
      .from("transactions")
      .select("id")
      .limit(1);
    
    if (testTransactionsError) {
      console.error("Transactions table error:", testTransactionsError);
      return NextResponse.json(
        { error: "Transactions table error", details: testTransactionsError.message },
        { status: 500 }
      );
    }
    
    // Define interfaces for better type safety
    interface CartItem {
      product_id: string;
      quantity: number;
      unit?: 'pcs' | 'box';
      qty_per_box?: number;
      price_per_unit: number;
      price: number;
    }

    interface Product {
      id: string;
      name: string;
      qty: number;
    }

    interface OutOfStockItem {
      product_id: string;
      name: string;
      available: number;
      required: number;
      unit: string;
    }

    // Check stock availability first
    const productIds = items.map((item: CartItem) => item.product_id);
    
    // Fetch products with proper error handling
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, qty')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Gagal memeriksa stok produk' },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const productMap = new Map<string, Product>();
    products?.forEach((p: Product) => productMap.set(p.id, p));
    
    // Validate stock for each item
    const outOfStockItems: OutOfStockItem[] = [];
    for (const item of items as CartItem[]) {
      const product = productMap.get(item.product_id);
      if (!product) continue;

      let requiredQty = item.quantity;
      if (item.unit === 'box') {
        requiredQty = item.quantity * (item.qty_per_box || 1);
      }

      if ((product.qty || 0) < requiredQty) {
        outOfStockItems.push({
          product_id: product.id,
          name: product.name,
          available: product.qty || 0,
          required: requiredQty,
          unit: item.unit === 'box' ? 'box' : 'pcs'
        });
      }
    }

    if (outOfStockItems.length > 0) {
      console.error('Insufficient stock for items:', outOfStockItems);
      return NextResponse.json(
        { 
          error: 'Stok tidak mencukupi',
          outOfStockItems,
          message: 'Beberapa produk stoknya tidak mencukupi'
        },
        { status: 400 }
      );
    }

    // Generate transaction number
    const { data: lastTransaction } = await supabase
      .from("transactions")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    // Get current date components for the transaction number
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    const datePrefix = `${month}${year}`;
    
    let sequenceNumber = 1;
    if (lastTransaction && lastTransaction.length > 0) {
      const lastNumber = lastTransaction[0].id;
      if (lastNumber && lastNumber.startsWith(`AMN-${datePrefix}-`)) {
        const lastSequence = parseInt(lastNumber.split('-')[2]);
        if (!isNaN(lastSequence)) {
          sequenceNumber = lastSequence + 1;
        }
      }
    }
    
    const transactionNumber = `AMN-${datePrefix}-${sequenceNumber.toString().padStart(3, '0')}`;

    // 2. Calculate total amount
    const totalAmount = (items as CartItem[]).reduce((sum: number, item: CartItem) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 3. Get current user (cashier) - Simplified approach
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Use service role to verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid token", details: authError?.message },
        { status: 401 }
      );
    }

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

    // 5. Create transaction
    const transactionData = {
      id: transactionNumber,
      customer_name: customer_name || "Pelanggan",
      total_amount: totalAmount,
      amount_paid: amount_paid || 0,
      cashier_id: adminUser.id,
      is_paid: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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

    // Reuse the CartItem interface defined above

    // 6. Create transaction items
    const transactionItems = (items as CartItem[]).map((item) => ({
      transaction_id: transaction.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_per_unit: item.price,
      subtotal: item.price * item.quantity,
      unit: item.unit || 'pcs',
      qty_per_box: item.qty_per_box ?? 1,
      created_at: new Date().toISOString(),
    }));

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

    // Update product quantities
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("qty")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        console.error(`Error fetching product ${item.product_id}:`, productError);
        continue; // Skip this product but continue with others
      }

      // Calculate quantity to deduct based on unit
      let quantityToDeduct = item.quantity;
      
      if (item.unit === 'box') {
        // If sold by box, multiply by qty_per_box
        const qtyPerBox = item.qty_per_box || 1;
        quantityToDeduct = item.quantity * qtyPerBox;
        console.log(`Deducting ${item.quantity} box(es) (${quantityToDeduct} pcs) for product ${item.product_id}`);
      } else {
        console.log(`Deducting ${quantityToDeduct} pcs for product ${item.product_id}`);
      }

      // Ensure we don't go below 0
      const currentQty = product.qty || 0;
      const newQty = Math.max(0, currentQty - quantityToDeduct);
      
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          qty: newQty,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.product_id);

      if (updateError) {
        console.error(`Error updating product ${item.product_id}:`, updateError);
      } else {
        console.log(`Updated product ${item.product_id} qty from ${currentQty} to ${newQty}`);
      }
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
  } catch (error) {
    console.error("Transaction API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: errorMessage, details: errorStack },
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
