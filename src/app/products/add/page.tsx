'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormData = {
  name: string;
  qty: number;
  karton_qty: number;
  qty_per_box: number;
  cost_price: number;
  box_price: number;
  retail_price: number;
  retail_box_price: number;
  wholesale_price: number;
  min_wholesale_qty: number | null;
  barcode: string | null;
  exp_date: string | null;
  is_editable: boolean;
};

export default function AddProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    qty: 0,
    karton_qty: 0, // Jumlah karton
    qty_per_box: 1,  // Jumlah pcs per karton
    cost_price: 0,   // Harga per pcs
    box_price: 0,    // Harga modal per karton
    retail_price: 0,  // Harga jual per pcs
    retail_box_price: 0, // Harga jual per karton
    wholesale_price: 0,
    min_wholesale_qty: null,
    barcode: null,
    exp_date: null,
    is_editable: false,
  });
  const [costPricePerPcs, setCostPricePerPcs] = useState<number>(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle khusus untuk input stok
    if (name === 'stock') {
      const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
      return;
    }
    
    if (type === 'number') {
      // Handle input number dengan format ribuan
      const numValue = parseNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const formatNumber = (num: number | string | null | undefined): string => {
    if (num === '' || num === null || num === undefined) return '';
    const numStr = num.toString().replace(/\D/g, '');
    return numStr === '' ? '' : parseInt(numStr, 10).toLocaleString('id-ID');
  };

  const parseNumber = (str: string): number => {
    return str === '' ? 0 : parseInt(str.replace(/\./g, ''), 10) || 0;
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For numeric inputs, parse the value as integer
    if (['karton_qty', 'qty_per_box', 'qty', 'min_wholesale_qty', 'box_price', 'cost_price'].includes(name)) {
      const numValue = value === '' ? 0 : parseNumber(value);
      
      setFormData(prev => {
        const updatedData = { ...prev, [name]: numValue };
        
        // Update qty when karton_qty or qty_per_box changes
        if (name === 'karton_qty' || name === 'qty_per_box') {
          const boxQty = name === 'karton_qty' ? numValue : prev.karton_qty || 0;
          const pcsPerBox = name === 'qty_per_box' ? numValue : prev.qty_per_box || 1;
          updatedData.qty = boxQty * pcsPerBox;
        }
        
        // Update karton_qty when qty is changed directly
        if (name === 'qty') {
          const pcsPerBox = Math.max(1, prev.qty_per_box || 1);
          updatedData.karton_qty = Math.floor(numValue / pcsPerBox);
        }
        
        // Update cost price when box_price or qty_per_box changes
        if (name === 'box_price' || name === 'qty_per_box') {
          const cartonPrice = name === 'box_price' ? numValue : prev.box_price || 0;
          const pcsCount = name === 'qty_per_box' ? Math.max(1, numValue) : Math.max(1, prev.qty_per_box || 1);
          
          const pricePerPcs = cartonPrice / pcsCount;
          setCostPricePerPcs(pricePerPcs);
          updatedData.cost_price = pricePerPcs;
        }
        
        return updatedData;
      });
    } else {
      // For price fields, keep the existing logic
      const numValue = parseNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a copy of formData and remove karton_qty as it's only for calculation
      const { karton_qty, ...dataToSave } = formData;
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dataToSave,
          // Convert empty strings to null for optional fields
          barcode: formData.barcode || null,
          exp_date: formData.exp_date || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyimpan produk');
      }

      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan produk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Add New Product</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Produk</CardTitle>
          <CardDescription>Tambahkan produk baru ke dalam etalase Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input 
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Masukkan nama produk" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input 
                    id="barcode"
                    name="barcode"
                    value={formData.barcode || ''}
                    onChange={handleChange}
                    placeholder="Kode barcode" 
                  />
                </div>                
                <div className="space-y-2">
                  <Label htmlFor="exp_date">Tanggal Kadaluarsa</Label>
                  <Input 
                    id="exp_date"
                    name="exp_date"
                    type="date"
                    value={formData.exp_date || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="karton_qty">Jumlah Karton</Label>
                  <Input
                    id="karton_qty"
                    name="karton_qty"
                    type="number"
                    value={formData.karton_qty || ''}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
                      setFormData(prev => ({
                        ...prev,
                        karton_qty: numValue,
                        qty: numValue * (prev.qty_per_box || 1)
                      }));
                    }}
                    placeholder="Jumlah karton"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty_per_box">Pcs per Karton</Label>
                  <Input
                    id="qty_per_box"
                    name="qty_per_box"
                    type="number"
                    value={formData.qty_per_box || ''}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 1 : Math.max(1, parseInt(value, 10) || 1);
                      setFormData(prev => ({
                        ...prev,
                        qty_per_box: numValue,
                        qty: numValue * (prev.karton_qty || 0)
                      }));
                    }}
                    placeholder="Pcs per karton"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Total Stok (pcs)</Label>
                  <Input
                    id="qty"
                    name="qty"
                    type="number"
                    value={formData.qty}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : parseInt(value, 10) || 0;
                      setFormData(prev => ({
                        ...prev,
                        karton_qty: Math.floor(numValue / (prev.qty_per_box || 1)),
                        qty: numValue
                      }));
                    }}
                    placeholder="Total stok"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="box_price">Harga Modal (per karton)</Label>
                  <Input
                    id="box_price"
                    name="box_price"
                    type="text"
                    value={formatNumber(formData.box_price)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        box_price: numValue
                      }));
                    }}
                    placeholder="Harga modal per karton"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Harga Modal (per pcs)</Label>
                  <div>
                    <Input
                      id="cost_price"
                      name="cost_price"
                      type="text"
                      value={formatNumber(formData.cost_price)}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="Otomatis dari harga karton / pcs"
                      required
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      Dihitung otomatis dari Harga per karton / Jumlah pcs
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_wholesale_qty">Minimal Qty Grosir</Label>
                  <Input
                    id="min_wholesale_qty"
                    name="min_wholesale_qty"
                    type="number"
                    value={formData.min_wholesale_qty || ''}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? null : parseInt(value, 10) || 0;
                      setFormData(prev => ({
                        ...prev,
                        min_wholesale_qty: numValue
                      }));
                    }}
                    placeholder="Minimal jumlah grosir"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retail_box_price">Harga Jual (eceran per karton)</Label>
                  <Input
                    id="retail_box_price"
                    name="retail_box_price"
                    type="text"
                    value={formatNumber(formData.retail_box_price)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        retail_box_price: numValue
                      }));
                    }}
                    placeholder="Harga jual eceran per karton"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wholesale_price">Harga Jual (grosir minimum qty)</Label>
                  <Input
                    id="wholesale_price"
                    name="wholesale_price"
                    type="text"
                    value={formatNumber(formData.wholesale_price)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        wholesale_price: numValue
                      }));
                    }}
                    placeholder="Harga grosir"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retail_price">Harga Jual (eceran per pcs)</Label>
                  <Input
                    id="retail_price"
                    name="retail_price"
                    type="text"
                    value={formatNumber(formData.retail_price)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        retail_price: numValue
                      }));
                    }}
                    placeholder="Harga jual eceran per pcs"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox"
                  id="is_editable"
                  name="is_editable"
                  checked={formData.is_editable}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_editable" className="text-sm font-medium text-gray-700">
                  Dapat diedit
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/products">Batal</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Simpan Produk'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
