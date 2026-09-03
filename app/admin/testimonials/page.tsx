import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import TestimonialsList from './_components/TestimonialsList';

export default async function TestimonialsPage() {
  const supabase = await createClient();

  const { data: testimonials, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('order_index', { ascending: true, nullsLast: true });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Testimonials Manager</h1>
          <p className="text-slate-400">Управляйте отзывами клиентов</p>
        </div>
        <Link href="/admin/testimonials/new">
          <Button>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Testimonial
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Ошибка загрузки отзывов: {error.message}
        </div>
      )}

      {!testimonials || testimonials.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#DB9844]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Нет отзывов</h3>
          <p className="text-slate-400 mb-6">
            Начните с добавления первого отзыва
          </p>
          <Link href="/admin/testimonials/new">
            <Button>Добавить первый отзыв</Button>
          </Link>
        </div>
      ) : (
        <TestimonialsList initialTestimonials={testimonials} />
      )}
    </>
  );
}
