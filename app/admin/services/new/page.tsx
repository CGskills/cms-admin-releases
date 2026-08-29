import ServiceForm from '../_components/ServiceForm';

export default function NewServicePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Add New Service</h1>
        <p className="text-slate-400">Create a new service</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <ServiceForm />
      </div>
    </>
  );
}
