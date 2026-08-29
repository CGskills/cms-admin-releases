import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PricingForm from '../_components/PricingForm';

export default async function EditPricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pricing, error } = await supabase
    .from('pricing')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pricing) {
    notFound();
  }

  const { data: allItems } = await supabase
    .from('pricing')
    .select('category')
    .order('order_index', { ascending: true });

  const categories = [...new Set((allItems || []).map((i) => i.category))];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Редактировать услугу</h1>
        <p className="text-slate-400">Измените данные услуги</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PricingForm pricing={pricing} categories={categories} />
      </div>
    </>
  );
}
