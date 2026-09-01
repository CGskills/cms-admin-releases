'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/http/fetch-json';

export default function ImportPreviewButton() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const { response: res, data } = await fetchJson<{
        error?: string;
        results?: Array<{ success?: boolean; error?: string }>;
      }>('/api/seed-code-blocks', { method: 'POST' });

      if (!res.ok) {
        setResult(`Ошибка: ${data.error || `HTTP ${res.status}`}`);
      } else {
        const results = data.results || [];
        const successCount = results.filter((r) => r.success).length;
        const errorCount = results.filter((r) => r.error).length;
        setResult(`Импортировано: ${successCount}, ошибок: ${errorCount}`);
        if (successCount > 0) {
          router.refresh();
        }
      }
    } catch {
      setResult('Ошибка сети');
    } finally {
      setIsImporting(false);
    }
  };

  return (
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
      {result && (
        <div className="absolute top-full left-0 mt-2 text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 whitespace-nowrap z-10">
          {result}
        </div>
      )}
    </div>
  );
}
