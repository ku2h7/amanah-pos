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

interface TransactionItemWithProduct {
  product_id: string | null;
  quantity: number | null;
  subtotal: number | null;
  price_per_unit: number | null;
  unit: string | null;
  qty_per_box: number | null;
  transaction_id?: string | null;
  products: {
    cost_price: number | null;
    qty_per_box: number | null;
  } | {
    cost_price: number | null;
    qty_per_box: number | null;
  }[] | null;
}

const calculateProfitForItem = (item: TransactionItemWithProduct): number => {
  if (!item || typeof item.product_id !== 'string') {
    return 0;
  }

  if (item.product_id.startsWith('SR-')) {
    return 0;
  }

  const productDetails = Array.isArray(item.products)
    ? item.products[0]
    : item.products;
  const costPrice = productDetails?.cost_price ?? 0;
  const qtyPerBox = item.qty_per_box ?? productDetails?.qty_per_box ?? 1;
  const normalizedQtyPerBox = qtyPerBox > 0 ? qtyPerBox : 1;
  const quantity = item.quantity ?? 0;
  const unit = item.unit ?? 'pcs';
  const pricePerUnit = item.price_per_unit ?? 0;
  const totalPieces = unit === 'box'
    ? quantity * normalizedQtyPerBox
    : quantity;
  const sellingPricePerPiece = unit === 'box'
    ? pricePerUnit / normalizedQtyPerBox
    : pricePerUnit;
  const profitPerPiece = sellingPricePerPiece - costPrice;
  return profitPerPiece * totalPieces;
};

const calculateProfitFromItems = (items: TransactionItemWithProduct[]): number => {
  return items.reduce((sum, item) => sum + calculateProfitForItem(item), 0);
};
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

        let todayProfit = 0;

        if (todayTransactions && todayTransactions.length > 0) {
          const transactionIds = todayTransactions.map((t: Transaction) => t.id);

          if (transactionIds.length > 0) {
            const { data: todayTransactionItems, error: todayTransactionItemsError } = await supabase
              .from('transaction_items')
              .select(`
                product_id,
                quantity,
                subtotal,
                price_per_unit,
                unit,
                qty_per_box,
                transaction_id,
                products (
                  cost_price,
                  qty_per_box
                )
              `)
              .in('transaction_id', transactionIds);

            if (todayTransactionItemsError) {
              console.error('Error fetching today transaction items:', todayTransactionItemsError);
            } else if (todayTransactionItems) {
              const typedItems = todayTransactionItems as TransactionItemWithProduct[];
              const profitByTransaction = new Map<string, number>();

              typedItems.forEach(item => {
                const profit = calculateProfitForItem(item);
                if (!item.transaction_id) {
                  return;
                }

                const current = profitByTransaction.get(item.transaction_id) ?? 0;
                profitByTransaction.set(item.transaction_id, current + profit);
              });

              console.log('=== Profit per transaction (Today) ===');
              transactionIds.forEach(id => {
                const profit = profitByTransaction.get(id) ?? 0;
                console.log(`Transaksi ${id}: ${formatCurrency(profit)}`);
              });

              todayProfit = calculateProfitFromItems(typedItems);
            }
          }
        }

        // Fetch monthly transactions for profit calculation
        const { data: monthlyTransactions } = await supabase
          .from('transactions')
          .select('id, total_amount, created_at')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());
        let monthlyProfit = 0;

        if (monthlyTransactions && monthlyTransactions.length > 0) {
          const monthlyTransactionIds = monthlyTransactions.map(t => t.id);
          const transactionDateMap = new Map<string, string>();
          monthlyTransactions.forEach(t => {
            if (t.id && t.created_at) {
              transactionDateMap.set(t.id, t.created_at);
            }
          });

          if (monthlyTransactionIds.length > 0) {
            const { data: monthlyTransactionItems, error: monthlyTransactionItemsError } = await supabase
              .from('transaction_items')
              .select(`
                product_id,
                quantity,
                subtotal,
                price_per_unit,
                unit,
                qty_per_box,
                transaction_id,
                products (
                  cost_price,
                  qty_per_box
                )
              `)
              .in('transaction_id', monthlyTransactionIds);

            if (monthlyTransactionItemsError) {
              console.error('Error fetching monthly transaction items:', monthlyTransactionItemsError);
            } else if (monthlyTransactionItems) {
              const typedMonthlyItems = monthlyTransactionItems as TransactionItemWithProduct[];
              const profitByTransaction = new Map<string, number>();

              typedMonthlyItems.forEach(item => {
                const profit = calculateProfitForItem(item);
                if (!item.transaction_id) {
                  return;
                }

                const current = profitByTransaction.get(item.transaction_id) ?? 0;
                profitByTransaction.set(item.transaction_id, current + profit);
              });

              console.log('=== Profit per transaction (Current Month) ===');
              monthlyTransactionIds.forEach(id => {
                const profit = profitByTransaction.get(id) ?? 0;
                console.log(`Transaksi ${id}: ${formatCurrency(profit)}`);
              });

              const profitByDate = new Map<string, number>();
              monthlyTransactionIds.forEach(id => {
                const profit = profitByTransaction.get(id) ?? 0;
                const createdAt = transactionDateMap.get(id);
                if (!createdAt) {
                  return;
                }

                const dateKey = new Date(createdAt).toISOString().slice(0, 10);
                const current = profitByDate.get(dateKey) ?? 0;
                profitByDate.set(dateKey, current + profit);
              });

              if (profitByDate.size > 0) {
                console.log('=== Profit per day (Current Month) ===');
                Array.from(profitByDate.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .forEach(([date, profit]) => {
                    console.log(`${date}: ${formatCurrency(profit)}`);
                  });
              }

              monthlyProfit = calculateProfitFromItems(typedMonthlyItems);
            }
          }
        }

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
