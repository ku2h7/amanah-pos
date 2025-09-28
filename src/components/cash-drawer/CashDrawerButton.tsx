'use client';

import { Button } from '@/components/ui/button';
import { openCashDrawer } from '@/lib/printer';

export function CashDrawerButton() {
  const handleOpenDrawer = async () => {
    try {
      const success = await openCashDrawer();
      if (success) {
        console.log('Cash drawer opened successfully');
      } else {
        console.error('Failed to open cash drawer');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Button 
      onClick={handleOpenDrawer}
      variant="outline"
      className="w-full"
    >
      Buka Laci Kasir
    </Button>
  );
}
