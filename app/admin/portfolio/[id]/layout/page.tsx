import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import QuickLayoutEditor from '../../_components/QuickLayoutEditor';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default async function PortfolioLayoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !item) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Редактор макета</h1>
          <p className="text-slate-400">
            Настройте размер и позицию плитки для «{item.title}»
          </p>
        </div>
        <Link href="/admin/portfolio">
          <Button variant="secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад к сетке
          </Button>
        </Link>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <QuickLayoutEditor item={item} />
      </div>
    </>
  );
}
