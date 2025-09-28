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

async function findMatchingProductCode(productName: string) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  // Get all product codes
  const { data: codes, error: codesError } = await supabase
    .from('product_codes')
    .select('*');

  if (codesError) {
    console.error('Error fetching product codes:', codesError);
    return null;
  }

  // Find the first code where the product name contains the keyword (case insensitive)
  const matchedCode = codes.find(code => 
    productName.toLowerCase().includes(code.keyword.toLowerCase())
  );

  return matchedCode || null;
}

async function generateProductId(prefix: string) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const productData = await request.json();
    
    // Round numeric values to ensure they are integers
    const roundedData = {
      ...productData,
      qty: Math.round(Number(productData.qty) || 0),
      cost_price: Math.round(Number(productData.cost_price) || 0),
      box_price: Math.round(Number(productData.box_price) || 0),
      qty_per_box: Math.round(Number(productData.qty_per_box) || 1),
      retail_price: Math.round(Number(productData.retail_price) || 0),
      retail_box_price: Math.round(Number(productData.retail_box_price) || 0),
      wholesale_price: Math.round(Number(productData.wholesale_price) || 0),
      min_wholesale_qty: productData.min_wholesale_qty ? Math.round(Number(productData.min_wholesale_qty)) : null,
    };
    
    // Find matching product code
    const productCode = await findMatchingProductCode(roundedData.name);
    
    let productId;
    if (productCode) {
      // Generate ID based on product code
      productId = await generateProductId(productCode.code_prefix);
      if (!productId) {
        throw new Error('Gagal membuat ID produk');
      }
    } else {
      // Fallback to UUID if no matching code found
      productId = crypto.randomUUID();
    }
    
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
        min_wholesale_qty: roundedData.min_wholesale_qty,
        barcode: roundedData.barcode,
        exp_date: roundedData.exp_date,
        is_editable: roundedData.is_editable,
        supplier_id: roundedData.supplier_id
      }])
      .select()

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
