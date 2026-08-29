import Link from 'next/link';

export default function AdminNotFound() {
  return <div className="p-8 text-center text-white"><h2 className="text-xl font-semibold">Раздел не найден</h2><Link className="mt-4 inline-block text-[#DB9844]" href="/admin">Вернуться в панель</Link></div>;
}
