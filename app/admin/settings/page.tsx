import { createClient } from '@/lib/supabase/server';
import SettingsForm from './_components/SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Настройки</h1>
        <p className="text-slate-400">Настройте параметры вашего сайта</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <SettingsForm settings={settings} />
      </div>
    </>
  );
}
