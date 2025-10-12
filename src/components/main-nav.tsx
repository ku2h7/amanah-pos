'use client';

import Link from 'next/link';
import { 
  Package2, 
  Package, 
  List, 
  Receipt, 
  Plus, 
  User, 
  Loader2, 
  Hash, 
  Menu, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MainNav() {
  const { user, loading, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Navigation menu data with submenus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    produk: false,
    supplier: false,
    transaksi: false,
  });

  const navMenu = [
    {
      title: 'Produk',
      icon: <Package className="mr-2 h-4 w-4" />,
      items: [
        { href: "/products", icon: <List className="mr-2 h-4 w-4" />, label: "Daftar Produk" },
        { href: "/products/add", icon: <Plus className="mr-2 h-4 w-4" />, label: "Tambah Produk" },
        { href: "/product-codes", icon: <List className="mr-2 h-4 w-4" />, label: "Kode Produk" },
      ]
    },
    {
      title: 'Supplier',
      icon: <Hash className="mr-2 h-4 w-4" />,
      items: [
        { href: "/suppliers", icon: <List className="mr-2 h-4 w-4" />, label: "Daftar Supplier" },
        { href: "/suppliers/new", icon: <Plus className="mr-2 h-4 w-4" />, label: "Tambah Supplier" },
      ]
    },
    {
      title: 'Transaksi',
      icon: <Receipt className="mr-2 h-4 w-4" />,
      items: [
        { href: "/transactions", icon: <List className="mr-2 h-4 w-4" />, label: "Daftar Transaksi" },
        { href: "/transactions/new", icon: <Plus className="mr-2 h-4 w-4" />, label: "Transaksi Baru" },
      ]
    },
  ];

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 justify-between">
        {/* Mobile menu button - shown on mobile, hidden on md and up */}
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
              <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
                <Link 
                  href="/" 
                  className="flex items-center space-x-2"
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
                >
                  <Package2 className="h-6 w-6" />
                  <span className="font-bold text-lg">Amanah Store</span>
                </Link>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Tutup Menu</span>
                  </Button>
                </SheetTrigger>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
                {navMenu.map((menu, index) => (
                  <div key={index} className="mb-1">
                    <motion.button
                      onClick={() => toggleMenu(menu.title.toLowerCase())}
                      className="w-full flex items-center justify-between py-3 px-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center">
                        {menu.icon}
                        {menu.title}
                      </div>
                      {openMenus[menu.title.toLowerCase()] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </motion.button>
                    
                    <AnimatePresence>
                      {openMenus[menu.title.toLowerCase()] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 mt-1 space-y-1">
                            {menu.items.map((item, itemIndex) => (
                              <motion.div
                                key={itemIndex}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * (itemIndex + 1) }}
                              >
                                <Link
                                  href={item.href}
                                  className="flex items-center py-2 px-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm text-muted-foreground"
                                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
                                >
                                  {item.icon}
                                  {item.label}
                                </Link>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                
                {user && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center px-3 py-2 text-sm">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={async () => {
                        setIsLoggingOut(true);
                        await signOut();
                      }}
                      disabled={isLoggingOut}
                      className="w-full flex items-center px-3 py-2 text-sm text-left text-red-600 rounded-md hover:bg-accent hover:text-red-700 transition-colors"
                    >
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging out...
                        </>
                      ) : (
                        'Logout'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo - centered on mobile, left-aligned on desktop */}
        <div className="flex items-center justify-center md:justify-start flex-1 md:flex-none">
          <Link href="/" className="flex items-center space-x-2">
            <Package2 className="h-6 w-6" />
            <span className="font-bold">Amanah Store</span>
          </Link>
        </div>

        {/* Desktop Navigation - hidden on mobile, shown on md and up */}
        <nav className="hidden md:flex items-center space-x-1">
          {navMenu.map((menu, index) => (
            <div key={index} className="relative group">
              <button
                className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => toggleMenu(menu.title.toLowerCase())}
              >
                <div className="flex items-center">
                  {menu.icon}
                  <span className="ml-2">{menu.title}</span>
                </div>
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${openMenus[menu.title.toLowerCase()] ? 'transform rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {openMenus[menu.title.toLowerCase()] && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 mt-1 w-56 origin-top-left rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  >
                    <div className="py-1">
                      {menu.items.map((item, itemIndex) => (
                        <motion.div
                          key={itemIndex}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * itemIndex }}
                        >
                          <Link
                            href={item.href}
                            className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            {item.icon}
                            <span className="ml-2">{item.label}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
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
