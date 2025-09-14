"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Check for access token in URL and verify it
  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) throw error;
          
          // Clear tokens from URL
          window.history.replaceState({}, document.title, '/reset-password');
        } catch (err) {
          console.error('Error setting session:', err);
          setError('Link reset password tidak valid atau sudah kedaluwarsa');
          toast.error('Gagal memverifikasi sesi', {
            description: 'Link reset password tidak valid atau sudah kedaluwarsa',
          });
        } finally {
          setVerifying(false);
        }
      } else {
        setVerifying(false);
        
        // If no tokens, check if user is authenticated
        const checkUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setError('Anda harus menggunakan link reset password yang valid');
          }
        };
        checkUser();
      }
    };

    verifyToken();
  }, [searchParams, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (password !== confirmPassword) {
        throw new Error('Password dan konfirmasi password tidak sama');
      }

      if (password.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      // First, get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sesi tidak valid. Silakan minta link reset password baru.');
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Sign out after password reset
      await supabase.auth.signOut();

      toast.success('Password berhasil direset', {
        description: 'Silakan login dengan password baru Anda',
      });
      setSuccess(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mereset password');
      toast.error('Gagal mereset password', {
        description: error || 'Terjadi kesalahan',
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border p-6 text-center">
          <h1 className="text-2xl font-bold">Memverifikasi...</h1>
          <p>Sedang memverifikasi sesi reset password Anda</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border p-6 shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Password Berhasil Direset</h1>
            <p className="text-muted-foreground">
              Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.
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
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Masukkan password baru untuk akun Anda
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">Password Baru</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Memproses...' : 'Reset Password'}
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
