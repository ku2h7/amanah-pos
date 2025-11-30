"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoginFormState {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect jika sudah login
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Show loading jika auth masih loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect jika sudah login (fallback)
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // 1. Login dengan Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Email atau password salah");
      }

      // 2. Cek apakah user ada di admin_users
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (adminError || !adminUser) {
        // Logout jika bukan admin
        await supabase.auth.signOut();
        throw new Error("Hanya admin yang bisa login");
      }

      toast.success("Login berhasil!", {
        description: "Selamat datang kembali!",
      });

      // Redirect langsung ke home dengan delay kecil
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan login";
      setError(message);
      toast.error("Login gagal", {
        description: message,
      });
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };  

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Masuk Admin
          </CardTitle>
          <CardDescription className="text-center">
            Masuk ke akun admin untuk mengelola toko
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pb-6">
            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
            <div className="text-center text-sm">
              Belum punya akun?{" "}
              <Link href="/register" className="underline hover:text-primary">
                Daftar di sini
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
