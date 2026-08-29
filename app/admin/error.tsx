'use client';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 text-center text-white">
      <h2 className="text-xl font-semibold">Не удалось загрузить раздел</h2>
      <p className="mt-2 text-slate-400">Попробуйте обновить страницу.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-[#DB9844] px-4 py-2">Повторить</button>
    </div>
  );
}
