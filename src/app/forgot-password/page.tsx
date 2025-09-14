"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // If we get here, the email was sent successfully
      setEmailSent(true);
      toast.success('Email reset password telah dikirim', {
        description: 'Silakan periksa email Anda untuk petunjuk selanjutnya',
      });
      
      // In development, log the reset link to console
      if (process.env.NODE_ENV === 'development') {
        console.log('Reset password link sent to:', email);
        // The actual reset link will be in the Supabase logs
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Gagal mengirim email reset password', {
        description: 'Pastikan email yang Anda masukkan sudah terdaftar',
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border p-6 shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Email Terkirim</h1>
            <p className="text-muted-foreground">
              Kami telah mengirimkan tautan reset password ke email Anda. Silakan periksa kotak masuk Anda.
            </p>
          </div>
          <div className="mt-4">
            <Button asChild className="w-full">
              <Link href="/login">Kembali ke Halaman Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-6 shadow-md">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Lupa Password</h1>
          <p className="text-muted-foreground">
            Masukkan email Anda untuk mendapatkan tautan reset password
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@contoh.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Ingat password Anda?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
