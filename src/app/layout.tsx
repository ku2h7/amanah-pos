'use client';

import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from 'next/font/google';
import { Toaster } from "sonner"
import "./globals.css";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/sidebar";
import { usePathname, redirect } from 'next/navigation';

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

// Layout for auth pages (login, register, etc.)
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-lg border bg-card text-card-foreground shadow-sm">
        {children}
      </div>
    </div>
  );
}

// Layout for dashboard pages
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto h-screen pb-20 md:pb-0 bg-background">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if current route is auth route
  const isAuthRoute = ['/login', '/register'].includes(pathname);
  
  // If user is not authenticated and not on auth route, redirect to login
  if (!user && !isAuthRoute) {
    redirect('/login');
    return null;
  }

  // If user is authenticated and on auth route, redirect to dashboard
  if (user && isAuthRoute) {
    redirect('/dashboard');
    return null;
  }

  // Use DashboardLayout for authenticated routes, AuthLayout for auth pages
  return isAuthRoute ? (
    <AuthLayout>{children}</AuthLayout>
  ) : (
    <DashboardLayout>{children}</DashboardLayout>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        className={`${inter.className} font-sans antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            <Toaster position="bottom-center" richColors closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
