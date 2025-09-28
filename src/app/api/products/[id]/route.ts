import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
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
    
    const { data, error } = await supabase
      .from('products')
      .update({
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
        supplier_id: roundedData.supplier_id,
        is_editable: roundedData.is_editable,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
