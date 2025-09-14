"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Database } from "@/lib/database.types";

// Define the shape of the product data from the database
interface Product {
  id: string;
  name: string;
  qty: number;
  cost_price: number;
  box_price: number;
  qty_per_box: number;
  retail_price: number;
  retail_box_price: number;
  wholesale_price: number;
  min_wholesale_qty: number;
  barcode: string | null;
  exp_date: string | null;
  is_editable: boolean;
  created_at: string;
}

// Define the shape of transaction items
interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: Product | null;
  created_at: string;
}

// Define the shape of a transaction
interface Transaction {
  id: string;
  created_at: string;
  updated_at: string | null;
  customer_name: string;
  total_amount: number;
  notes: string | null;
  items: TransactionItem[];
  cashier_id: string;  // ID kasir yang melakukan transaksi
  is_paid: boolean;    // Status pembayaran (lunas/belum)
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            id,
            created_at,
            updated_at,
            customer_name,
            total_amount,
            notes,
            cashier_id,
            is_paid,
            items:transaction_items(
              id,
              created_at,
              transaction_id,
              product_id,
              quantity,
              price,
              subtotal,
              product:products(
                id,
                created_at,
                name,
                qty,
                cost_price,
                box_price,
                qty_per_box,
                retail_price,
                retail_box_price,
                wholesale_price,
                min_wholesale_qty,
                barcode,
                exp_date,
                is_editable
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Transform the data to match our Transaction type
        const typedData: Transaction[] = (data as any[] || []).map(tx => ({
          ...tx,
          items: (tx.items || []).map((item: any) => ({
            ...item,
            product: item.product ? {
              id: item.product.id,
              name: item.product.name,
              qty: item.product.qty,
              cost_price: item.product.cost_price,
              box_price: item.product.box_price,
              qty_per_box: item.product.qty_per_box,
              retail_price: item.product.retail_price,
              retail_box_price: item.product.retail_box_price,
              wholesale_price: item.product.wholesale_price,
              min_wholesale_qty: item.product.min_wholesale_qty,
              barcode: item.product.barcode,
              exp_date: item.product.exp_date,
              is_editable: item.product.is_editable,
              created_at: item.product.created_at
            } : null
          }))
        }));
        
        setTransactions(typedData);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Gagal memuat data transaksi. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [supabase]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Daftar Transaksi</h1>
        <Link href="/transactions/new">
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Transaksi Baru
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border [&>div:not(:last-child)]:border-b">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Belum ada transaksi yang tercatat.
              </div>
            ) : (
              transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">
                    <Link href={`/transactions/${transaction.id}`} className="hover:underline">
                      Transaksi #{transaction.id.slice(0, 8)}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString('id-ID')} • 
                    {transaction.customer_name} • 
                    {transaction.items.reduce((total, item) => total + item.quantity, 0)} item
                  </p>
                  <div className="mt-2 space-y-1">
                    {transaction.items.map((item) => (
                      <div key={item.id} className="text-xs text-muted-foreground">
                        {item.quantity}x {item.product?.name || 'Produk tidak ditemukan'} @ Rp{item.price.toLocaleString('id-ID')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-x-2">
                  <span className="font-medium">
                    Rp{transaction.total_amount?.toLocaleString('id-ID') || '0'}
                    <span className={`text-xs block ${transaction.is_paid ? 'text-green-500' : 'text-amber-500'}`}>
                      {transaction.is_paid ? 'Lunas' : 'Belum Lunas'}
                    </span>
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/transactions/${transaction.id}`}>
                      Detail
                    </Link>
                  </Button>
                </div>
              </div>
            ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
