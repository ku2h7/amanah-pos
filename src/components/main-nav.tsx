'use client';

import Link from 'next/link';
import { Package2, Package, ShoppingCart, PlusCircle, List, Receipt, Plus, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export function MainNav() {
  const { user, loading, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 justify-between">
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <Package2 className="h-6 w-6" />
            <span className="font-bold">Amanah Store</span>
          </Link>
          <Link
            href="/products"
            className="text-sm font-medium transition-colors hover:text-primary flex items-center"
          >
            <Package className="mr-2 h-4 w-4" />
            Daftar Produk
          </Link>
          <Link
            href="/products/add"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Link>
          <Link
            href="/transactions"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center group relative"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Daftar Transaksi
            <span className="absolute -bottom-6 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
          </Link>
          <Link
            href="/transactions/new"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center group relative"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Transaksi Baru
            <span className="absolute -bottom-6 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
          </Link>
        </nav>
        
        {loading ? (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : user ? (
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={async () => {
                    setIsLoggingOut(true);
                    await signOut();
                    setIsLoggingOut(false);
                  }}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Keluar...
                    </>
                  ) : (
                    "Keluar"
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link href="/register">Daftar</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
