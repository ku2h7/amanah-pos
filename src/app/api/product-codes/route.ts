import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('product_codes')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching product codes:', error);
    return NextResponse.json(
      { error: 'Gagal memuat kode produk' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    const { keyword, code_prefix, description } = await request.json();

    // Validate required fields
    if (!keyword || !code_prefix) {
      return NextResponse.json(
        { error: 'Keyword dan prefix kode harus diisi' },
        { status: 400 }
      );
    }

    // Check if keyword or code_prefix already exists
    const { data: existing } = await supabase
      .from('product_codes')
      .select('*')
      .or(`keyword.eq.${keyword},code_prefix.eq.${code_prefix}`)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Keyword atau prefix kode sudah ada' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('product_codes')
      .insert([{ keyword, code_prefix, description }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating product code:', error);
    return NextResponse.json(
      { error: 'Gagal menambahkan kode produk' },
      { status: 500 }
    );
  }
}
