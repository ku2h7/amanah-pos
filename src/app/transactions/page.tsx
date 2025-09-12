import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function TransactionsPage() {
  // This is a placeholder data - replace with actual data fetching
  const transactions = [
    { id: 1, date: '2023-05-15', customer: 'John Doe', total: 50000, items: 3 },
    { id: 2, date: '2023-05-14', customer: 'Jane Smith', total: 120000, items: 5 },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Link href="/">
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border [&>div:not(:last-child)]:border-b">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Transaction #{transaction.id}</h3>
                  <p className="text-sm text-muted-foreground">
                    {transaction.date} • {transaction.customer} • {transaction.items} items
                  </p>
                </div>
                <div className="space-x-2">
                  <span className="font-medium">Rp{transaction.total.toLocaleString()}</span>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
