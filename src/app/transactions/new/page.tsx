"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Trash2, Package, ArrowLeft, ShoppingCart, PackageSearch, SearchX, CheckCircle2 } from "lucide-react";
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
  units?: string;
}

type UnitType = 'pcs' | 'rtg' | 'bal' | 'karton' | 'karung' | 'ikat' | 'slop';

export default function NewTransactionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>('');
  
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
  
  // Helper function to check if unit is bulk (not pcs)
  const isBulkUnit = (unit: string) => {
    return unit !== 'pcs';
  };
  
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Handle barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      // Abaikan jika sedang fokus di input lain, kecuali input pencarian kita
      if (activeElement?.tagName === 'INPUT' && activeElement.id !== 'search-input') {
        return;
      }

      // Jika input adalah karakter biasa, fokus ke input pencarian
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (searchInputRef.current && !searchInputRef.current.matches(':focus')) {
          // Clear existing search term ketika mulai input baru
          setSearchTerm('');
          searchInputRef.current.focus();
          // Tambahkan karakter ke input
          setTimeout(() => {
            setSearchTerm(e.key);
          }, 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
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
            // Tentukan harga berdasarkan quantity baru
            let price;
            if (isReseller && product.reseller_price > 0) {
              // Jika reseller, selalu gunakan harga reseller tanpa mempertimbangkan quantity
              price = product.reseller_price;
            } else if (isBulkUnit(unit)) {
              price = product.retail_box_price;
            } else if (unit === 'pcs' && product.min_wholesale_qty > 0 && newQuantity >= product.min_wholesale_qty) {
              price = product.wholesale_price;
            } else {
              price = product.retail_price;
            }
            
            return {
              ...item,
              quantity: newQuantity,
              price,
              subtotal: newQuantity * price
            };
          }
          return item;
        });
      }

      // Tentukan harga berdasarkan unit dan kondisi
      let price;
      if (isReseller && product.reseller_price > 0) {
        price = product.reseller_price;
      } else if (isBulkUnit(unit)) {
        price = product.retail_box_price;
      } else if (unit === 'pcs' && product.min_wholesale_qty > 0 && 1 >= product.min_wholesale_qty) {
        // Jika quantity 1 sudah memenuhi syarat grosir
        price = product.wholesale_price;
      } else {
        price = product.retail_price;
      }
      
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
  }, [setProducts, setCart, isReseller]);

  // Process barcode from scanner
  const processBarcode = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      // Add to cart or increment quantity
      addToCart(product, 'pcs');
      toast.success(`${product.name} ditambahkan ke keranjang`);
    } else {
      // If no product found, set the search input field
      setSearchTerm(barcode);
      // Focus on the search input field
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }
  }, [products, addToCart, setSearchTerm]);

  // Handle global barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement?.tagName)) {
        return;
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
  }, [processBarcode]);

  // Update harga di keranjang saat status reseller berubah
  useEffect(() => {
    setCart(prevCart => {
      if (prevCart.length === 0) {
        return prevCart;
      }

      return prevCart.map(item => {
        let price;

        if (isReseller && item.product.reseller_price > 0) {
          // Jika reseller dan ada harga reseller, selalu gunakan harga reseller
          price = item.product.reseller_price;
        } else if (isBulkUnit(item.unit)) {
          // Jika unit bulk (bukan pcs)
          price = item.product.retail_box_price;
        } else if (
          item.unit === 'pcs' &&
          item.product.min_wholesale_qty > 0 &&
          item.quantity >= item.product.min_wholesale_qty
        ) {
          // Jika pcs dan memenuhi syarat grosir (hanya jika bukan reseller)
          price = item.product.wholesale_price;
        } else {
          // Default ke harga eceran
          price = item.product.retail_price;
        }

        return {
          ...item,
          price,
          subtotal: price * item.quantity
        };
      });
    });
  }, [isReseller]);

  // Reset form to initial state
  const resetForm = () => {
    setCart([]);
    setCustomerName("");
    setAmountPaid("");
    setSearchTerm("");
    setIsReseller(false);
    setTriedSubmit(false);
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
          let price;
          
          if (isReseller && item.product.reseller_price > 0) {
            // Jika reseller, selalu gunakan harga reseller tanpa mempertimbangkan quantity
            price = item.product.reseller_price;
          } else if (isBulkUnit(unit)) {
            // Tetap gunakan harga bulk unit
            price = item.product.retail_box_price;
          } else if (unit === 'pcs' && item.product.min_wholesale_qty > 0) {
            // Gunakan harga grosir jika memenuhi minimum (hanya jika bukan reseller)
            price = newQuantity >= item.product.min_wholesale_qty 
              ? item.product.wholesale_price 
              : item.product.retail_price;
          } else {
            price = item.product.retail_price;
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


      // Print receipt setelah cash drawer
      try {
        console.log('Mencetak struk...');
        
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
        
        // Print the receipt
        await printReceipt(tempDiv);
        
        // Clean up
        root.unmount();
        
        // Reset form after a short delay to ensure print dialog appears
        window.setTimeout(() => {
          resetForm();
        }, 500);
        
      } catch (printError) {
        console.error('Error saat mencetak struk:', printError);
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
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Transaksi
            </Link>
          </Button>
        </div>
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
                  <Label htmlFor="search-input">Cari Produk atau Scan Barcode</Label>
                  <Input
                    ref={searchInputRef}
                    id="search-input"
                    placeholder="Ketik nama produk atau scan barcode..."
                    value={searchTerm}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const currentValue = searchTerm;
                      
                      // Deteksi barcode scanner: jika sebelumnya ada text dan sekarang tiba-tiba jadi angka panjang
                      const previousWasText = currentValue.length > 0 && !/^\d+$/.test(currentValue);
                      const newIsLongNumber = /^\d{8,}$/.test(newValue);
                      
                      // Jika sebelumnya text dan sekarang tiba-tiba jadi barcode panjang = scanner input
                      if (previousWasText && newIsLongNumber) {
                        // Kemungkinan barcode scanner, replace semuanya
                        setSearchTerm(newValue);
                      } else {
                        // Input normal
                        setSearchTerm(newValue);
                      }
                    }}
                    onFocus={() => {
                      // Clear keyword ketika field di-focus (user click untuk search baru)
                      if (searchTerm.length > 0) {
                        setSearchTerm('');
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const query = searchTerm.trim();
                        if (!query) return;

                        // Heuristic: if it's all numbers and long enough, it's a barcode.
                        const isBarcode = /^\d{8,}$/.test(query);

                        if (isBarcode) {
                          try {
                            const { data: product, error } = await supabase
                              .from('products')
                              .select('*')
                              .eq('barcode', query)
                              .single();

                            if (error) throw error;
                            
                            if (product) {
                              addToCart(product, 'pcs');
                              toast.success(`${product.name} ditambahkan ke keranjang`);
                              setSearchTerm(''); // Clear input after adding
                            } else {
                              toast.error('Produk dengan barcode tersebut tidak ditemukan');
                            }
                          } catch (error) {
                            console.error('Error searching barcode:', error);
                            toast.error('Terjadi kesalahan saat mencari barcode');
                          }
                        } else {
                          // This will be handled by the useEffect that triggers search by name
                          // We can force a search if needed, but the debounced one should suffice
                          toast.info(`Mencari produk dengan nama "${query}"...`);
                        }
                      }
                    }}
                    autoComplete="off"
                    autoFocus
                    className="mt-2"
                  />
                </div>

                {isSearching ? (
                  <div className="mt-4 flex justify-center items-center h-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2">Mencari produk...</span>
                  </div>
                ) : searchTerm ? (
                  <div className="search-results mt-4 space-y-2 flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-370px)]">
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
                                    {getUnitDisplayName(product.units || 'karton')}: Rp{product.retail_box_price.toLocaleString('id-ID')} ({product.qty_per_box} pcs)
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
                            <div className="flex-shrink-0 flex flex-col gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => addToCart(product, 'pcs')}
                                className="gap-1 text-xs px-2 py-1 h-7"
                              >
                                <Plus className="h-3 w-3" /> Pcs
                              </Button>
                              {product.qty_per_box > 1 && (!product.units || isBulkUnit(product.units)) && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => addToCart(product, (product.units || 'karton') as UnitType)}
                                  className="gap-1 text-xs px-2 py-1 h-7"
                                >
                                  <Package className="h-3 w-3" /> {getUnitDisplayName(product.units || 'karton')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : searchResults.length > 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mb-3 text-green-500" />
                        <p>Semua produk hasil pencarian<br/>sudah ada di keranjang.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-8 text-gray-500">
                        <SearchX className="h-12 w-12 mb-3 text-gray-400" />
                        <p>Produk tidak ditemukan</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-gray-500 h-full">
                    <PackageSearch className="h-16 w-16 mb-4 text-gray-400" />
                    <p>Cari produk untuk memulai transaksi</p>
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
                              {isBulkUnit(item.unit) 
                                ? `${item.quantity} ${getUnitDisplayName(item.unit)} × ${item.product.qty_per_box} pcs`
                                : `${item.quantity} pcs`}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {isReseller && item.product.reseller_price > 0 ? (
                              <span className="text-red-600">Reseller: Rp{item.product.reseller_price.toLocaleString('id-ID')} / {isBulkUnit(item.unit) ? getUnitDisplayName(item.unit) : 'pcs'}</span>
                            ) : isBulkUnit(item.unit) ? (
                              <span>Rp{item.product.retail_box_price.toLocaleString('id-ID')} / {getUnitDisplayName(item.unit)}</span>
                            ) : item.product.wholesale_price > 0 && 
                               item.product.min_wholesale_qty > 0 && 
                               item.quantity >= item.product.min_wholesale_qty ? (
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
                  <div className="flex flex-col items-center justify-center text-center py-8 text-gray-500 h-full">
                    <ShoppingCart className="h-16 w-16 mb-4 text-gray-400" />
                    <p>Keranjang kosong</p>
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
              quantity: isBulkUnit(item.unit) ? item.quantity * item.product.qty_per_box : item.quantity,
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
