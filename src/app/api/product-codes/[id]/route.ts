// src/app/api/product-codes/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET by ID
// @ts-expect-error - Context type will be handled at runtime
export async function GET(request: Request, context) {
  const { id } = context.params;
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('product_codes')
      .select('*')
      .eq('id', Number(id))
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Kode produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching product code:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil kode produk' },
      { status: 500 }
    );
  }
}

// DELETE by ID
// @ts-expect-error - Context type will be handled at runtime
export async function DELETE(request: Request, context) {
  const { id } = context.params;
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase
      .from('product_codes')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Error deleting product code:', err);
    return NextResponse.json(
      { error: 'Gagal menghapus kode produk' },
      { status: 500 }
    );
  }
}
