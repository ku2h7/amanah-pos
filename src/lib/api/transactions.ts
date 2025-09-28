import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

const supabase = createClientComponentClient<Database>();

export interface TransactionItemPayload {
  product_id: string | number;   // Changed from number to string to match UUID
  quantity: number;
  price: number;
  unit: string;
  qty_per_box: number;
}

export interface CreateTransactionPayload {
  customer_name: string;
  amount_paid: number;
  items: TransactionItemPayload[];
  cashier_id?: string;
  cashier_name?: string;
}

export const createTransaction = async (payload: CreateTransactionPayload) => {
  const supabase = createClientComponentClient<Database>();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session found');
  }

  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create transaction');
  }

  return response.json();
};

export const getTransactions = async (params?: {
  limit?: number;
  offset?: number;
}) => {
  const { limit = 10, offset = 0 } = params || {};
  const url = new URL('/api/transactions', window.location.origin);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('offset', offset.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch transactions');
  }

  return response.json();
};

export const getTransactionById = async (id: string) => {
  try {
    const response = await fetch(`/api/transactions/${id}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Transaction API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: data
      });
      
      throw new Error(
        data.error || 
        data.message || 
        `Gagal mengambil detail transaksi (${response.status} ${response.statusText})`
      );
    }

    return data;
  } catch (error) {
    console.error('Error in getTransactionById:', error);
    throw new Error(error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data transaksi');
  }
};
