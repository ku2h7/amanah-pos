"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Database } from "@/lib/database.types";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Define the shape of transaction items
interface TransactionItem {
  id: string;
  created_at?: string;  // Optional because it might not be included in the API response
  transaction_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
  unit: 'pcs' | 'box';
  qty_per_box?: number;
  products?: {
    id: string;
    name: string;
    barcode: string | null;
  } | null;
}

// Define the shape of a transaction
interface Transaction {
  id: string;  // This is the transaction number (e.g., 'AMN-0124-001')
  created_at: string;
  updated_at: string | null;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  is_paid: boolean;
  notes: string | null;
  cashier_id: string;
  admin_users?: {
    full_name: string;
  };
  transaction_items: TransactionItem[];
}

interface ExpandedTransactions {
  [key: string]: boolean;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<ExpandedTransactions>({});
  const supabase = createClientComponentClient<Database>();

  const toggleTransactionItems = (transactionId: string) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check auth session
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth session error:', sessionError);
          throw new Error(`Gagal memeriksa sesi: ${sessionError.message}`);
        }
        
        // Fetch transactions with their items and product details in a single query
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            *,
            transaction_items(
              *,
              products(
                id,
                name,
                barcode
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (transactionsError) {
          console.error('Transactions query error:', transactionsError);
          throw transactionsError;
        }
        
        if (!transactionsData) {
          console.log('No transactions data received');
          setTransactions([]);
          return;
        }

        // Define the shape of transaction item from API
        interface TransactionItemFromAPI {
          id: string;
          transaction_id?: string; // Optional because it might be in the parent object
          product_id: string;
          quantity: number;
          price_per_unit: number;
          subtotal: number;
          unit: 'pcs' | 'box';
          qty_per_box?: number;
          created_at?: string; // Optional because it might not be included in the API response
          products: {
            id: string;
            name: string;
            barcode: string | null;
          } | null;
        }

        // Define the shape of transaction from API
        interface TransactionFromAPI {
          id: string;
          created_at: string;
          updated_at: string | null;
          customer_name: string;
          total_amount: number;
          amount_paid: number;
          change_amount: number;
          is_paid: boolean;
          notes: string | null;
          cashier_id: string;
          admin_users?: {
            full_name: string;
          };
          transaction_items: TransactionItemFromAPI[];
        }

        // Process the transactions data
        const processedTransactions: Transaction[] = (transactionsData as TransactionFromAPI[]).map(transaction => {
          // Ensure transaction_items is always an array
          const items = Array.isArray(transaction.transaction_items) 
            ? transaction.transaction_items 
            : [];

          return {
            ...transaction,
            transaction_items: items.map(item => ({
              id: item.id,
              transaction_id: item.transaction_id || transaction.id, // Use parent transaction id if not available
              product_id: item.product_id,
              quantity: item.quantity,
              price_per_unit: item.price_per_unit,
              subtotal: item.subtotal,
              unit: item.unit || 'pcs',
              qty_per_box: item.qty_per_box ?? 1,
              created_at: item.created_at || new Date().toISOString(),
              products: item.products ? {
                id: item.products.id,
                name: item.products.name,
                barcode: item.products.barcode
              } : null
            }))
          };
        });
        
        setTransactions(processedTransactions);
        setFilteredTransactions(processedTransactions);
      } catch (error) {
        // Define a more specific error type that includes Supabase error properties
        type SupabaseError = Error & { 
          code?: string; 
          details?: string;
          hint?: string;
          status?: number;
        };
        
        const err = error as SupabaseError;
        
        // Log error details safely
        console.error('Error in fetchTransactions:', {
          error: err,
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
          status: err.status
        });
        
        // Set appropriate error message
        let errorMessage = 'Terjadi kesalahan yang tidak diketahui';
        
        if (err.message) {
          errorMessage = err.message;
        } else if (err.details) {
          errorMessage = err.details;
        } else if (err?.hint) {
          errorMessage = err.hint;
        }
        
        setError(`Gagal memuat data transaksi: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filter transactions based on search term
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const results = transactions.filter(transaction => 
      transaction.transaction_items.some(item => 
        item.products?.name.toLowerCase().includes(term.toLowerCase()) ||
        item.products?.barcode?.toLowerCase().includes(term.toLowerCase())
      )
    );
    setFilteredTransactions(results);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Daftar Transaksi</h1>
          <Button asChild>
            <Link href="/transactions/new">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Transaksi Baru
            </Link>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari produk (contoh: Le Mineral)"
            className="pl-10 w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada transaksi</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Mulai dengan membuat transaksi baru
            </p>
            <Button asChild>
              <Link href="/transactions/new">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Transaksi Baru
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Tanggal</th>
                    <th className="text-left p-4">No. Transaksi</th>
                    <th className="text-left p-4">Pelanggan</th>
                    <th className="text-left p-4">Produk</th>
                    <th className="text-right p-4">Total</th>
                    <th className="text-right p-4">Kembalian</th>
                    <th className="text-right p-4">Status</th>
                    <th className="text-right p-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const itemCount = transaction.transaction_items?.reduce(
                      (total, item) => total + item.quantity, 0
                    ) || 0;
                    
                    return (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: id })}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            <Link
                              href={`/transactions/${transaction.id}`}
                              className="text-primary hover:underline"
                            >
                              {transaction.id}
                            </Link>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="p-4">{transaction.customer_name || '-'}</td>
                        <td className="p-4 max-w-xs">
                          <div className="space-y-1">
                            {transaction.transaction_items.slice(0, expandedTransactions[transaction.id] ? transaction.transaction_items.length : 2).map((item, idx) => {
                              const productName = item.products?.name || 'Produk tidak ditemukan';
                              const isMatch = searchTerm && 
                                (productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.products?.barcode?.toLowerCase().includes(searchTerm.toLowerCase()));
                              
                              return (
                                <div key={idx} className={`text-sm ${isMatch ? 'bg-blue-200 text-gray-900 px-2 py-1 rounded' : ''}`}>
                                  {item.quantity}x {productName}
                                  {isMatch && (
                                    <span className="ml-2 text-xs bg-blue-300 text-gray-900 px-1.5 py-0.5 rounded-full">
                                      Cocok!
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {transaction.transaction_items.length > 2 && (
                              <button
                                onClick={() => toggleTransactionItems(transaction.id)}
                                className="text-xs text-blue-600 hover:underline mt-1"
                              >
                                {expandedTransactions[transaction.id] ? 'Lihat lebih sedikit' : `Lihat ${transaction.transaction_items.length - 2} produk lainnya`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(transaction.total_amount)}
                        </td>
                        <td className="p-4 text-right">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(transaction.change_amount)}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.is_paid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.is_paid ? 'Lunas' : 'Belum Lunas'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/transactions/${transaction.id}`}>
                              Detail
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
