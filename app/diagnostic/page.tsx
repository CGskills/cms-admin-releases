import { createClient } from '@/lib/supabase/server';

export default async function DiagnosticPage() {
  const supabase = await createClient();

  // Test all four tables
  const { data: pricing, error: pricingError } = await supabase
    .from('pricing')
    .select('*')
    .limit(3);

  const { data: testimonials, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('*')
    .limit(3);

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .limit(3);

  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolio_items')
    .select('*')
    .limit(3);

  return (
    <div className="p-8 space-y-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold">Supabase Diagnostic</h1>

      <div className="space-y-4">
        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">PRICING</h2>
          {pricingError ? (
            <div className="text-red-400">Error: {pricingError.message}</div>
          ) : (
            <div>
              <div className="text-green-400">✅ Loaded {pricing?.length} records</div>
              {pricing && pricing.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(pricing[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">TESTIMONIALS</h2>
          {testimonialsError ? (
            <div className="text-red-400">Error: {testimonialsError.message}</div>
          ) : (
            <div>
              <div className="text-green-400">✅ Loaded {testimonials?.length} records</div>
              {testimonials && testimonials.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(testimonials[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">EMPLOYEES</h2>
          {employeesError ? (
            <div className="text-red-400">Error: {employeesError.message}</div>
          ) : (
            <div>
              <div className="text-green-400">✅ Loaded {employees?.length} records</div>
              {employees && employees.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(employees[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">PORTFOLIO</h2>
          {portfolioError ? (
            <div className="text-red-400">Error: {portfolioError.message}</div>
          ) : (
            <div>
              <div className="text-green-400">✅ Loaded {portfolio?.length} records</div>
              {portfolio && portfolio.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(portfolio[0], null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
        <h3 className="font-semibold">SUMMARY</h3>
        <ul className="mt-2 space-y-1">
          <li>ПРАЙС: {pricingError ? '❌' : `✅ ${pricing?.length} записей`}</li>
          <li>ОТЗЫВЫ: {testimonialsError ? '❌' : `✅ ${testimonials?.length} записей`}</li>
          <li>СОТРУДНИКИ: {employeesError ? '❌' : `✅ ${employees?.length} записей`}</li>
          <li>ПОРТФОЛИО: {portfolioError ? '❌' : `✅ ${portfolio?.length} записей`}</li>
        </ul>
      </div>
    </div>
  );
}
