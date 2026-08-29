import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { methodNotAllowed, requireAdminApi } from '@/lib/auth/api';

export async function GET() { return methodNotAllowed(); }
export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  return handleDedup();
}

async function handleDedup() {
  const supabase = await createClient();

  // Fetch all items
  const { data: items, error } = await supabase
    .from('pricing')
    .select('id, name, category, order_index')
    .order('order_index', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'No items', total: 0 });
  }

  // Find duplicates: keep first occurrence (lowest order_index), mark rest for deletion
  const seen = new Set<string>();
  const idsToDelete: string[] = [];

  for (const item of items) {
    const key = `${item.category}|||${item.name}`;
    if (seen.has(key)) {
      idsToDelete.push(item.id);
    } else {
      seen.add(key);
    }
  }

  if (idsToDelete.length === 0) {
    return NextResponse.json({ message: 'No duplicates found', total: items.length });
  }

  // Delete duplicates in batches
  let deleted = 0;
  for (let i = 0; i < idsToDelete.length; i += 50) {
    const batch = idsToDelete.slice(i, i + 50);
    const { error: delError } = await supabase
      .from('pricing')
      .delete()
      .in('id', batch);

    if (delError) {
      return NextResponse.json({
        error: delError.message,
        deletedSoFar: deleted,
        totalToDelete: idsToDelete.length,
      }, { status: 500 });
    }
    deleted += batch.length;
  }

  // Count remaining
  const { count: remaining } = await supabase
    .from('pricing')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    before: items.length,
    deleted,
    remaining: remaining || 0,
  });
}
