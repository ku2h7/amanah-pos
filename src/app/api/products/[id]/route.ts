import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    const productData = await request.json();
    
    const { data, error } = await supabase
      .from('products')
      .update({
        name: productData.name,
        qty: productData.qty,
        cost_price: productData.cost_price,
        box_price: productData.box_price,
        qty_per_box: productData.qty_per_box,
        retail_price: productData.retail_price,
        retail_box_price: productData.retail_box_price,
        wholesale_price: productData.wholesale_price,
        min_wholesale_qty: productData.min_wholesale_qty,
        barcode: productData.barcode,
        exp_date: productData.exp_date,
        is_editable: productData.is_editable,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id);

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
