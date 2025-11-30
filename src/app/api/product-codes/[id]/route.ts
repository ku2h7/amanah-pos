/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET by ID
export async function GET(request: Request, context: any) {
  const params = await context.params;
  const id = params?.id;
  try {
    const supabase = await createClient();

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
  } catch (error) {
    console.error('Error fetching product code:', error);
    return NextResponse.json(
      { error: 'Gagal memuat detail kode produk' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: any) {
  const params = await context.params;
  const id = params?.id;
  try {
    const supabase = await createClient();
    
    const { keyword, code_prefix, description } = await request.json();

    if (!keyword || !code_prefix) {
      return NextResponse.json(
        { error: 'Keyword dan prefix kode harus diisi' },
        { status: 400 }
      );
    }

    // First update the record
    const { error } = await supabase
      .from('product_codes')
      .update({ 
        keyword, 
        code_prefix, 
        description
      })
      .eq('id', Number(id));

    if (error) throw error;

    // Then fetch the updated record to return it
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('product_codes')
      .select('*')
      .eq('id', Number(id))
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(updatedProduct);

  } catch (error) {
    console.error('Error updating product code:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui kode produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: any) {
  const params = await context.params;
  const id = params?.id;
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('product_codes')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product code:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus kode produk' },
      { status: 500 }
    );
  }
}
