import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  // Delete all existing blocks first (idempotent)
  await supabase
    .from('code_blocks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

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

  const results = [];

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

      // Store ENTIRE file as-is in html field — no splitting
      const { data: inserted, error } = await supabase.from('code_blocks').insert({
        name: block.name,
        description: block.description,
        category: block.category,
        html: rawContent,
        css: '',
        javascript: '',
        version: '1.0.0',
        status: 'ready',
        dependencies: deps,
      }).select('id, html').single();

      if (error) {
        results.push({ name: block.name, error: error.message });
      } else {
        const storedLen = (inserted?.html || '').length;
        const sourceLen = rawContent.length;
        results.push({
          name: block.name,
          success: true,
          sourceBytes: sourceLen,
          storedChars: storedLen,
          match: storedLen === sourceLen ? 'OK' : `MISMATCH`,
        });
      }
    } catch (e) {
      results.push({
        name: block.name,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results });
}
