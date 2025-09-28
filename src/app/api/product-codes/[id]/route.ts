import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { error } = await supabase
      .from('product_codes')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting product code:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus kode produk' },
      { status: 500 }
    );
  }
}
