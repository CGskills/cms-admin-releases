'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Re-enter through the server proxy so stale RSC/auth state cannot keep
      // the authenticated shell mounted after the session has been removed.
      window.location.replace('/admin/login');
    } catch {
      window.alert('Не удалось выйти из аккаунта. Попробуйте снова.');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Выход...' : 'Выйти'}
    </button>
  );
}
