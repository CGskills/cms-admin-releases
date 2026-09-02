import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;

  // Use admin client to bypass RLS
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('code_blocks')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count || 0 });
}
