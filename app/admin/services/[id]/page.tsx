import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ServiceForm from '../_components/ServiceForm';

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: service, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !service) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Edit Service</h1>
        <p className="text-slate-400">Update service details</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <ServiceForm service={service} />
      </div>
    </>
  );
}
