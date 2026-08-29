'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import DeletePageButton from './DeletePageButton';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  seo_title: string | null;
  created_at: string;
}

interface PagesListProps {
  initialPages: PageRow[];
}

function EmptyPagesState() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
      <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#DB9844]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No pages yet</h3>
      <p className="text-slate-400 mb-6">Get started by creating your first page</p>
      <Link href="/admin/pages/new">
        <Button>Create Your First Page</Button>
      </Link>
    </div>
  );
}

export default function PagesList({ initialPages }: PagesListProps) {
  const [pages, setPages] = useState(initialPages);

  if (pages.length === 0) {
    return <EmptyPagesState />;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Title</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Slug</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Created</th>
            <th className="text-right py-4 px-6 text-sm font-semibold text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
              <td className="py-4 px-6">
                <div className="font-medium text-white">{page.title}</div>
                {page.seo_title && <div className="text-sm text-slate-400 mt-1">SEO: {page.seo_title}</div>}
              </td>
              <td className="py-4 px-6">
                <code className="text-sm text-[#DB9844] bg-[#DB9844]/10 px-2 py-1 rounded">/{page.slug}</code>
              </td>
              <td className="py-4 px-6 text-slate-400 text-sm">
                {new Date(page.created_at).toLocaleDateString()}
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/admin/pages/${page.id}`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                  <DeletePageButton
                    id={page.id}
                    title={page.title}
                    onDeleted={(id) => setPages((current) => current.filter((item) => item.id !== id))}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
