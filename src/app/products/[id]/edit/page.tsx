'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  qty: number;
  karton_qty: number; // Jumlah karton
  qty_per_box: number;  // Jumlah pcs per karton
  cost_price: number;   // Harga per pcs
  box_price: number;    // Harga modal per karton
  retail_price: number;  // Harga jual per pcs
  retail_box_price: number; // Harga jual per karton
  wholesale_price: number;
  min_wholesale_qty: number | null;
  barcode: string | null;
  exp_date: string | null;
  is_editable: boolean;
  supplier_id: string | null;
};

type Supplier = {
  id: string;
  name: string;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (!response.ok) {
          throw new Error('Gagal memuat daftar supplier');
        }
        const data = await response.json();
        setSuppliers(data);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Gagal memuat daftar supplier');
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    qty: 0,
    karton_qty: 0,  // Jumlah karton
    qty_per_box: 1,   // Jumlah pcs per karton
    cost_price: 0,    // Harga per pcs
    box_price: 0,     // Harga modal per karton
    retail_price: 0,  // Harga jual per pcs
    retail_box_price: 0, // Harga jual per karton
    wholesale_price: 0,
    min_wholesale_qty: null,
    barcode: null,
    exp_date: null,
    is_editable: false,
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        const data = await response.json();
        setProduct(data);
        setFormData(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Gagal memuat data produk');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
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
    if (['karton_qty', 'qty_per_box', 'qty', 'min_wholesale_qty', 'box_price', 'cost_price', 'retail_price', 'retail_box_price', 'wholesale_price'].includes(name)) {
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
          
          const pricePerPcs = Math.round(cartonPrice / pcsCount);
          updatedData.cost_price = pricePerPcs;
        }
        
        return updatedData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memperbarui produk');
      }

      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui produk');
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) {
    return <div className="container mx-auto py-6">Memuat...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Produk</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    placeholder="Masukkan nama produk"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={formData.supplier_id || 'no-supplier'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      supplier_id: value === 'no-supplier' ? null : value
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-supplier">Tanpa Supplier</SelectItem>
                      {loadingSuppliers ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Memuat supplier...</div>
                      ) : (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={formData.barcode || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
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
                    className="w-full"
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
                  <Label htmlFor="qty" className="flex items-center gap-1">
                    Total Stok <span className="text-xs italic text-muted-foreground">(pcs)</span>
                  </Label>
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
                  <Label htmlFor="box_price" className="flex items-center gap-1">
                    Harga Modal <span className="text-xs italic text-muted-foreground">(per karton)</span>
                  </Label>
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
                        box_price: numValue,
                        cost_price: numValue / (prev.qty_per_box || 1)
                      }));
                    }}
                    placeholder="Harga modal per karton"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="flex items-center gap-1">
                    Harga Modal <span className="text-xs italic text-muted-foreground">(per pcs)</span>
                  </Label>
                  <div>
                    <Input
                      id="cost_price"
                      name="cost_price"
                      type="text"
                      value={formatNumber(Math.round(formData.cost_price || 0))}
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
                  <Label htmlFor="retail_box_price" className="flex items-center gap-1">
                    Harga Jual <span className="text-xs italic text-muted-foreground">(eceran per karton / rtg / slop)</span>
                  </Label>
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
                  {formData.box_price !== null && formData.box_price !== undefined && formData.box_price > 0 && (
                    <div className="text-[11px] text-emerald-500 font-normal mt-1 space-y-0.5">
                      <div>Harga +4%: {formatNumber(Math.round(formData.box_price * 1.04))}</div>
                      <div>Harga +5%: {formatNumber(Math.round(formData.box_price * 1.05))}</div>
                      <div>Khusus Rokok +3%: {formatNumber(Math.round(formData.box_price * 1.03))}</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wholesale_price" className="flex items-center gap-1">
                    Harga Jual <span className="text-xs italic text-muted-foreground">(grosir minimum qty)</span>
                  </Label>
                  <Input
                    id="wholesale_price"
                    name="wholesale_price"
                    type="text"
                    value={formatNumber(formData.wholesale_price || 0)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        wholesale_price: numValue
                      }));
                    }}
                    placeholder="Harga grosir minimum qty"
                    min="0"
                  />
                  {formData.cost_price !== null && formData.cost_price !== undefined && formData.cost_price > 0 && (
                    <div className="text-[11px] text-blue-500 font-normal mt-1 space-y-0.5">
                      <div>Harga +5%: {formatNumber(Math.round(formData.cost_price * 1.05))}</div>
                      <div>Harga +8%: {formatNumber(Math.round(formData.cost_price * 1.08))}</div>
                      <div>Khusus Rokok +3%: {formatNumber(Math.round(formData.cost_price * 1.03))}</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retail_price" className="flex items-center gap-1">
                    Harga Jual <span className="text-xs italic text-muted-foreground">(eceran per pcs)</span>
                  </Label>
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
                    required
                  />
                  {formData.cost_price !== null && formData.cost_price !== undefined && formData.cost_price > 0 && (
                    <div className="text-xs text-amber-600 font-medium mt-1 space-y-0.5">
                      <div>Harga +10%: {formatNumber(Math.round(formData.cost_price * 1.10))}</div>
                      <div>Harga +15%: {formatNumber(Math.round(formData.cost_price * 1.15))}</div>
                      <div>Khusus Rokok +5%: {formatNumber(Math.round(formData.cost_price * 1.05))}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox"
                  id="is_editable"
                  name="is_editable"
                  checked={formData.is_editable || false}
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
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
