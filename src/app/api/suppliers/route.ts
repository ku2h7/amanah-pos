import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function generateSupplierCode() {
  // Ambil ID terakhir dari database
  const { data: lastSupplier } = await supabase
    .from('suppliers')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  // Generate nomor urut berikutnya
  let nextNumber = 1;
  if (lastSupplier) {
    // Jika ada data sebelumnya, ambil angka terakhir dan tambahkan 1
    const lastNumber = parseInt(lastSupplier.id.toString().split('-')[1]) || 0;
    nextNumber = lastNumber + 1;
  }

  // Format menjadi 3 digit dengan leading zero
  return `SUP-${nextNumber.toString().padStart(3, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Generate kode supplier
    const supplierCode = await generateSupplierCode();
    
    const { data, error } = await supabase
      .from('suppliers')
      .insert([
        {
          id: supplierCode,
          name: body.name,
          phone: body.phone,
          email: body.email,
          address: body.address,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menambahkan supplier' }, 
      { status: 500 }
    );
  }
}
