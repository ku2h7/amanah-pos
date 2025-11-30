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
import { ArrowLeft} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type FormData = {
  name: string;
  category: string;
  qty: number;
  karton_qty: number;
  qty_per_box: number;
  cost_price: number;
  box_price: number;
  retail_price: number;
  retail_box_price: number;
  reseller_price: number;
  wholesale_price: number;
  min_wholesale_qty: number | null;
  barcode: string | null;
  exp_date: string | null;
  units: string;
  is_editable: boolean;
  supplier_id: string | null;
  product_code?: string; // Will be auto-generated
};

export default function AddProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    qty: 0,
    karton_qty: 0, // Jumlah karton
    qty_per_box: 1,  // Jumlah pcs per karton
    cost_price: 0,   // Harga per pcs
    box_price: 0,    // Harga modal per karton
    retail_price: 0,  // Harga jual per pcs
    retail_box_price: 0, // Harga jual per karton
    reseller_price: 0, // Harga jual reseller
    wholesale_price: 0,
    min_wholesale_qty: null,
    barcode: null,
    exp_date: null,
    units: 'pcs',
    is_editable: false,
    supplier_id: null,
  });

  const [suppliers, setSuppliers] = useState<Array<{id: string, name: string}>>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [categories, setCategories] = useState<Array<{id: number, keyword: string, code_prefix: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Helper function to get unit display name
  const getUnitDisplayName = (unit: string) => {
    switch (unit) {
      case 'rtg': return 'Renteng';
      case 'bal': return 'Bal';
      case 'karton': return 'Karton';
      case 'karung': return 'Karung';
      case 'ikat': return 'Ikat';
      case 'slop': return 'Slop';
      case 'kotak': return 'Kotak';
      case 'tray': return 'Tray';
      case 'strip': return 'Strip';
      case 'pcs': return 'Pcs';
      default: return 'Pcs';
    }
  };

  // Fetch suppliers and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch suppliers
        const [suppliersRes, categoriesRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/product-codes')
        ]);

        if (!suppliersRes.ok) throw new Error('Gagal memuat daftar supplier');
        if (!categoriesRes.ok) throw new Error('Gagal memuat daftar kategori');

        const [suppliersData, categoriesData] = await Promise.all([
          suppliersRes.json(),
          categoriesRes.json()
        ]);

        // Urutkan kategori berdasarkan keyword (A-Z)
        const sortedCategories = [...categoriesData].sort((a, b) => 
          a.keyword.localeCompare(b.keyword, 'id', {sensitivity: 'base'})
        );

        setSuppliers(suppliersData);
        setCategories(sortedCategories);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal memuat data yang diperlukan');
      } finally {
        setLoadingSuppliers(false);
        setLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  // Generate product code based on selected category
  const generateProductCode = (categoryId: string) => {
    const category = categories.find(cat => cat.id.toString() === categoryId);
    if (!category) {
      console.error('Kategori tidak ditemukan');
      return 'PRD-000';
    }
    
    // Format: CODE_PREFIX-XXX (3 digit random)
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${category.code_prefix}-${randomNum}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number' || ['karton_qty', 'qty_per_box', 'qty', 'min_wholesale_qty', 
        'box_price', 'cost_price', 'retail_price', 'retail_box_price', 
        'wholesale_price', 'reseller_price'].includes(name)) {
      const numValue = value === '' ? 0 : parseNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
      return;
    }
    
    // Handle text inputs
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (['karton_qty', 'qty_per_box', 'qty', 'min_wholesale_qty', 'box_price', 'cost_price', 'retail_price', 'retail_box_price', 'wholesale_price', 'reseller_price'].includes(name)) {
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
        
        // Update cost price when box_price or qty_per_box changes (only if units is not 'pcs')
        if ((name === 'box_price' || name === 'qty_per_box') && prev.units !== 'pcs') {
          const cartonPrice = name === 'box_price' ? numValue : prev.box_price || 0;
          const pcsCount = name === 'qty_per_box' ? Math.max(1, numValue) : Math.max(1, prev.qty_per_box || 1);
          
          // Calculate price per piece and round to nearest integer
          const pricePerPcs = Math.round(cartonPrice / pcsCount);
          updatedData.cost_price = pricePerPcs;
        }
        
        return updatedData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent, addNewAfterSave = false) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Nama produk harus diisi');
      return;
    }
    
    if (!formData.category) {
      toast.error('Kategori produk harus dipilih');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate product code based on selected category
      const productCode = generateProductCode(formData.category);
      
      // Create a copy of formData and remove karton_qty as it's only for calculation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { karton_qty, ...dataToSave } = formData;
      
      // Prepare data for submission
      const submissionData = {
        ...dataToSave,
        category: Number(formData.category), // Convert to number for API
        product_code: productCode,
        // Convert empty strings to null for optional fields
        barcode: formData.barcode || null,
        exp_date: formData.exp_date || null,
        supplier_id: formData.supplier_id || null,
        min_wholesale_qty: formData.min_wholesale_qty || null
      };
      
      console.log('Submitting data:', submissionData); // Debug log
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyimpan produk');
      }
      
      const result = await response.json();
      
      // Reset form after successful submission
      setFormData({
        name: '',
        category: '',
        qty: 0,
        karton_qty: 0,
        qty_per_box: 1,
        cost_price: 0,
        box_price: 0,
        retail_price: 0,
        retail_box_price: 0,
        reseller_price: 0,
        wholesale_price: 0,
        min_wholesale_qty: null,
        barcode: null,
        exp_date: null,
        units: 'pcs',
        is_editable: false,
        supplier_id: null,
      });
      
      if (addNewAfterSave) {
        // Reset form for new entry
        setFormData({
          name: '',
          category: '',
          qty: 0,
          karton_qty: 0,
          qty_per_box: 1,
          cost_price: 0,
          box_price: 0,
          retail_price: 0,
          retail_box_price: 0,
          reseller_price: 0,
          wholesale_price: 0,
          min_wholesale_qty: null,
          barcode: null,
          exp_date: null,
          units: 'pcs',
          is_editable: false,
          supplier_id: null,
        });
        // Focus on the first input field
        const firstInput = document.querySelector('input');
        firstInput?.focus();
        toast.success(`Produk "${result.name || 'baru'}" berhasil disimpan. Silakan tambah produk baru.`);
      } else {
        // Redirect to products list
        router.push('/products');
        router.refresh();
        toast.success(`Produk "${result.name || 'baru'}" berhasil ditambahkan`);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan produk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/products" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Produk
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk Baru</h1>
        <p className="text-muted-foreground">Tambah produk baru ke dalam sistem</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
                  <Label htmlFor="category">Kategori <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      console.log('Category selected:', value);
                      setFormData(prev => ({
                        ...prev,
                        category: value
                      }));
                    }}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={
                        loadingCategories ? 'Memuat kategori...' : 'Pilih kategori'
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {categories.map((category) => (
                        <SelectItem 
                          key={category.id} 
                          value={category.id.toString()}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{category.keyword}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({category.code_prefix})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.category && (
                    <p className="text-sm text-red-500 mt-1">Kategori harus dipilih</p>
                  )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        // Optionally, you can add logic here to handle the barcode scan
                        // For example, you could move focus to another field
                        const nextInput = e.currentTarget.form?.elements.namedItem('exp_date') as HTMLElement;
                        nextInput?.focus();
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
                <div className="space-y-2">
                  <Label htmlFor="units">Satuan</Label>
                  <Select
                    value={formData.units}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      units: value
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pcs</SelectItem>
                      <SelectItem value="rtg">Renteng (rtg)</SelectItem>
                      <SelectItem value="bal">Bal</SelectItem>
                      <SelectItem value="karton">Karton</SelectItem>
                      <SelectItem value="karung">Karung</SelectItem>
                      <SelectItem value="kotak">Kotak</SelectItem>
                      <SelectItem value="ikat">Ikat</SelectItem>
                      <SelectItem value="slop">Slop</SelectItem>
                      <SelectItem value="tray">Tray</SelectItem>
                      <SelectItem value="strip">Strip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className={`grid gap-4 ${formData.units === 'pcs' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {formData.units !== 'pcs' && (
                  <div className="space-y-2">
                    <Label htmlFor="karton_qty">Jumlah {getUnitDisplayName(formData.units)}</Label>
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
                      placeholder={`Jumlah ${getUnitDisplayName(formData.units).toLowerCase()}`}
                      min="0"
                    />
                  </div>
                )}
                {formData.units !== 'pcs' && (
                  <div className="space-y-2">
                    <Label htmlFor="qty_per_box">Pcs per {getUnitDisplayName(formData.units)}</Label>
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
                      placeholder={`Pcs per ${getUnitDisplayName(formData.units).toLowerCase()}`}
                      min="1"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="qty" className="flex items-center gap-1">
                    Total Stok <span className="text-xs italic text-muted-foreground">(pcs)</span>
                  </Label>
                  <Input
                    id="qty"
                    name="qty"
                    type="text"
                    value={formatNumber(formData.qty)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        karton_qty: Math.floor(numValue / (prev.qty_per_box || 1)),
                        qty: numValue
                      }));
                    }}
                    placeholder="Total stok"
                    required
                  />
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${formData.units === 'pcs' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                {formData.units !== 'pcs' && (
                  <div className="space-y-2">
                    <Label htmlFor="box_price" className="flex items-center gap-1">
                      Harga Modal <span className="text-xs italic text-muted-foreground">(per {getUnitDisplayName(formData.units).toLowerCase()})</span>
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
                          box_price: numValue
                        }));
                      }}
                      placeholder={`Harga modal per ${getUnitDisplayName(formData.units).toLowerCase()}`}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="flex items-center gap-1">
                    Harga Modal <span className="text-xs italic text-muted-foreground">(per pcs)</span>
                  </Label>
                  <div>
                    <Input
                      id="cost_price"
                      name="cost_price"
                      type="text"
                      value={formatNumber(formData.cost_price)}
                      readOnly={formData.units !== 'pcs'}
                      className={formData.units !== 'pcs' ? "bg-gray-100 cursor-not-allowed" : ""}
                      placeholder={formData.units === 'pcs' ? "Masukkan harga modal per pcs" : `Otomatis dari harga ${getUnitDisplayName(formData.units).toLowerCase()} / pcs`}
                      onChange={formData.units === 'pcs' ? handleNumberChange : undefined}
                      required
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formData.units === 'pcs' 
                        ? "Masukkan harga modal per pcs secara manual"
                        : `Dihitung otomatis dari Harga per ${getUnitDisplayName(formData.units).toLowerCase()} / Jumlah pcs`
                      }
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_wholesale_qty">Min. Qty Grosir Konsumen</Label>
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
              
              <div className={`grid grid-cols-1 gap-4 ${formData.units === 'pcs' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                {formData.units !== 'pcs' && (
                  <div className="space-y-2">
                    <Label htmlFor="retail_box_price" className="flex items-center gap-1">
                      Harga Jual <span className="text-xs italic text-muted-foreground">(eceran per {getUnitDisplayName(formData.units).toLowerCase()})</span>
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
                      placeholder={`Harga jual eceran per ${getUnitDisplayName(formData.units).toLowerCase()}`}
                      min="0"
                    />
                    {formData.box_price !== null && formData.box_price !== undefined && formData.box_price > 0 && (
                      <div className="text-[11px] text-emerald-500 font-normal mt-1 space-y-0.5">
                        <div>Harga +4%: {formatNumber(Math.round(formData.box_price * 1.04))}</div>
                        <div>Harga +5%: {formatNumber(Math.round(formData.box_price * 1.05))}</div>
                        <div>Khusus Rokok +5%: {formatNumber(Math.round(formData.box_price * 1.05))}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reseller_price" className="flex items-center gap-1">
                    Harga Jual <span className="text-xs italic text-muted-foreground">(reseller per {getUnitDisplayName(formData.units).toLowerCase()})</span>
                  </Label>
                  <Input
                    id="reseller_price"
                    name="reseller_price"
                    type="text"
                    value={formatNumber(formData.reseller_price || 0)}
                    onChange={handleNumberChange}
                    onBlur={(e) => {
                      const numValue = parseNumber(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        reseller_price: numValue
                      }));
                    }}
                    placeholder="Harga reseller"
                    min="0"
                  />
                  {formData.box_price !== null && formData.box_price !== undefined && formData.box_price > 0 && (
                    <div className="text-[11px] text-emerald-500 font-normal mt-1 space-y-0.5">
                      <div>Harga +6%: {formatNumber(Math.round(formData.box_price * 1.06))}</div>
                      <div>Khusus Rokok +5%: {formatNumber(Math.round(formData.box_price * 1.05))}</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wholesale_price" className="flex items-center gap-1">
                    Harga Jual <span className="text-xs italic text-muted-foreground">(grosir konsumen)</span>
                  </Label>
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
                  {formData.cost_price !== null && formData.cost_price !== undefined && formData.cost_price > 0 && (
                    <div className="text-[11px] text-blue-500 font-normal mt-1 space-y-0.5">
                      <div>Harga +5%: {formatNumber(Math.round(formData.cost_price * 1.05))}</div>
                      <div>Harga +8%: {formatNumber(Math.round(formData.cost_price * 1.08))}</div>
                      <div>Kosongkan, khusus Rokok pakai harga per slop</div>
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
                  />                  
                  {formData.cost_price !== null && formData.cost_price !== undefined && formData.cost_price > 0 && (
                    <div className="text-[11px] text-amber-600 font-medium mt-1 space-y-0.5">
                      <div>Harga +10%: {formatNumber(Math.round(formData.cost_price * 1.10))}</div>
                      <div>Harga +15%: {formatNumber(Math.round(formData.cost_price * 1.15))}</div>
                      <div>Khusus Rokok Naik 1000 - 2000</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox"
                  id="is_editable"
                  name="is_editable"
                  checked={formData.is_editable}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    is_editable: e.target.checked
                  }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="is_editable" className="text-sm font-medium text-gray-700">
                  Produk dapat diedit
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="outline" asChild>
                  <Link href="/products">Batal</Link>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    const formEvent = new Event('submit', { cancelable: true, bubbles: true }) as unknown as React.FormEvent<HTMLFormElement>;
                    handleSubmit(formEvent, true);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan & Tambah Baru'}
                </Button>
                <Button 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Produk'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
