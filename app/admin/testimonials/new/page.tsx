import TestimonialForm from '../_components/TestimonialForm';

export default function NewTestimonialPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Добавить новый отзыв</h1>
        <p className="text-slate-400">Добавьте отзыв клиента</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <TestimonialForm />
      </div>
    </>
  );
}
