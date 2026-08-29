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

  const { data: blocks, error } = await supabase
    .from('code_blocks')
    .select('id, name, category, status, html, css, javascript, dependencies, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = (blocks || []).map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    status: b.status,
    htmlLength: (b.html || '').length,
    cssLength: (b.css || '').length,
    jsLength: (b.javascript || '').length,
    htmlPreview: (b.html || '').slice(0, 200),
    htmlEnd: (b.html || '').slice(-200),
    hasDoctype: (b.html || '').includes('<!DOCTYPE'),
    hasHtmlTag: (b.html || '').includes('<html'),
    depsCount: Array.isArray(b.dependencies) ? b.dependencies.length : 0,
    created_at: b.created_at,
  }));

  return NextResponse.json({ count: summary.length, blocks: summary });
}
