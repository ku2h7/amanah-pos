'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Package, 
  List, 
  Plus, 
  Users, 
  FileText,
  LogOut
} from 'lucide-react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    produk: true,
    supplier: true,
    transaksi: true,
  });

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: 'Produk',
      href: '/products',
      icon: <Package className="h-4 w-4" />,
      children: [
        { title: 'Daftar Produk', href: '/products', icon: <List className="h-4 w-4" /> },
        { title: 'Tambah Produk', href: '/products/add', icon: <Plus className="h-4 w-4" /> },
        { title: 'Kode Produk', href: '/product-codes', icon: <List className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Supplier',
      href: '/suppliers',
      icon: <Users className="h-4 w-4" />,
      children: [
        { title: 'Daftar Supplier', href: '/suppliers', icon: <List className="h-4 w-4" /> },
        { title: 'Tambah Supplier', href: '/suppliers/new', icon: <Plus className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Transaksi',
      href: '/transactions',
      icon: <FileText className="h-4 w-4" />,
      children: [
        { title: 'Daftar Transaksi', href: '/transactions', icon: <List className="h-4 w-4" /> },
        { title: 'Transaksi Baru', href: '/transactions/new', icon: <Plus className="h-4 w-4" /> },
      ],
    },
  ];

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const isActive = (href: string) => {
    // Only match exact paths
    return pathname === href;
  };

  return (
    <div className="w-64 h-screen flex flex-col border-r bg-background">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-foreground">Amanah Store</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => (
          <div key={item.href} className="mb-1">
            <div
              className={cn(
                'flex items-center px-3 py-2 rounded-md text-sm font-medium',
                'transition-colors duration-200 ease-in-out',
                'hover:rounded-md',
                item.children 
                  ? 'cursor-pointer text-foreground hover:bg-accent/80 hover:text-accent-foreground' 
                  : isActive(item.href) 
                    ? 'bg-accent text-accent-foreground font-medium rounded-md' 
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
              )}
              onClick={() => item.children && toggleMenu(item.title.toLowerCase())}
            >
              <span className="mr-3">{item.icon}</span>
              {!item.children ? (
                <Link href={item.href} className="flex-1">
                  {item.title}
                </Link>
              ) : (
                <span className="flex-1">{item.title}</span>
              )}
              {item.children && (
                <span className={cn(
                  'transition-transform duration-200',
                  openMenus[item.title.toLowerCase()] ? 'rotate-90' : ''
                )}>
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
            {item.children && (
              <div 
                className={cn(
                  'transition-all duration-200 ease-in-out overflow-hidden',
                  openMenus[item.title.toLowerCase()] ? 'max-h-96' : 'max-h-0'
                )}
              >
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <div
                      key={child.href}
                      className={cn(
                        'transition-colors duration-200 ease-in-out',
                        'rounded-md hover:rounded-md',
                        isActive(child.href)
                          ? 'bg-accent text-accent-foreground font-medium rounded-md'
                          : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
                      )}
                    >
                      <Link
                        href={child.href}
                        className="flex items-center px-3 py-2 text-sm rounded-md w-full"
                      >
                        <span className="mr-3">{child.icon}</span>
                        {child.title}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="font-medium">Keluar</span>
        </Button>
      </div>
    </div>
  );
}
