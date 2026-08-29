import PageForm from '../_components/PageForm';

export default function NewPagePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Page</h1>
        <p className="text-slate-400">Add a new page to your website</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PageForm />
      </div>
    </>
  );
}
