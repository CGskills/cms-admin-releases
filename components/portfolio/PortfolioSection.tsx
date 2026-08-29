import { createClient } from '@/lib/supabase/server';
import PortfolioGrid from '@/components/portfolio/PortfolioGrid';

export default async function PortfolioSection() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('visible', true)
    .order('order_index', { ascending: true });

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full max-w-[1920px] mx-auto bg-white py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-[1280px] mx-auto">
        <header className="text-center mb-8 md:mb-12">
          <p className="text-[13px] font-extrabold tracking-[0.16em] uppercase text-[#a96418] mb-2.5">
            Portfolio
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#2f2013] tracking-tight mb-3.5">
            Our Work
          </h2>
          <p className="max-w-[560px] mx-auto text-base text-[#755b45] font-medium">
            Real cases before and after — each result is precise work and attention to detail
          </p>
        </header>

        <PortfolioGrid items={items} />
      </div>
    </section>
  );
}
