import { ThemeProvider } from "@/components/theme-provider"
import { MainNav } from "@/components/main-nav"
import { Inter } from 'next/font/google';
import { Toaster } from "sonner"
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        className={`${inter.className} font-sans antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <MainNav />
            <main className="flex-1">
              <div className="flex-1 space-y-4 p-8 pt-6">
                {children}
              </div>
            </main>
            <Toaster position="top-right" richColors closeButton />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
