'use client';

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen p-8 text-center"><h2>Произошла ошибка</h2><button type="button" onClick={reset} className="mt-4 underline">Повторить</button></main>;
}
