import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { methodNotAllowed, requireAdminApi } from '@/lib/auth/api';

export async function GET() { return methodNotAllowed(); }
export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  return handleClear();
}

async function handleClear() {
  const supabase = await createClient();

  // Fetch all IDs
  const { data: items, error: fetchError } = await supabase
    .from('pricing')
    .select('id');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ before: 0, deleted: 0, after: 0 });
  }

  const before = items.length;

  // Delete in batches using .in('id', [...])
  let deleted = 0;
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const { error: delError } = await supabase
      .from('pricing')
      .delete()
      .in('id', batch.map((r) => r.id));

    if (delError) {
      return NextResponse.json({
        error: delError.message,
        deletedSoFar: deleted,
        before,
      }, { status: 500 });
    }
    deleted += batch.length;
  }

  // Count after
  const { count: after } = await supabase
    .from('pricing')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ before, deleted, after: after || 0 });
}
