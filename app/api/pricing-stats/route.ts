import { NextResponse } from 'next/server';
import { requireAdminServerContext } from '@/lib/auth/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ADMIN_DIAGNOSTICS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  let context;
  try { context = await requireAdminServerContext(); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Forbidden' }, { status: 403 });
  }
  const supabase = context.supabase;

  // Get all pricing items
  const { data: items, error } = await supabase
    .from('pricing')
    .select('category, name, visible, order_index');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by category
  const categories: Record<string, { total: number; visible: number; hidden: number; names: string[] }> = {};

  for (const item of items || []) {
    const cat = item.category || 'Без категории';
    if (!categories[cat]) {
      categories[cat] = { total: 0, visible: 0, hidden: 0, names: [] };
    }
    categories[cat].total++;
    if (item.visible) {
      categories[cat].visible++;
      categories[cat].names.push(item.name);
    } else {
      categories[cat].hidden++;
    }
  }

  const totalItems = (items || []).length;
  const visibleItems = (items || []).filter((i) => i.visible).length;
  const hiddenItems = totalItems - visibleItems;

  return NextResponse.json({
    summary: { total: totalItems, visible: visibleItems, hidden: hiddenItems },
    categories,
  });
}
