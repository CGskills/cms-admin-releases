'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/http/fetch-json';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export function CodeLibraryActions() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const { response: res, data } = await fetchJson<{ error?: string; deleted?: number }>(
        '/api/delete-all-code-blocks',
        { method: 'POST' },
      );

      if (!res.ok) {
        setDeleteResult(`Ошибка: ${data.error || `HTTP ${res.status}`}`);
      } else {
        setDeleteResult(`Удалено: ${data.deleted} блоков`);
        window.dispatchEvent(new Event('code-blocks:deleted-all'));
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (err) {
      setDeleteResult(`Ошибка сети: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setShowConfirm(false), 1500);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const { response: res, data } = await fetchJson<{
        error?: string;
        results?: Array<{ success?: boolean; error?: string; action?: string }>;
        summary?: { success: number; errors: number };
      }>('/api/seed-code-blocks', { method: 'POST' });

      if (!res.ok) {
        setImportResult(`Ошибка: ${data.error || `HTTP ${res.status}`}`);
      } else {
        const summary = data.summary;
        if (summary) {
          setImportResult(`Импортировано: ${summary.success}, ошибок: ${summary.errors}`);
        } else {
          const results = data.results || [];
          const successCount = results.filter((r) => !r.error).length;
          const errorCount = results.filter((r) => r.error).length;
          setImportResult(`Импортировано: ${successCount}, ошибок: ${errorCount}`);
        }
        if (summary && summary.success > 0) {
          setTimeout(() => {
            router.refresh();
          }, 500);
        }
      }
    } catch (err) {
      setImportResult(`Ошибка сети: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Удалить все
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Импорт...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Импорт Preview
              </>
            )}
          </button>
          {importResult && (
            <div className="absolute top-full left-0 mt-2 text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 whitespace-nowrap z-10 shadow-lg">
              {importResult}
            </div>
          )}
        </div>

        <Link href="/admin/code-library/new">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новый блок
          </Button>
        </Link>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Удалить все блоки?</h3>
            <p className="text-slate-400 mb-6">
              Все кодовые блоки будут удалены. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить все'}
              </button>
            </div>
            {deleteResult && (
              <div className={`mt-3 text-xs p-3 rounded-lg ${
                deleteResult.includes('Ошибка')
                  ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                  : 'bg-green-500/10 border border-green-500/50 text-green-400'
              }`}>
                {deleteResult}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
