import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { basename, resolve, relative } from 'path';
import { requireAdminApi } from '@/lib/auth/api';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { blockName, fileName } = body;

  if (!blockName || !fileName) {
    return NextResponse.json({ error: 'blockName and fileName required' }, { status: 400 });
  }

  if (typeof fileName !== 'string' || fileName !== basename(fileName) || !/^[a-zA-Z0-9._-]+\.(html|css|js)$/i.test(fileName)) {
    return NextResponse.json({ error: 'Invalid preview file name' }, { status: 400 });
  }
  const previewRoot = resolve(process.cwd(), 'preview');
  const filePath = resolve(previewRoot, fileName);
  if (!relative(previewRoot, filePath) || relative(previewRoot, filePath).startsWith('..')) {
    return NextResponse.json({ error: 'Invalid preview path' }, { status: 400 });
  }
  let rawContent: string;
  try {
    rawContent = readFileSync(filePath, 'utf-8');
  } catch {
    return NextResponse.json({ error: `File ${fileName} not found` }, { status: 404 });
  }

  // Find existing block by name
  const { data: existing } = await supabase
    .from('code_blocks')
    .select('id')
    .eq('name', blockName)
    .limit(1)
    .single();

  if (!existing) {
    return NextResponse.json({ error: `Block "${blockName}" not found` }, { status: 404 });
  }

  // Extract dependencies
  const deps: { name: string; version?: string; cdnUrl: string }[] = [];
  const scriptSrcMatches = rawContent.match(/<script[^>]+src="([^"]+)"[^>]*>/gi);
  if (scriptSrcMatches) {
    for (const tag of scriptSrcMatches) {
      const urlMatch = tag.match(/src="([^"]+)"/);
      if (urlMatch) {
        const url = urlMatch[1];
        let name = 'External Library';
        let version: string | undefined;
        if (url.includes('supabase')) {
          name = 'Supabase JS';
          const vMatch = url.match(/@([^/]+)/);
          version = vMatch ? vMatch[1] : '2';
        }
        deps.push({ name, version, cdnUrl: url });
      }
    }
  }

  // Bump version
  const { data: current } = await supabase
    .from('code_blocks')
    .select('version')
    .eq('id', existing.id)
    .single();

  const parts = (current?.version || '1.0.0').split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  const newVersion = parts.join('.');

  const { error } = await supabase
    .from('code_blocks')
    .update({
      html: rawContent,
      css: '',
      javascript: '',
      dependencies: deps,
      version: newVersion,
    })
    .eq('id', existing.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    name: blockName,
    version: newVersion,
    htmlChars: rawContent.length,
  });
}
