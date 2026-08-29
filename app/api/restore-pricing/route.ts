import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { methodNotAllowed, requireAdminApi } from '@/lib/auth/api';

export async function GET() { return methodNotAllowed(); }
export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  return handleRestore();
}

async function handleRestore() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get count of hidden items before restore
  const { count: hiddenBefore } = await supabase
    .from('pricing')
    .select('*', { count: 'exact', head: true })
    .eq('visible', false);

  // Make all pricing items visible
  const { error } = await supabase
    .from('pricing')
    .update({ visible: true })
    .eq('visible', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get total count after restore
  const { count: total } = await supabase
    .from('pricing')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    restored: hiddenBefore || 0,
    total: total || 0,
  });
}
