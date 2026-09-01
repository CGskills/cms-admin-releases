'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void
}) {
  useEffect(() => {
    // Log error details for debugging
    console.error('Admin page error:', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white mb-2">
              Не удалось загрузить раздел
            </h2>

            <p className="text-slate-400 mb-4">
              Произошла ошибка при загрузке данных. Попробуйте обновить страницу или проверьте подключение к базе данных.
            </p>

            {isDevelopment && error.message && (
              <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs font-mono text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-slate-500 mt-2">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 bg-[#DB9844] text-white rounded-lg hover:bg-[#c48535] transition-colors font-medium"
              >
                Повторить попытку
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
              >
                Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
