import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error: checkError } = await supabase
    .from('code_blocks')
    .select('id')
    .limit(1);

  if (checkError) {
    return NextResponse.json(
      { error: 'Table code_blocks does not exist. Run the migration first.' },
      { status: 400 }
    );
  }

  const previewDir = join(process.cwd(), 'preview');

  const blocks = [
    {
      name: 'Сотрудники — Карусель',
      description: 'Карусель сотрудников с 3D-эффектом стопки карточек.',
      category: 'team',
      file: 'employees.html',
    },
    {
      name: 'Отзывы — Карусель с QR',
      description: 'Карусель отзывов с QR-кодами и модальным окном.',
      category: 'reviews',
      file: 'reviews.html',
    },
    {
      name: 'Портфолио — До/После',
      description: 'Сетка портфолио с слайдером до/после.',
      category: 'before_after',
      file: 'portfolio.html',
    },
    {
      name: 'Прайс-лист — Таблица',
      description: 'Интерактивная таблица цен с категориями.',
      category: 'custom_ui',
      file: 'tilda-table-block.html',
    },
  ];

  // Read and validate every source before touching the database. This keeps a
  // missing/broken preview file from deleting a user's existing library.
  const rows: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];

  for (const block of blocks) {
    try {
      const filePath = join(previewDir, block.file);
      const rawContent = readFileSync(filePath, 'utf-8');

      // Extract external CDN dependencies for display
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

      // Store the ENTIRE file as-is in html — no lossy HTML/CSS/JS splitting.
      rows.push({
        name: block.name,
        description: block.description,
        category: block.category,
        html: rawContent,
        css: '',
        javascript: '',
        version: '1.0.0',
        status: 'ready',
        dependencies: deps,
      });
      results.push({ name: block.name, sourceBytes: rawContent.length });
    } catch (e) {
      results.push({
        name: block.name,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  const sourceErrors = results.filter((result) => result.error);
  if (sourceErrors.length) {
    return NextResponse.json({ results: sourceErrors }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('code_blocks')
    .select('id');
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  // Insert all rows in one statement. PostgreSQL applies the statement
  // atomically, so a validation/RLS error cannot leave a half-imported set.
  const { data: inserted, error: insertError } = await supabase
    .from('code_blocks')
    .insert(rows)
    .select('id, html');
  if (insertError || !inserted || inserted.length !== rows.length) {
    return NextResponse.json(
      { error: insertError?.message || 'Import did not create all code blocks' },
      { status: 500 },
    );
  }

  const cleanupIds = (existing || []).map((row) => row.id).filter(Boolean);
  let cleanupWarning: string | undefined;
  if (cleanupIds.length) {
    const { error: cleanupError } = await supabase
      .from('code_blocks')
      .delete()
      .in('id', cleanupIds);
    if (cleanupError) cleanupWarning = cleanupError.message;
  }

  const finalResults = results.map((result, index) => {
    const storedChars = typeof inserted[index]?.html === 'string' ? inserted[index].html.length : 0;
    const sourceBytes = typeof result.sourceBytes === 'number' ? result.sourceBytes : 0;
    return {
      ...result,
      success: true,
      storedChars,
      match: storedChars === sourceBytes ? 'OK' : 'MISMATCH',
    };
  });

  return NextResponse.json({ results: finalResults, ...(cleanupWarning ? { warning: cleanupWarning } : {}) });
}
