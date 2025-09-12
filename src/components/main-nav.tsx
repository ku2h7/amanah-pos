import Link from 'next/link';
import { Home, Package2, Package, ShoppingCart, PlusCircle, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MainNav() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link href="/" className="flex items-center space-x-2">
            <Package2 className="h-6 w-6" />
            <span className="font-bold">Amanah Store</span>
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center"
          >
            <Package className="mr-2 h-4 w-4" />
            Products
          </Link>
          <Link
            href="/products/add"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Link>
          <Link
            href="/transactions"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
          >
            <List className="mr-2 h-4 w-4" />
            Transactions
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            New Transaction
          </Link>
        </nav>
      </div>
    </div>
  );
}
