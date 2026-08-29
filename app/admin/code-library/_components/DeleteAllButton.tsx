'use client';

import { useState } from 'react';

export default function DeleteAllButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setResult(null);

    try {
      const res = await fetch('/api/delete-all-code-blocks', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Ошибка: ${data.error}`);
      } else {
        setResult(`Удалено: ${data.deleted} блоков`);
        window.dispatchEvent(new Event('code-blocks:deleted-all'));
      }
    } catch {
      setResult('Ошибка сети');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full">
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
          {result && (
            <div className="mt-3 text-xs text-slate-400">{result}</div>
          )}
        </div>
      </div>
    );
  }

  return (
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
  );
}
