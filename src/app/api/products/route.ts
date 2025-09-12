import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const productData = await request.json()
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
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
        is_editable: productData.is_editable
      }])
      .select()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
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
