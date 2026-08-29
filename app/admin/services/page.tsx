import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ServicesList from './_components/ServicesList';

export default async function ServicesPage() {
  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Services</h1>
          <p className="text-slate-400">Manage your services</p>
        </div>
        <Link href="/admin/services/new">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Error loading services: {error.message}
        </div>
      )}

      {!services || services.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DB9844]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No services yet</h3>
          <p className="text-slate-400 mb-6">Get started by adding your first service</p>
          <Link href="/admin/services/new">
            <Button>Add Your First Service</Button>
          </Link>
        </div>
      ) : (
        <ServicesList initialServices={services} />
      )}
    </>
  );
}
