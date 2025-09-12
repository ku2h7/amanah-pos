'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Trash2, Search } from 'lucide-react';

type Product = {
  id: number;
  name: string;
  retail_price: number;
  stock: number;
};

type CartItem = Product & {
  quantity: number;
};

const Home = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const router = useRouter()

  // Mock data for products
  useEffect(() => {
    const mockProducts: Product[] = [
      { id: 1, name: 'Beras 5kg', retail_price: 60000, stock: 10 },
      { id: 2, name: 'Minyak Goreng 2L', retail_price: 35000, stock: 15 },
      { id: 3, name: 'Gula Pasir 1kg', retail_price: 15000, stock: 20 },
      { id: 4, name: 'Telur 1kg', retail_price: 28000, stock: 25 },
      { id: 5, name: 'Mie Instan', retail_price: 3000, stock: 50 },
    ]
    setProducts(mockProducts)
    setLoading(false)
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: number, change: number) => {
    setCart(prevCart =>
      prevCart
        .map(item =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const removeFromCart = (id: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id))
  }

  const total = cart.reduce(
    (sum, item) => sum + item.retail_price * item.quantity,
    0
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Handle transaction submission
    console.log({
      customerName,
      customerPhone,
      items: cart,
      total,
    })
    alert('Transaksi berhasil disimpan!')
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Transaksi Baru</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map(product => (
              <Button
                key={product.id}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-1 p-2 text-center"
                onClick={() => addToCart(product)}
              >
                <span className="font-medium line-clamp-1">{product.name}</span>
                <span className="text-sm text-muted-foreground">
                  Rp{product.retail_price.toLocaleString()}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Keranjang</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nama Pelanggan</Label>
                  <Input
                    id="customerName"
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">No. HP (Opsional)</Label>
                  <Input
                    id="customerPhone"
                    placeholder="0812-3456-7890"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                    {cart.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Belum ada item di keranjang
                      </p>
                    ) : (
                      cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Rp{item.retail_price.toLocaleString()} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString()}</span>
                  </div>
                  <Button type="submit" className="w-full" disabled={cart.length === 0}>
                    Cetak Nota
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Home;
