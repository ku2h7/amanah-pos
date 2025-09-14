import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';

const supabase = createClientComponentClient<Database>();

export async function isUserAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_admin', { user_id: userId })
    .single<boolean>();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data ?? false;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return user;
}
