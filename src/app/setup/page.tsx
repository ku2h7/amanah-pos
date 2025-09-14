"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminSetupData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAlreadySetup, setIsAlreadySetup] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState<AdminSetupData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Check if admin is already set up
  useEffect(() => {
    async function checkSetup() {
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true });
      
      setIsAlreadySetup((count || 0) > 0);
    }
    
    checkSetup();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Password tidak cocok');
      }

      if (formData.password.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      // Create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Gagal membuat akun');

      // The trigger will automatically add the user to admin_users table
      // since it's the first user
      
      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // Redirect to dashboard
      router.push('/transactions');
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat setup');
    } finally {
      setLoading(false);
    }
  };

  if (isAlreadySetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Memeriksa status setup...</p>
        </div>
      </div>
    );
  }

  if (isAlreadySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Setup Sudah Dilakukan</h1>
          <p className="mb-4">Admin sudah terdaftar. Silakan login untuk melanjutkan.</p>
          <Button onClick={() => router.push('/login')}>Ke Halaman Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Setup Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Buat akun admin pertama untuk aplikasi
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email admin"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Ketik ulang password"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Menyimpan...' : 'Simpan Admin'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
