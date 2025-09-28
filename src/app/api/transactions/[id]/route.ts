import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID transaksi tidak valid' },
        { status: 400 }
      );
    }

    console.log('Fetching transaction with ID:', id);
    
    // First, get the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('id', id)  // Use ilike for case-insensitive comparison
      .single();

    if (transactionError) {
      console.error('Transaction fetch error:', transactionError);
      return NextResponse.json(
        { 
          error: 'Gagal mengambil data transaksi',
          details: transactionError.message 
        },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { 
          error: `Transaksi dengan ID ${id} tidak ditemukan`,
          id: id
        },
        { status: 404 }
      );
    }

    console.log('Fetching transaction items for transaction ID:', transaction.id);
    
    // Then get the transaction items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select(`
        *,
        products (
          id,
          name,
          retail_price,
          barcode
        )
      `)
      .eq('transaction_id', transaction.id)  // Use the ID from the transaction we found

    if (itemsError) {
      console.error('Transaction items fetch error:', itemsError);
      return NextResponse.json(
        { 
          error: 'Gagal mengambil detail transaksi',
          details: itemsError.message 
        },
        { status: 500 }
      );
    }

    console.log('Fetched transaction items:', JSON.stringify(items, null, 2));

    return NextResponse.json({
      ...transaction,
      transaction_items: items || []
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
