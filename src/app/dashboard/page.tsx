'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, FileText, DollarSign, TrendingUp, CalendarClock, BarChart } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { supabase } from '@/lib/supabaseClient';

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  profit: number;
  items?: unknown[];
  status?: string;
}

interface DashboardStats {
  totalProducts: number;
  totalSuppliers: number;
  todayTransactions: number;
  totalTransactions: number;
  todayRevenue: number;
  todayProfit: number;
  monthlyProfit: number;
  totalProfit: number;
  loading: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSuppliers: 0,
    todayTransactions: 0,
    totalTransactions: 0,
    todayRevenue: 0,
    todayProfit: 0,
    monthlyProfit: 0,
    totalProfit: 0,
    loading: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get current month's first and last day
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDayOfMonth.setHours(23, 59, 59, 999);

        // Fetch total products count
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Fetch total suppliers count
        const { count: supplierCount } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true });

        // Fetch today's transactions
        const { data: todayTransactions, count: todayTransactionsCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        // Log today's transaction details
        console.log('=== Today\'s Transactions with Profit ===');
        if (todayTransactions && todayTransactions.length > 0) {
          todayTransactions.forEach((tx: Transaction) => {
            console.log(`
              Transaction ID: ${tx.id}
              Date: ${new Date(tx.created_at).toLocaleString()}
              Total Amount: ${tx.total_amount || 0}
              Profit: ${tx.profit || 0}
              Items: ${tx.items?.length || 0} items
              Status: ${tx.status || 'N/A'}
            `);
          });
          console.log(`\nTotal transactions today: ${todayTransactions.length}`);
        } else {
          console.log('No transactions found for today');
        }

        // Fetch all transactions count
        const { count: totalTransactionsCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });

        // Calculate today's revenue and profit
        const todayRevenue = todayTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
        
        // For demo, assuming 30% profit margin
        const todayProfit = todayRevenue * 0.3;

        // Fetch monthly transactions for profit calculation
        const { data: monthlyTransactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());

        const monthlyRevenue = monthlyTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
        const monthlyProfit = monthlyRevenue * 0.3; // 30% profit margin

        // Fetch all transactions for total profit calculation
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('total_amount');

        const totalRevenue = allTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
        const totalProfit = totalRevenue * 0.3; // 30% profit margin

        setStats({
          totalProducts: productCount || 0,
          totalSuppliers: supplierCount || 0,
          todayTransactions: todayTransactionsCount || 0,
          totalTransactions: totalTransactionsCount || 0,
          todayRevenue: todayRevenue,
          todayProfit: todayProfit,
          monthlyProfit: monthlyProfit,
          totalProfit: totalProfit,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard"
        description="Ringkasan aktivitas toko Anda hari ini"
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Produk
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              +20% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Supplier
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSuppliers > 0 ? `Total ${stats.totalSuppliers} supplier aktif` : 'Belum ada supplier'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transaksi Hari Ini
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayTransactions > 0 ? `Dari total ${stats.totalTransactions} transaksi` : 'Belum ada transaksi hari ini'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transaksi
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayTransactions} transaksi hari ini
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Keuntungan Hari Ini
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.todayProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.todayProfit > 0 ? `Dari ${stats.todayTransactions} transaksi` : 'Belum ada keuntungan hari ini'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Keuntungan Bulan Ini
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.monthlyProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.monthlyProfit > 0 ? 'Perkiraan keuntungan bulan ini' : 'Belum ada catatan keuntungan bulan ini'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Keuntungan
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total keuntungan keseluruhan toko
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Add more dashboard sections here */}
    </div>
  );
}
