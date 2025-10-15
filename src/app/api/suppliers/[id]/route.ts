import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// @ts-expect-error - Context type will be handled at runtime
export async function GET(request: Request, context) {
  const { id } = await context.params;

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// @ts-expect-error - Context type will be handled at runtime
export async function PUT(request: Request, context) {
  const { id } = await context.params;
  const body = await request.json();

  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// @ts-expect-error - Context type will be handled at runtime
export async function DELETE(request: Request, context) {
  const { id } = await context.params;

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Supplier deleted successfully' });
}
