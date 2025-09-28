"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format } from 'date-fns';
import { ReceiptTemplate, printReceipt } from "@/components/receipt/ReceiptTemplate";
import { getTransactionById } from "@/lib/api/transactions";

type TransactionItem = {
  id: string;
  product_id: number;
  products: {
    id: number;
    name: string;
    barcode: string | null;
    price: number;
    qty_per_box?: number;
  } | null;
  quantity: number;
  price: number;
  subtotal: number;
  price_per_unit: number;
  unit: string;
  qty_per_box?: number;
};

type Transaction = {
  id: string;
  created_at: string;
  customer_name: string;
  total_amount: number;
  change_amount: number;
  is_paid: boolean;
  notes: string | null;
  transaction_items: TransactionItem[];
};

export default function TransactionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const data = await getTransactionById(id as string);
        console.log('Fetched transaction data:', JSON.stringify(data, null, 2));
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
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Detail Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            {transaction.id} • {formattedDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <Button onClick={() => {
            if (receiptRef.current && transaction) {
              printReceipt(receiptRef.current);
            }
          }}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Pelanggan</p>
              <p>{transaction.customer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Kembalian</p>
              <p>Rp{transaction.change_amount.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={`font-medium ${
                transaction.is_paid ? 'text-green-600' : 'text-amber-600'
              }`}>
                {transaction.is_paid ? 'Lunas' : 'Belum Lunas'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Total</p>
              <p className="font-bold">Rp{transaction.total_amount.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Daftar Produk</h3>
            <div className="space-y-2">
              {transaction.transaction_items?.map((item) => (
                <div key={item.id} className="flex justify-between py-2 text-sm border-b last:border-0">
                  <div className="truncate max-w-[70%]">
                    <p className="font-medium truncate">{item.products?.name || 'Produk tidak ditemukan'}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.quantity} {item.unit} × Rp{item.price_per_unit?.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Rp{item.subtotal.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {transaction.notes && (
            <div className="mt-4 pt-3 border-t text-sm">
              <p className="font-medium text-muted-foreground">Catatan:</p>
              <p className="text-foreground">{transaction.notes}</p>
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

      {/* Hidden receipt for printing */}
      <div className="hidden">
        {transaction && (
          <div ref={receiptRef}>
            <ReceiptTemplate
              items={transaction.transaction_items.map(item => {
                const isBox = item.unit === 'box';
                const qtyPerBox = item.products?.qty_per_box || item.qty_per_box || 1;
                
                return {
                  product: {
                    id: item.product_id.toString(),
                    name: item.products?.name || 'Unknown Product',
                    retail_price: isBox ? (item.price_per_unit / qtyPerBox) : item.price_per_unit,
                    retail_box_price: isBox ? item.price_per_unit : (item.price_per_unit * qtyPerBox),
                    qty_per_box: qtyPerBox
                  },
                  quantity: item.quantity,
                  unit: item.unit || 'pcs',
                  price: isBox ? item.price_per_unit : (item.price_per_unit * (item.qty_per_box || 1)),
                  subtotal: item.subtotal
                };
              })}
              total={transaction.total_amount}
              amountPaid={transaction.total_amount + transaction.change_amount}
              change={transaction.change_amount}
              customerName={transaction.customer_name}
              transactionId={transaction.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
