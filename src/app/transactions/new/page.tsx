"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Trash2, Package, ArrowLeft } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import { createTransaction } from "@/lib/api/transactions";
import { toast } from "sonner";
import { ReceiptTemplate, printReceipt } from "@/components/receipt/ReceiptTemplate";

interface Product {
  id: string;
  name: string;
  retail_price: number;
  retail_box_price: number;
  reseller_price: number;
  wholesale_price: number;
  min_wholesale_qty: number;
  qty_per_box: number;
  barcode: string | null;
  qty: number;
}

type UnitType = 'pcs' | 'box';

export default function NewTransactionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>('');
  
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    unit: UnitType;
    price: number;
    subtotal: number;
    customPrice?: boolean;
  }>>([]);
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [isReseller, setIsReseller] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [cashierName, setCashierName] = useState('Admin');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  // Refs
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const tempRef = useRef<HTMLDivElement | null>(null);
  const searchTimeout = useRef<number | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastBarcodeTime = useRef<number>(0);
  
  // Handle barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika sedang fokus di input lain
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement.id !== 'barcode-input') {
        return;
      }

      const now = Date.now();
      
      // Jika input adalah Enter, cari produk
      if (e.key === 'Enter') {
        e.preventDefault();
        // Hanya proses jika input terakhir lebih dari 100ms yang lalu (menghindari double input)
        if (now - lastBarcodeTime.current > 100) {
          lastBarcodeTime.current = now;
          if (barcodeInput.trim()) {
            // Trigger submit
            const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 });
            barcodeInputRef.current?.dispatchEvent(event);
          }
        }
        return;
      } 
      
      // Jika input adalah karakter biasa, fokus ke input barcode
      if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey) {
        // Fokus ke input barcode jika belum fokus
        if (document.activeElement?.id !== 'barcode-input' && barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [barcodeInput]);
  
  // Supabase client
  const supabase = createClientComponentClient<Database>();

  // Add to cart function
  const addToCart = useCallback((product: Product, unit: UnitType) => {
    // Remove the added product from search results without triggering search
    setProducts(prevProducts => {
      const filtered = prevProducts.filter(p => p.id !== product.id);
      return filtered;
    });
    
    // Update cart synchronously without loading state
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.product.id === product.id && item.unit === unit
      );

      if (existingItemIndex >= 0) {
        return prevCart.map((item, idx) => {
          if (idx === existingItemIndex) {
            const newQuantity = item.quantity + 1;
            return {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * (unit === 'box' ? product.retail_box_price : product.retail_price)
            };
          }
          return item;
        });
      }

      const price = unit === 'box' ? product.retail_box_price : product.retail_price;
      
      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          unit,
          price,
          subtotal: price
        }
      ];
    });
  }, [setProducts, setCart]);

  // Process barcode from scanner
  const processBarcode = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      // Add to cart or increment quantity
      addToCart(product, 'pcs');
      toast.success(`${product.name} ditambahkan ke keranjang`);
    } else {
      // If no product found, set the barcode input field
      setBarcodeInput(barcode);
      // Focus on the barcode input field
      const barcodeInput = document.getElementById('barcode-input') as HTMLInputElement;
      if (barcodeInput) {
        barcodeInput.focus();
        barcodeInput.select();
      }
    }
  }, [products, addToCart]);

  // Handle global barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const activeElement = document.activeElement as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement?.tagName)) {
        // Only process Enter key in barcode input
        if (activeElement.id !== 'barcode-input' || e.key !== 'Enter') {
          return;
        }
        // If Enter is pressed in barcode input, process it manually
        if (barcodeInput) {
          e.preventDefault();
          processBarcode(barcodeInput);
          setBarcodeInput('');
          return;
        }
      }

      // Reset buffer if last key was pressed more than 100ms ago
      if (barcodeTimer.current) {
        clearTimeout(barcodeTimer.current);
      }

      // If Enter is pressed, process the barcode
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        processBarcode(barcodeBuffer.current);
        barcodeBuffer.current = '';
        return;
      }

      // Only process printable characters
      if (e.key.length === 1 && e.key !== ' ' && e.key !== 'Enter') {
        barcodeBuffer.current += e.key;
      }

      // Reset buffer after 100ms of no input
      barcodeTimer.current = setTimeout(() => {
        if (barcodeBuffer.current.length >= 8) { // Minimum barcode length
          processBarcode(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimer.current) {
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = null;
      }
    };
  }, [processBarcode, barcodeInput]);

  // Update harga di keranjang saat status reseller berubah
  useEffect(() => {
    if (cart.length > 0) {
      setCart(prevCart => 
        prevCart.map(item => {
          const price = isReseller && item.product.reseller_price > 0 
            ? item.product.reseller_price 
            : item.unit === 'box' 
              ? item.product.retail_box_price 
              : item.product.retail_price;
              
          return {
            ...item,
            price,
            subtotal: price * item.quantity
          };
        })
      );
    }
  }, [isReseller, cart.length]);

  // Reset form to initial state
  const resetForm = () => {
    setCart([]);
    setCustomerName("");
    setAmountPaid("");
    setBarcodeInput("");
    setSearchTerm("");
    setTransactionComplete(false);
    setTransactionId("");
  };

  // Format number to Rupiah
  const formatRupiah = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Parse Rupiah string to number
  const parseRupiah = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, '')) || 0;
  };


  // Filter out products that are already in the cart
  const filteredProducts = useMemo(() => {
    const cartProductIds = new Set(cart.map(item => item.product.id));
    return searchResults.filter(product => !cartProductIds.has(product.id));
  }, [searchResults, cart]);

  // Set products to filtered results
  useEffect(() => {
    setProducts(filteredProducts);
  }, [filteredProducts]);

  // Fetch products based on search term
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeout.current !== null) {
      window.clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }

    // Skip if search term is empty
    if (!searchTerm) {
      setSearchResults([]);
      setProducts([]);
      setIsSearching(false);
      return;
    }

    // Show loading state
    setIsSearching(true);

    // Set a timeout to debounce the search
    searchTimeout.current = window.setTimeout(async () => {
      try {
        // First, get all products matching the search term
        const query = supabase
          .from('products')
          .select('*')
          .ilike('name', `%${searchTerm}%`);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching products:', error);
          setSearchResults([]);
        } else if (data) {
          setSearchResults(data);
          // Filter out products that are already in the cart
          const filtered = data.filter(product => 
            !cart.some(item => item.product.id === product.id)
          );
          setProducts(filtered);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, supabase]);

  // Handle barcode input changes
  useEffect(() => {
    const handleBarcodeInput = async () => {
      if (!barcodeInput || (!barcodeInput.includes('\n') && !barcodeInput.includes('\r'))) return;
      
      const cleanBarcode = barcodeInput.replace(/[\n\r]/g, '').trim();
      if (!cleanBarcode) return;

      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', cleanBarcode)
          .single();

        if (error) throw error;
        
        if (product) {
          addToCart(product, 'pcs');
          toast.success(`${product.name} ditambahkan ke keranjang`);
          setBarcodeInput('');
        } else {
          toast.error('Produk tidak ditemukan');
        }
      } catch (error) {
        console.error('Error handling barcode scan:', error);
        toast.error('Terjadi kesalahan saat memindai barcode');
      }
      
      // Always focus back to input
      const barcodeInputElement = document.getElementById('barcode') as HTMLInputElement;
      if (barcodeInputElement) {
        barcodeInputElement.focus();
        barcodeInputElement.selectionStart = barcodeInputElement.selectionEnd = barcodeInputElement.value.length;
      }
    };

    handleBarcodeInput();
  }, [barcodeInput, supabase, addToCart]);



  const removeFromCart = (productId: string, unit: UnitType) => {
    setCart(prevCart => 
      prevCart.filter(item => !(item.product.id === productId && item.unit === unit))
    );
  };

  const updateQuantity = (productId: string, newQuantity: number, unit: UnitType) => {
    if (newQuantity < 1) {
      removeFromCart(productId, unit);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId && item.unit === unit) {
          // Jika ada harga custom, gunakan harga tersebut
          if (item.customPrice) {
            return {
              ...item,
              quantity: newQuantity,
              subtotal: item.price * newQuantity
            };
          }
          
          // Jika tidak ada harga custom, hitung ulang harga sesuai logika yang ada
          let price = item.price;
          
          if (unit === 'pcs' && item.product.min_wholesale_qty > 0) {
            // Gunakan harga grosir jika memenuhi minimum
            price = newQuantity >= item.product.min_wholesale_qty 
              ? item.product.wholesale_price 
              : item.product.retail_price;
          } else if (unit === 'box') {
            // Tetap gunakan harga karton
            price = item.product.retail_box_price;
          }

          return { 
            ...item, 
            quantity: newQuantity,
            price,
            subtotal: newQuantity * price
          };
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + item.subtotal,
      0
    );
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const paid = parseRupiah(amountPaid);
    return paid - total;
  };

  const handleSubmit = async () => {
    setTriedSubmit(true);
    
    if (cart.length === 0) {
      toast.error("Keranjang kosong", {
        description: "Tambahkan produk terlebih dahulu",
      });
      return;
    }

    const paidAmount = parseRupiah(amountPaid);
    const total = calculateTotal();
    
    if (!paidAmount || paidAmount < total) {
      if (!paidAmount) {
        toast.error("Jumlah bayar harus diisi");
      } else if (paidAmount < total) {
        toast.error("Jumlah pembayaran kurang");
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const currentCashierName = session?.user?.user_metadata?.full_name || 
                               session?.user?.user_metadata?.name || 
                               'Admin';
      
      setCashierName(currentCashierName);

      const cashierId = session?.user?.user_metadata?.user_id || '';
      const transactionData = {
        customer_name: customerName.trim() || "Pelanggan",
        amount_paid: parseRupiah(amountPaid),
        cashier_id: cashierId,
        cashier_name: cashierName,
        items: cart.map(item => {
          // Gunakan harga yang ada di item (sudah termasuk harga custom jika ada)
          // price sudah dihitung dengan benar di addToCart/updateQuantity
          const pricePerUnit = item.price;
          
          return {
            product_id: item.product.id,
            quantity: item.quantity,
            price: pricePerUnit, // Gunakan harga yang sudah ada di item
            unit: item.unit,
            qty_per_box: item.product.qty_per_box,
            is_custom_price: item.customPrice || false, // Tambahkan flag custom price
          };
        }),
      };

      const result = await createTransaction(transactionData);
      
      // Set the cashier ID from the transaction result if available
      if (result?.transaction?.cashier_id) {
        setCashierName(result.transaction.cashier_id); // Just set the ID directly
      }

      toast.success("Transaksi berhasil!", {
        description: `Transaksi ${result.transaction.id} telah dibuat`,
      });

      // Set transaction complete state and show print button
      setTransactionId(result.transaction.id);
      setTransactionComplete(true);
      
      // Try to open cash drawer using printer commands
      try {
        console.log('Mencoba membuka laci kasir...');
        // Create a temporary div with the receipt content
        const tempDiv = document.createElement('div');
        tempRef.current = tempDiv;
        
        // Create a new receipt template with the transaction data
        const receiptContent = (
          <ReceiptTemplate
            items={cart.map(item => ({
              product: {
                id: item.product.id,
                name: item.product.name,
                retail_price: item.product.retail_price,
                retail_box_price: item.product.retail_box_price,
                qty_per_box: item.product.qty_per_box
              },
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              subtotal: item.subtotal
            }))}
            total={calculateTotal()}
            amountPaid={parseRupiah(amountPaid)}
            change={calculateChange()}
            customerName={customerName || 'Pelanggan'}
            transactionId={result.transaction.id}
            cashierName={cashierName}
          />
        );
        
        // Render the receipt to the temp div
        const root = createRoot(tempDiv);
        root.render(receiptContent);
        
        // Wait for the receipt to be rendered
        await new Promise(resolve => window.setTimeout(resolve, 100));
        
        // Print the receipt which will include the cash drawer command
        await printReceipt(tempDiv);
        
        // Clean up
        root.unmount();
        
        // Reset form after a short delay to ensure print dialog appears
        window.setTimeout(() => {
          resetForm();
        }, 500);
        
      } catch (error) {
        console.error('Error saat mencetak struk/membuka laci:', error);
        toast.error('Gagal mencetak struk', {
          description: 'Pastikan printer terhubung dengan benar',
        });
        // Still reset the form even if printing fails
        resetForm();
      }

    } catch (error) {
      console.error("Transaction error:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat memproses transaksi";
      toast.error("Gagal membuat transaksi", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      <PageHeader 
        title="Transaksi Baru"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <Button asChild variant="outline">
          <Link href="/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Transaksi
          </Link>
        </Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">
        {/* Product Search Section */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="space-y-4 flex flex-col h-full">
                <div>
                  <Label htmlFor="barcode">Scan Barcode</Label>
                  <Input
                    ref={barcodeInputRef}
                    id="barcode-input"
                    placeholder="Scan barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const cleanBarcode = barcodeInput.trim();
                        if (cleanBarcode) {
                          // First, try to find the product in the current search results
                          const productInResults = products.find(p => p.barcode === cleanBarcode);
                          
                          if (productInResults) {
                            // If found in current results, add to cart immediately
                            addToCart(productInResults, 'pcs');
                            toast.success(`${productInResults.name} ditambahkan ke keranjang`);
                            setBarcodeInput('');
                          } else {
                            // If not in current results, search in database
                            try {
                              const { data: product, error } = await supabase
                                .from('products')
                                .select('*')
                                .eq('barcode', cleanBarcode)
                                .single();

                              if (error) throw error;
                              
                              if (product) {
                                addToCart(product, 'pcs');
                                toast.success(`${product.name} ditambahkan ke keranjang`);
                                setBarcodeInput('');
                              } else {
                                toast.error('Produk tidak ditemukan');
                              }
                            } catch (error) {
                              console.error('Error:', error);
                              toast.error('Terjadi kesalahan saat mencari produk');
                            }
                          }
                        }
                      }
                    }}
                    autoComplete="off"
                    autoFocus
                    className="mt-2 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="search">Cari Produk</Label>
                  <Input
                    id="search"
                    placeholder="Nama produk..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {isSearching ? (
                  <div className="mt-4 flex justify-center items-center h-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2">Mencari produk...</span>
                  </div>
                ) : searchTerm ? (
                  <div className="mt-4 space-y-2 flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-370px)]">
                    {products.length > 0 ? (
                      products.map((product) => (
                        <div key={product.id} className="group p-2 border rounded-lg hover:bg-gray-800 transition-colors">
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white group-hover:text-primary transition-colors text-sm">{product.name}</p>
                              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                <p>Eceran: Rp{product.retail_price.toLocaleString('id-ID')}</p>
                                {product.qty_per_box > 1 && (
                                  <p className="text-amber-600">
                                    Karton: Rp{product.retail_box_price.toLocaleString('id-ID')} ({product.qty_per_box} pcs)
                                  </p>
                                )}
                                {product.min_wholesale_qty > 0 && (
                                  <p className="text-green-600">
                                    Grosir: Rp{product.wholesale_price.toLocaleString('id-ID')} (min. {product.min_wholesale_qty})
                                  </p>
                                )}
                                <p className="text-gray-500">Stok: {product.qty} pcs</p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => addToCart(product, 'pcs')}
                                className="gap-1 text-xs px-2 py-1 h-7"
                              >
                                <Plus className="h-3 w-3" /> Pcs
                              </Button>
                              {product.qty_per_box > 1 && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => addToCart(product, 'box')}
                                  className="gap-1 text-xs px-2 py-1 h-7"
                                >
                                  <Package className="h-3 w-3" /> Box
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : searchResults.length > 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Semua produk sudah ditambahkan ke keranjang
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Produk tidak ditemukan
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Cari produk untuk memulai transaksi
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-3 h-full flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle>Keranjang</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="space-y-4 flex flex-col h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customer">Nama Pelanggan</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isReseller"
                        checked={isReseller}
                        onChange={(e) => setIsReseller(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="isReseller" className="text-sm font-medium">
                        Reseller
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="customer"
                    placeholder="Nama pelanggan..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isReseller ? 'Harga Reseller' : 'Harga Normal'} akan diterapkan
                  </p>
                </div>


                {cart.length > 0 ? (
                  <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                    {cart.map((item, index) => (
                      <div key={`${item.product.id}-${item.unit}`} className="flex items-center justify-between px-3 py-2 border rounded-lg gap-4">
                        {/* Left side - Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="font-medium truncate text-sm">{item.product.name}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {item.unit === 'box' 
                                ? `${item.quantity} karton × ${item.product.qty_per_box} pcs`
                                : `${item.quantity} pcs`}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {isReseller && item.product.reseller_price > 0 ? (
                              <span className="text-red-600">Reseller: Rp{item.product.reseller_price.toLocaleString('id-ID')} / {item.unit === 'box' ? 'karton' : 'pcs'}</span>
                            ) : item.unit === 'box' ? (
                              <span>Rp{item.product.retail_box_price.toLocaleString('id-ID')} / karton</span>
                            ) : item.quantity >= item.product.min_wholesale_qty ? (
                              <span className="text-green-600">Grosir: Rp{item.product.wholesale_price.toLocaleString('id-ID')} / pcs</span>
                            ) : (
                              <span className="text-amber-500">Eceran: Rp{item.price.toLocaleString('id-ID')} / pcs</span>
                            )}
                          </div>
                        </div>

                        {/* Right side - Qty controls and subtotal */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.unit)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.unit)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              onClick={() => removeFromCart(item.product.id, item.unit)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="font-medium w-24 text-right">
                            {editingItem === index ? (
                              <div className="flex items-center gap-1">
                                <span>Rp</span>
                                <input
                                  type="text"
                                  className="w-20 border rounded px-1 text-right"
                                  value={editedPrice}
                                  onChange={(e) => {
                                    // Only allow numbers
                                    const value = e.target.value.replace(/\D/g, '');
                                    setEditedPrice(value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newPrice = parseInt(editedPrice) || 0;
                                      const updatedCart = [...cart];
                                      updatedCart[index] = {
                                        ...updatedCart[index],
                                        price: newPrice / updatedCart[index].quantity,
                                        subtotal: newPrice,
                                        customPrice: true
                                      };
                                      setCart(updatedCart);
                                      setEditingItem(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingItem(null);
                                    }
                                  }}
                                  onBlur={() => setEditingItem(null)}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                onClick={() => {
                                  setEditingItem(index);
                                  setEditedPrice(item.subtotal.toString());
                                }}
                              >
                                Rp{item.subtotal.toLocaleString('id-ID')}
                                {item.customPrice && ' *'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Keranjang kosong
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="mb-4">
                    <div className="mb-1">
                      <Label htmlFor="amountPaid" className="text-sm font-medium text-gray-700 mb-2 block">
                        Jumlah Bayar <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="amountPaid"
                        placeholder="Rp 0"
                        value={amountPaid}
                        onChange={(e) => {
                          const numericValue = parseRupiah(e.target.value);
                          setAmountPaid(formatRupiah(numericValue));
                        }}
                        className={`text-lg font-semibold ${triedSubmit && !amountPaid ? 'border-red-500' : ''}`}
                        required
                      />
                      {triedSubmit && !amountPaid && (
                        <p className="mt-1 text-xs text-red-500">Jumlah bayar harus diisi</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total</span>
                    <span>Rp{calculateTotal().toLocaleString('id-ID')}</span>
                  </div>

                  {parseRupiah(amountPaid) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Dibayar</span>
                        <span>{amountPaid}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg mb-4">
                        <span>Kembalian</span>
                        <span className={calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Rp{calculateChange().toLocaleString('id-ID')}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Button 
                      className="w-full"
                      size="lg"
                      onClick={handleSubmit}
                      disabled={(cart.length === 0 || isSubmitting) || transactionComplete}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                          Memproses...
                        </>
                      ) : (
                        'Bayar'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="hidden">
        <div ref={receiptRef}>
          <ReceiptTemplate
            items={cart.map(item => ({
              product: {
                id: item.product.id,
                name: item.product.name,
                retail_price: item.product.retail_price,
                retail_box_price: item.product.retail_box_price,
                qty_per_box: item.product.qty_per_box
              },
              quantity: item.unit === 'box' ? item.quantity * item.product.qty_per_box : item.quantity,
              unit: item.unit,
              price: item.price,
              subtotal: item.subtotal
            }))}
            total={cart.reduce((sum, item) => sum + item.subtotal, 0)}
            amountPaid={parseRupiah(amountPaid)}
            change={parseRupiah(amountPaid) - cart.reduce((sum, item) => sum + item.subtotal, 0)}
            customerName={customerName || 'Pelanggan'}
            transactionId={transactionId}
            cashierName={cashierName}
          />
        </div>
      </div>
    </div>
  );
}
