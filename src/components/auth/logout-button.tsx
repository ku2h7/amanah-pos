"use client";

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      Keluar
    </Button>
  );
}
