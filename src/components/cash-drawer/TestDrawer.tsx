'use client';

import { Button } from "@/components/ui/button";
import { openCashDrawer, testCashDrawer } from "@/lib/cash-drawer";
import { toast } from "sonner";

export function TestCashDrawer() {
  const handleTestDrawer = async () => {
    try {
      toast.info("Testing cash drawer...");
      
      // Test dengan XPrinter command
      const success = await testCashDrawer();
      
      if (success) {
        toast.success('Berhasil membuka laci kasir!', {
          description: 'Laci kasir terbuka dengan sukses'
        });
      } else {
        toast.error('Gagal membuka laci kasir', {
          description: 'Pastikan printer terhubung dan driver terinstall'
        });
      }
      
    } catch (error: unknown) {
      console.error('Error testing cash drawer:', error);
      
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        toast.error('Port serial tidak ditemukan', {
          description: 'Pastikan printer terhubung dan pilih port yang benar'
        });
      } else if (error instanceof Error) {
        toast.error('Terjadi kesalahan', {
          description: error.message || 'Lihat console untuk detail'
        });
      } else {
        toast.error('Kesalahan tidak diketahui', {
          description: 'Lihat console untuk detail error'
        });
      }
    }
  };

  const handleTestSerial = async () => {
    try {
      toast.info("Testing dengan Web Serial API...");
      
      const success = await openCashDrawer({ 
        command: 'xprinter',
        timeout: 2000 
      });
      
      if (success) {
        toast.success('Serial API berhasil!');
      } else {
        toast.warning('Serial API gagal, coba method lain');
      }
    } catch (error) {
      console.error('Serial test error:', error);
      toast.error('Serial API error', {
        description: 'Pastikan browser mendukung Web Serial API'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold mb-2">Test Laci Kasir XPrinter</h3>
        <p className="text-sm text-gray-600 mb-4">
          Test pembukaan laci kasir dengan command khusus XPrinter. Metode ini akan mencoba Web Serial API terlebih dahulu, kemudian fallback ke print method.
        </p>
        <Button onClick={handleTestDrawer} className="w-full">
          Test Buka Laci Kasir
        </Button>
      </div>

      <div className="p-4 border rounded-lg bg-blue-50">
        <h3 className="font-semibold mb-2">Test Web Serial API</h3>
        <p className="text-sm text-gray-600 mb-4">
          Test langsung menggunakan Web Serial API (Chrome/Edge). Pastikan browser mendukung Web Serial API.
        </p>
        <Button onClick={handleTestSerial} variant="outline" className="w-full">
          Test Serial API
        </Button>
      </div>

      <div className="p-4 border rounded-lg bg-green-50">
        <h3 className="font-semibold mb-2">Informasi Koneksi</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Printer:</strong> XPrinter (Thermal Printer)</p>
          <p><strong>Koneksi:</strong> USB Serial</p>
          <p><strong>Command:</strong> ESC/POS (0x1B 0x70 0x00 0x3C 0x96)</p>
          <p><strong>Browser:</strong> Chrome/Edge (Web Serial API)</p>
        </div>
      </div>
    </div>
  );
}