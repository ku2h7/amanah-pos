'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Product = {
  id: string;
  name: string;
  qty: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number | null;
  min_wholesale_qty: number | null;
  barcode: string | null;
  exp_date: string | null;
  created_at: string;
  updated_at: string;
  is_editable: boolean;
};

export default function AddStockPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [cartons, setCartons] = useState<number>(0);
  const [piecesPerCarton, setPiecesPerCarton] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Calculate total pieces from cartons and pieces
  const totalPieces = (cartons * piecesPerCarton) || 0;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('Gagal memuat data produk');
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Gagal memuat data produk');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalPieces <= 0) {
      toast.error('Total stok yang akan ditambahkan harus lebih dari 0');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          qty: (product?.qty || 0) + totalPieces,
        }),
      });

      if (!response.ok) throw new Error('Gagal menambahkan stok');

      const updatedProduct = await response.json();
      setProduct(updatedProduct);
      setCartons(0);
      setPiecesPerCarton(0);
      
      toast.success('Stok berhasil ditambahkan');
      router.push('/products');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal menambahkan stok');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Memuat data produk...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Produk tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/products" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Produk
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Tambah Stok Produk</CardTitle>
          <CardDescription>
            Menambahkan stok untuk produk: <span className="font-semibold">{product.name}</span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2 mb-4">
              <Label>Stok Saat Ini</Label>
              <Input
                type="text"
                value={`${product.qty} pcs`}
                disabled
                className="bg-gray-100 font-medium"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="cartons">Jumlah Karton</Label>
                <Input
                  id="cartons"
                  type="number"
                  min="0"
                  value={cartons || ''}
                  onChange={(e) => setCartons(Number(e.target.value) || 0)}
                  placeholder="Jumlah karton"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="piecesPerCarton">Isi per Karton (pcs)</Label>
                <Input
                  id="piecesPerCarton"
                  type="number"
                  min="0"
                  value={piecesPerCarton || ''}
                  onChange={(e) => setPiecesPerCarton(Number(e.target.value) || 0)}
                  placeholder="Jumlah pcs per karton"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md space-y-2 mb-6">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Rincian:</span>
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {cartons || 0} karton × {piecesPerCarton || 0} pcs = {totalPieces} pcs</li>
                <li>• Stok saat ini: {product.qty} pcs</li>
                <li className="font-bold">• Total stok akan menjadi: {product.qty + totalPieces} pcs</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/products')}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Stok
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
