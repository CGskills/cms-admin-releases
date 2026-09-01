import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TestRunner from './_components/TestRunner';

export default async function TestSaveCyclePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Code Block Save Cycle Test
        </h1>
        <p className="text-slate-400">
          Тестирование полного цикла редактирования и сохранения блоков
        </p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <TestRunner />
      </div>
    </div>
  );
}
