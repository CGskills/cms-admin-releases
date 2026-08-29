import Link from 'next/link';

export default function PublicNotFound() {
  return <main className="min-h-screen p-8 text-center"><h2>Страница не найдена</h2><Link className="underline" href="/">На главную</Link></main>;
}
