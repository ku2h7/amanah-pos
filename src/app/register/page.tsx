"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // Set loading false setelah component mount
  useEffect(() => {
    setIsChecking(false);
  }, []);

  // Cleanup toast saat component unmount
  useEffect(() => {
    return () => {
      toast.dismiss();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftar");
      }

      toast.success("Pendaftaran berhasil!", {
        description: "Silakan login dengan akun Anda.",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat mendaftar";
      setError(errorMessage);
      toast.error("Gagal mendaftar", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Daftar Admin
          </CardTitle>
          <CardDescription className="text-center">
            Buat akun admin baru untuk mengelola toko
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
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
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
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Nomor Telepon (Opsional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Masukkan nomor telepon"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                "Daftar Sekarang"
              )}
            </Button>
            <div className="text-center text-sm">
              Sudah punya akun?{" "}
              <Link href="/login" className="underline hover:text-primary">
                Masuk di sini
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
