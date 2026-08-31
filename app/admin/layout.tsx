import { requireAdminServerContext } from '@/lib/auth/server';
import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Sidebar from './_components/Sidebar';
import Header from './_components/Header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User;
  try {
    ({ user } = await requireAdminServerContext());
  } catch {
    redirect('/admin/login?error=forbidden');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header user={user} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
