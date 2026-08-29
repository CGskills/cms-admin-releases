import { createClient } from '@/lib/supabase/server';
import PricingForm from '../_components/PricingForm';

export default async function NewPricingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pricing')
    .select('category')
    .order('order_index', { ascending: true });

  const categories = [...new Set((data || []).map((i) => i.category))];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Новая услуга</h1>
        <p className="text-slate-400">Добавьте услугу в прайс-лист</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PricingForm categories={categories} />
      </div>
    </>
  );
}
