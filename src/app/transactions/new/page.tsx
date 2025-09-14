"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Trash2, Barcode, Package } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Database } from "@/lib/database.types";
import { createTransaction } from "@/lib/api/transactions";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  retail_price: number;
  retail_box_price: number;
  wholesale_price: number;
  min_wholesale_qty: number;
  qty_per_box: number;
  barcode: string | null;
  qty: number;
}

type UnitType = 'pcs' | 'box';

export default function NewTransactionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    unit: UnitType;
    price: number;
    subtotal: number;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isBarcodeFocused, setIsBarcodeFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>("");
  
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

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

  // Fetch products based on search term
  useEffect(() => {
    const fetchProducts = async () => {
      if (!searchTerm) {
        setProducts([]);
        return;
      }
      
      setIsSearching(true);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);

        if (error) {
          console.error('Error fetching products:', error);
        } else {
          setProducts(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, supabase]);

  // Handle barcode scanning
  useEffect(() => {
    if (barcodeInput && !isBarcodeFocused) {
      const product = products.find(p => p.barcode === barcodeInput);
      if (product) {
        addToCart(product, 'pcs');
      }
      setBarcodeInput("");
    }
  }, [barcodeInput, isBarcodeFocused, products]);

  const addToCart = (product: Product, unit: UnitType = 'pcs') => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.product.id === product.id && item.unit === unit
      );

      if (existingItemIndex >= 0) {
        return prevCart.map((item, idx) => 
          idx === existingItemIndex 
            ? { 
                ...item, 
                quantity: item.quantity + 1, 
                subtotal: (item.quantity + 1) * item.price 
              }
            : item
        );
      }

      // Calculate price based on unit type and quantity
      let price = product.retail_price; // Default: retail price per pcs
      
      if (unit === 'box') {
        // Per karton: pakai retail_box_price
        price = product.retail_box_price;
      } else if (unit === 'pcs') {
        // Per pcs: cek apakah bisa grosir
        if (1 >= product.min_wholesale_qty && product.min_wholesale_qty > 0) {
          price = product.wholesale_price; // Grosir jika qty >= min_wholesale_qty
        } else {
          price = product.retail_price; // Eceran
        }
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
  };

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
          // Calculate price based on quantity for wholesale pricing
          let price = item.price;
          
          if (unit === 'pcs' && item.product.min_wholesale_qty > 0) {
            // Use wholesale price if quantity meets minimum
            price = newQuantity >= item.product.min_wholesale_qty 
              ? item.product.wholesale_price 
              : item.product.retail_price;
          }
          
          console.log("UpdateQuantity debug:", {
            productId,
            newQuantity,
            unit,
            currentPrice: item.price,
            minWholesaleQty: item.product.min_wholesale_qty,
            wholesalePrice: item.product.wholesale_price,
            retailPrice: item.product.retail_price
          });

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
    if (cart.length === 0) {
      toast.error("Keranjang kosong", {
        description: "Tambahkan produk terlebih dahulu",
      });
      return;
    }


    setIsSubmitting(true);

    try {
      const transactionData = {
        customer_name: customerName.trim() || "Pelanggan",
        amount_paid: parseRupiah(amountPaid),
        items: cart.map(item => {
          // Calculate price per unit based on logic
          let pricePerUnit = item.price;
          
          if (item.unit === 'box') {
            // Per karton: price per unit = retail_box_price / qty_per_box
            pricePerUnit = item.product.retail_box_price; // Karton
          } else if (item.unit === 'pcs') {
            // Per pcs: cek apakah grosir atau eceran
            if (item.quantity >= item.product.min_wholesale_qty && item.product.min_wholesale_qty > 0) {
              pricePerUnit = item.product.wholesale_price; // Grosir
            } else {
              pricePerUnit = item.product.retail_price; // Eceran
            }
          }
          
          return {
            product_id: item.product.id,
            quantity: item.quantity,
            price: pricePerUnit, // Price per unit yang benar
            unit: item.unit,
            qty_per_box: item.product.qty_per_box,
          };
        }),
      };

      console.log("Frontend sending transaction data:", transactionData);

      const result = await createTransaction(transactionData);

      toast.success("Transaksi berhasil!", {
        description: `Transaksi ${result.transaction.transaction_number} telah dibuat`,
      });

      // Reset form
      setCart([]);
      setCustomerName("");
      setSearchTerm("");
      setProducts([]);

      // Redirect to transactions list
      setTimeout(() => {
        router.push("/transactions");
      }, 1500);

    } catch (error: any) {
      console.error("Transaction error:", error);
      toast.error("Gagal membuat transaksi", {
        description: error.message || "Terjadi kesalahan saat memproses transaksi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Transaksi Baru</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Product Search Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="barcode">Scan Barcode</Label>
                  <Input
                    id="barcode"
                    placeholder="Scan barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onFocus={() => setIsBarcodeFocused(true)}
                    onBlur={() => setIsBarcodeFocused(false)}
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
                ) : (
                  <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
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
                    ) : searchTerm ? (
                      <div className="text-center py-8 text-gray-500">
                        Produk tidak ditemukan
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Cari produk untuk memulai transaksi
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Keranjang</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Nama Pelanggan</Label>
                  <Input
                    id="customer"
                    placeholder="Nama pelanggan..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-2"
                  />
                </div>


                {cart.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {cart.map((item) => (
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
                            {item.unit === 'box' ? (
                              <span>Rp{item.product.retail_box_price.toLocaleString('id-ID')} / karton</span>
                            ) : item.quantity >= item.product.min_wholesale_qty ? (
                              <span className="text-green-600">Grosir: Rp{item.product.wholesale_price.toLocaleString('id-ID')} / pcs</span>
                            ) : (
                              <span>Eceran: Rp{item.price.toLocaleString('id-ID')} / pcs</span>
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
                            Rp{item.subtotal.toLocaleString('id-ID')}
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
                    <Label htmlFor="amountPaid" className="text-sm font-medium text-gray-700 mb-2 block">
                      Jumlah Bayar
                    </Label>
                    <Input
                      id="amountPaid"
                      placeholder="Rp 0"
                      value={amountPaid}
                      onChange={(e) => {
                        const numericValue = parseRupiah(e.target.value);
                        setAmountPaid(formatRupiah(numericValue));
                      }}
                      className="text-lg font-semibold"
                    />
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

                  <Button 
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={cart.length === 0 || isSubmitting}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
