import CodeBlockForm from '../_components/CodeBlockForm';

export default function NewCodeBlockPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Новый кодовый блок</h1>
        <p className="text-slate-400">Создайте блок HTML/CSS/JS для вставки в Tilda</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <CodeBlockForm />
      </div>
    </>
  );
}
