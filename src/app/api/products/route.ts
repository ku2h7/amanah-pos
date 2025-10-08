import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Gagal memuat daftar produk' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

async function generateProductId(prefix: string) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Find the latest product ID with this prefix
  const { data: latestProduct, error } = await supabase
    .from('products')
    .select('id')
    .ilike('id', `${prefix}-%`)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
    console.error('Error finding latest product ID:', error);
    return null;
  }

  let nextNumber = 1;
  if (latestProduct?.id) {
    // Extract the number part and increment it
    const match = latestProduct.id.match(/-0*(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros (e.g., 1 -> 001, 12 -> 012, 123 -> 123)
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}-${paddedNumber}`;
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Parse and validate request body
    let productData;
    try {
      productData = await request.json();
      if (!productData || typeof productData !== 'object') {
        throw new Error('Invalid request body');
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!productData.name || !productData.category_id) {
      return NextResponse.json(
        { 
          error: 'Nama produk dan kategori harus diisi',
          missingFields: {
            name: !productData.name,
            category_id: !productData.category_id
          },
          receivedData: productData // Debug: tampilkan data yang diterima
        },
        { status: 400 }
      );
    }
    
    // Pastikan category_id adalah number
    const categoryId = Number(productData.category_id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { 
          error: 'Format kategori tidak valid',
          receivedCategoryId: productData.category_id
        },
        { status: 400 }
      );
    }
    
    // Prepare data with type conversion and default values
    const roundedData = {
      ...productData,
      qty: Math.round(Number(productData.qty) || 0),
      cost_price: Math.round(Number(productData.cost_price) || 0),
      box_price: Math.round(Number(productData.box_price) || 0),
      qty_per_box: Math.round(Number(productData.qty_per_box) || 1),
      retail_price: Math.round(Number(productData.retail_price) || 0),
      retail_box_price: Math.round(Number(productData.retail_box_price) || 0),
      wholesale_price: Math.round(Number(productData.wholesale_price) || 0),
      reseller_price: Math.round(Number(productData.reseller_price) || 0),
      min_wholesale_qty: productData.min_wholesale_qty ? Math.round(Number(productData.min_wholesale_qty)) : null,
      is_editable: Boolean(productData.is_editable),
      supplier_id: productData.supplier_id || null,
      barcode: productData.barcode || null,
      exp_date: productData.exp_date || null
    };
    
    console.log('Processing product data:', JSON.stringify(roundedData, null, 2));
    
    // Get category code prefix
    console.log('Fetching category with ID:', productData.category_id);
    // Pastikan categoryId sudah di-convert ke number
    const { data: categoryData, error: categoryError } = await supabase
      .from('product_codes')
      .select('code_prefix')
      .eq('id', categoryId) // Gunakan categoryId yang sudah di-convert
      .single();

    if (categoryError || !categoryData) {
      console.error('Error getting category:', {
        error: categoryError,
        categoryId: productData.category_id,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          error: 'Kategori tidak valid atau tidak ditemukan',
          details: categoryError?.message || 'Tidak ada detail error',
          categoryId: productData.category_id
        },
        { status: 400 }
      );
    }

    console.log('Found category with prefix:', categoryData.code_prefix);
    
    // Generate product ID based on category code prefix
    const productId = await generateProductId(categoryData.code_prefix);
    if (!productId) {
      console.error('Failed to generate product ID');
      return NextResponse.json(
        { error: 'Gagal membuat ID produk' },
        { status: 500 }
      );
    }
    
    console.log('Generated product ID:', productId);
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        id: productId,
        name: roundedData.name,
        qty: roundedData.qty,
        cost_price: roundedData.cost_price,
        box_price: roundedData.box_price,
        qty_per_box: roundedData.qty_per_box,
        retail_price: roundedData.retail_price,
        retail_box_price: roundedData.retail_box_price,
        wholesale_price: roundedData.wholesale_price,
        reseller_price: roundedData.reseller_price,
        min_wholesale_qty: roundedData.min_wholesale_qty,
        barcode: roundedData.barcode,
        exp_date: roundedData.exp_date,
        is_editable: roundedData.is_editable,
        supplier_id: roundedData.supplier_id
      }])
      .select();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || 'Tidak ada detail tambahan',
          hint: error.hint || 'Tidak ada petunjuk'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan internal server',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
