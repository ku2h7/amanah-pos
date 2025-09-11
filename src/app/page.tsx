'use client'

import { useEffect, useState } from 'react'

const Home = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        setProducts(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <main className="min-h-screen">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">📦 Daftar Produk</h1>
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-2 border">Nama</th>
              <th className="p-2 border">Stok</th>
              <th className="p-2 border">Harga Ecer</th>
              <th className="p-2 border">Harga Grosir</th>
              <th className="p-2 border">Min Grosir</th>
              <th className="p-2 border">Barcode</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-2 border">{p.name}</td>
                <td className="p-2 border">{p.qty}</td>
                <td className="p-2 border">Rp {p.retail_price}</td>
                <td className="p-2 border">Rp {p.wholesale_price || '-'}</td>
                <td className="p-2 border">{p.min_wholesale_qty || '-'}</td>
                <td className="p-2 border">{p.barcode || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default Home;
