"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getTransactionById } from "@/lib/api/transactions";

type TransactionItem = {
  id: string;
  product_id: number; // Changed from string to number
  products: {
    id: number;
    name: string;
    barcode: string | null;
    price: number;
  } | null;
  quantity: number;
  price: number;
  subtotal: number;
};

type Transaction = {
  id: string;
  transaction_number: string;
  created_at: string;
  customer_name: string;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  transaction_items: TransactionItem[];
};

export default function TransactionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const data = await getTransactionById(id as string);
        setTransaction(data);
      } catch (err) {
        console.error('Error fetching transaction:', err);
        setError('Gagal memuat detail transaksi');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTransaction();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Memuat detail transaksi...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error || 'Transaksi tidak ditemukan'}</p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = format(new Date(transaction.created_at), 'EEEE, d MMMM yyyy HH:mm');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Detail Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            {transaction.transaction_number} • {formattedDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Pelanggan</h3>
              <p className="mt-1">{transaction.customer_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Metode Pembayaran</h3>
              <p className="mt-1 capitalize">{transaction.payment_method || 'Tunai'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p className={`mt-1 font-medium ${
                transaction.payment_status === 'completed' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {transaction.payment_status === 'completed' ? 'Lunas' : 'Belum Lunas'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
              <p className="mt-1 text-lg font-bold">
                Rp{transaction.total_amount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Daftar Produk</h3>
            <div className="space-y-4">
              {transaction.transaction_items.map((item) => (
                <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.products?.name || 'Produk tidak ditemukan'}</p>
                    {item.products?.barcode && (
                      <p className="text-sm text-muted-foreground">{item.products.barcode}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p>Rp{item.price.toLocaleString('id-ID')} × {item.quantity}</p>
                    <p className="font-medium">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {transaction.notes && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-2">Catatan</h3>
              <p className="text-muted-foreground">{transaction.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #__next,
          #__next > div,
          .container,
          .container > div,
          .card,
          .card > div {
            visibility: visible;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Print Footer - Only shows when printing */}
      <div className="hidden print:block mt-12 pt-4 border-t text-center text-sm text-muted-foreground">
        <p>Terima kasih telah berbelanja</p>
        <p className="mt-1">Barang yang sudah dibeli tidak dapat dikembalikan</p>
      </div>
    </div>
  );
}
