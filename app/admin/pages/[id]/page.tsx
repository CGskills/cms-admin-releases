import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PageForm from '../_components/PageForm';

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !page) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Edit Page</h1>
        <p className="text-slate-400">Update page content and settings</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PageForm page={page} />
      </div>
    </>
  );
}
