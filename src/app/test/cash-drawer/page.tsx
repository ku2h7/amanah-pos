import { TestCashDrawer } from "@/components/cash-drawer/TestDrawer";

export default function CashDrawerTestPage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Test Laci Kasir</h1>
      <p className="mb-6 text-gray-700">
        Halaman ini digunakan untuk menguji fungsi buka laci kasir. Pastikan printer terhubung ke komputer Anda.
      </p>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <TestCashDrawer />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400">
        <h2 className="font-semibold text-blue-800">Panduan Koneksi USB:</h2>
        <ol className="list-decimal pl-5 mt-2 text-blue-700 space-y-2">
          <li>Pastikan printer menyala dan terhubung ke komputer via USB</li>
          <li>Gunakan kabel USB yang asli/bawaan printer jika memungkinkan</li>
          <li>Pastikan driver USB printer sudah terinstall di komputer</li>
          <li>Gunakan browser Chrome/Edge versi terbaru</li>
          <li>Jika muncul popup pemilihan port, pilih port yang sesuai dengan printer Anda</li>
          <li>Klik &quot;Connect&quot; atau &quot;Hubungkan&quot; saat diminta izin akses serial</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
          <h3 className="font-medium text-yellow-800">Pemecahan Masalah:</h3>
          <ul className="list-disc pl-5 mt-1 text-yellow-700 space-y-1">
            <li>Coba cabut dan pasang kembali kabel USB</li>
            <li>Restart printer dan komputer jika perlu</li>
            <li>Pastikan tidak ada program lain yang menggunakan printer</li>
            <li>Periksa Device Manager (Windows) atau System Information (Mac) untuk memastikan printer terdeteksi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
