"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Akses Ditolak</h1>
        <p className="text-lg text-gray-600 mb-8">
          Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Kembali
          </Button>
          <Button
            onClick={() => router.push('/login')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Login Sebagai Admin
          </Button>
        </div>
      </div>
    </div>
  );
}
