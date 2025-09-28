"use client";

import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type Product = {
  id: string;
  name: string;
  retail_price: number;
  retail_box_price: number;
  qty_per_box: number;
};

type ProductItem = {
  product: Product;
  quantity: number;
  unit: string;
  price: number;
  subtotal: number;
};

type GroupedItem = {
  unit: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type GroupedProduct = {
  product: {
    id: string;
    name: string;
    qty_per_box: number;
  };
  items: GroupedItem[];
};

type ReceiptProps = {
  items: ProductItem[];
  total: number;
  amountPaid: number;
  change: number;
  customerName: string;
  transactionId: string;
  cashierName?: string;
  date?: Date;
};

const groupItemsByProduct = (items: ProductItem[]): GroupedProduct[] => {
  // First group by product ID
  const groupedByProduct: {[key: string]: ProductItem[]} = {};
  
  items.forEach(item => {
    if (!groupedByProduct[item.product.id]) {
      groupedByProduct[item.product.id] = [];
    }
    groupedByProduct[item.product.id].push(item);
  });

  const result: GroupedProduct[] = [];

  Object.entries(groupedByProduct).forEach(([productId, productItems]) => {
    if (productItems.length === 0) return;

    // Group items by unit
    const units: {[key: string]: {
      quantity: number;
      price: number;
      subtotal: number;
    }} = {};

    productItems.forEach(item => {
      if (!units[item.unit]) {
        units[item.unit] = {
          quantity: 0,
          price: item.price,
          subtotal: 0
        };
      }
      units[item.unit].quantity += item.quantity;
      units[item.unit].subtotal += item.subtotal;
    });

    result.push({
      product: {
        id: productId,
        name: productItems[0].product.name,
        qty_per_box: productItems[0].product.qty_per_box
      },
      items: Object.entries(units).map(([unit, data]) => ({
        unit,
        quantity: data.quantity,
        price: data.price,
        subtotal: data.subtotal
      }))
    });
  });

  return result;
};

export const ReceiptTemplate = ({
  items,
  total,
  amountPaid,
  change,
  customerName,
  transactionId,
  cashierName = 'Admin',
}: ReceiptProps) => {
  const groupedItems = groupItemsByProduct(items);
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'dd/MM/yyyy', { locale: id });
  const formattedTime = format(currentDate, 'HH:mm:ss', { locale: id });

  // Function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="w-full mx-auto font-mono text-[13px] print:p-0 print:max-w-none print:w-[72mm]">
      <div className="text-center mb-2">
        <h1 className="font-bold text-xl">Toko Sembako Amanah</h1>
        <p className="text-[14px]">Jl. Loa Tebu No.6, Rt. 04, Tenggarong</p>
        <p className="text-[14px]">Telp: 081-770-286-333</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-1 my-1">
        <div className="flex justify-between">
          <span>No. Transaksi:</span>
          <span>{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal:</span>
          <span>{formattedDate} {formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{cashierName}</span>
        </div>
        <div className="flex justify-between">
          <span>Pelanggan:</span>
          <span>{customerName || 'Pelanggan Umum'}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 py-1">
        {groupedItems.map((product: GroupedProduct, index: number) => (
          <div key={`${product.product.id}-${index}`} className="mb-1">
            {/* Product Name - Single Line */}
            <div className="font-medium">
              {product.product.name}
            </div>
            
            {/* Render each unit type */}
            {product.items.map((item: GroupedItem, itemIndex: number) => (
              <div key={`${product.product.id}-${item.unit}-${itemIndex}`}>
                <div className="flex justify-between text-gray-600">
                  <span>
                    {item.quantity} {item.unit}
                    {item.unit === 'box' && ` (×${product.product.qty_per_box} pcs)`}
                  </span>
                  <span>
                    @ {formatPrice(item.price)}/{item.unit}
                  </span>
                </div>
                
                {/* Total Price */}
                <div className="text-right font-medium">
                  {formatPrice(item.subtotal)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="py-1">
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar:</span>
          <span>{formatPrice(amountPaid)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed border-gray-400 mt-1 pt-1">
          <span>Kembali:</span>
          <span>{formatPrice(change)}</span>
        </div>
      </div>

      <div className="text-center mt-2 pt-1 border-t border-dashed border-gray-400">
        <p className="text-[12px]">Terima kasih atas kunjungan Anda</p>
        <p className="text-[12px]">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian</p>
      </div>
    </div>
  );
};

export const printReceipt = (element: HTMLElement) => {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;
  
  // Write the receipt content to the iframe
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Pembayaran</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { 
            size: 72mm 297mm;
            margin: 0;
            padding: 0;
          }
          @media print {
            body { 
              width: 72mm;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: 10px;
            }
          }
        </style>
      </head>
      <body class="py-4 font-mono text-xs">
        ${element.outerHTML}
        <script>
          // Automatically print when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Close the window after printing
              setTimeout(function() {
                window.close();
              }, 100);
            }, 100);
          };
        </script>
      </body>
    </html>
  `);
  iframeDoc.close();
  
  // Clean up the iframe after printing
  const cleanup = () => {
    document.body.removeChild(iframe);
  };
  
  // Handle print completion
  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = cleanup;
  } else {
    // Fallback in case onafterprint is not supported
    setTimeout(cleanup, 1000);
  }
};
