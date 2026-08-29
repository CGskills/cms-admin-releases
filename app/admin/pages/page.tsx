import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PagesList from './_components/PagesList';

export default async function PagesPage() {
  const supabase = await createClient();

  const { data: pages, error } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pages</h1>
          <p className="text-slate-400">Manage your website pages</p>
        </div>
        <Link href="/admin/pages/new">
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
            Add Page
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Error loading pages: {error.message}
        </div>
      )}

      {!pages || pages.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No pages yet</h3>
          <p className="text-slate-400 mb-6">
            Get started by creating your first page
          </p>
          <Link href="/admin/pages/new">
            <Button>Create Your First Page</Button>
          </Link>
        </div>
      ) : (
        <PagesList initialPages={pages} />
      )}
    </>
  );
}
