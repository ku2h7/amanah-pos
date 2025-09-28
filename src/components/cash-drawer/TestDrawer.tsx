'use client';

import { Button } from "@/components/ui/button";
import { openCashDrawer } from "@/lib/printer";

export function TestCashDrawer() {
  const handleTestDrawer = async () => {
    try {
      console.log('Testing cash drawer...');
      try {
        const success = await openCashDrawer(2); // Try pin 2 first
        
        if (success) {
          alert('Berhasil membuka laci kasir!');
          return;
        }
      } catch (error) {
        console.log('Error with pin 2:', error);
      }
      
      // If pin 2 fails, try pin 5
      try {
        console.log('Mencoba dengan pin 5...');
        const successPin5 = await openCashDrawer(5);
        
        if (successPin5) {
          alert('Berhasil membuka laci kasir dengan pin 5!');
          return;
        }
      } catch (error) {
        console.log('Error with pin 5:', error);
      }
      
      // If we get here, both attempts failed
      alert('Gagal membuka laci kasir. Pastikan:\n\n1. Printer terhubung ke komputer\n2. Pilih port yang benar saat diminta\n3. Berikan izin akses serial ke browser\n\nLihat console untuk detail error.');
      
    } catch (error: unknown) {
      console.error('Error testing cash drawer:', error);
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        alert('Tidak ada port serial yang dipilih. Pastikan printer terhubung dan pilih port yang benar.');
      } else if (error instanceof Error) {
        alert(`Terjadi kesalahan: ${error.message || 'Lihat console untuk detail error'}`);
      } else {
        alert('Terjadi kesalahan yang tidak diketahui. Lihat console untuk detail error.');
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Test Laci Kasir</h3>
      <p className="text-sm text-gray-600 mb-4">
        Klik tombol di bawah untuk menguji laci kasir. Pastikan printer sudah terhubung ke komputer.
      </p>
      <Button onClick={handleTestDrawer}>
        Buka Laci Kasir
      </Button>
    </div>
  );
}
