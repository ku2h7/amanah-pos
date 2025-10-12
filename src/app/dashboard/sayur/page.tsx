'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carrot, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { supabase } from '@/lib/supabaseClient';

interface TransactionItem {
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
  }[];
}

interface VegetableSale {
  id: string;
  name: string;
  total_quantity: number;
  total_revenue: number;
}

export default function VegetableSalesPage() {
  const [vegetableSales, setVegetableSales] = useState<VegetableSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [totalVegetableRevenue, setTotalVegetableRevenue] = useState(0);

  useEffect(() => {
    const fetchVegetableSales = async () => {
      try {
        setLoading(true);
        
        // Fetch vegetable sales data
        const { data } = await supabase
          .from('transaction_items')
          .select(`
            quantity,
            price,
            product:products (
              id,
              name
            )
          `)
          .like('product.id', 'SR-%')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`);

        // Process the data to group by product
        const salesByProduct = new Map();
        let totalRevenue = 0;

        (data as unknown as TransactionItem[])?.forEach(item => {
          const product = item.product?.[0]; // Get the first product in the array
          const productId = product?.id;
          const productName = product?.name;
          const quantity = item.quantity || 0;
          const price = item.price || 0;
          const revenue = quantity * price;

          if (productId && productName) {
            if (!salesByProduct.has(productId)) {
              salesByProduct.set(productId, {
                id: productId,
                name: productName,
                total_quantity: 0,
                total_revenue: 0
              });
            }
            
            const product = salesByProduct.get(productId);
            product.total_quantity += quantity;
            product.total_revenue += revenue;
            totalRevenue += revenue;
          }
        });

        setVegetableSales(Array.from(salesByProduct.values()));
        setTotalVegetableRevenue(totalRevenue);
      } catch (error) {
        console.error('Error fetching vegetable sales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVegetableSales();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PageHeader 
            title="Laporan Penjualan Sayur"
            description={`Data penjualan sayur periode ${new Date(dateRange.start).toLocaleDateString('id-ID')} - ${new Date(dateRange.end).toLocaleDateString('id-ID')}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <span>s/d</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-md px-3 py-2 text-sm"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pendapatan Sayur
            </CardTitle>
            <Carrot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVegetableRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jumlah Jenis Sayur Terjual
            </CardTitle>
            <Carrot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vegetableSales.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Detail Penjualan per Jenis Sayur</h3>
        <div className="border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Sayur
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah Terjual (kg)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Pendapatan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vegetableSales.length > 0 ? (
                vegetableSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {sale.total_quantity.toFixed(2)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(sale.total_revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada data penjualan sayur pada periode ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
