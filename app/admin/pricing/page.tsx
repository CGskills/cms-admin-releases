import SupabasePricingEditor from './_components/SupabasePricingEditor';
import QueryProvider from './_components/QueryProvider';

export default function PricingPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Прайс-лист</h1>
        <p className="text-slate-400">
          Управляйте категориями, подразделами и услугами. Данные хранятся в Supabase.
        </p>
      </div>

      <QueryProvider>
        <SupabasePricingEditor />
      </QueryProvider>
    </>
  );
}
