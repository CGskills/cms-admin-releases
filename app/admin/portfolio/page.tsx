import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PortfolioGridBuilder from './_components/PortfolioGridBuilder';

export default async function PortfolioPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('order_index', { ascending: true });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Портфолио</h1>
          <p className="text-slate-400">
            Перетаскивайте для изменения порядка, изменяйте размер плиток и управляйте проектами
          </p>
        </div>
        <Link href="/admin/portfolio/new">
          <Button>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Добавить проект
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Ошибка загрузки проектов: {error.message}
        </div>
      )}

      {!projects || projects.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#DB9844]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Пока нет проектов</h3>
          <p className="text-slate-400 mb-6">
            Начните с добавления первого проекта в портфолио
          </p>
          <Link href="/admin/portfolio/new">
            <Button>Добавить первый проект</Button>
          </Link>
        </div>
      ) : (
        <PortfolioGridBuilder initialProjects={projects} />
      )}
    </>
  );
}
