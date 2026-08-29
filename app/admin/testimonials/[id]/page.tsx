import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TestimonialForm from '../_components/TestimonialForm';
import type { Testimonial } from '@/types/testimonials';

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: testimonial, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !testimonial) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Редактировать отзыв</h1>
        <p className="text-slate-400">Обновите детали отзыва</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <TestimonialForm testimonial={testimonial as Testimonial} />
      </div>
    </>
  );
}
