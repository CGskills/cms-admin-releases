import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PortfolioForm from '../_components/PortfolioForm';

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Редактировать проект</h1>
        <p className="text-slate-400">Измените данные и макет проекта портфолио</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PortfolioForm project={project} />
      </div>
    </>
  );
}
