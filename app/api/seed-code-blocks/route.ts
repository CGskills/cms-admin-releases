import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';
import { readFileSync } from 'fs';
import { join, basename } from 'path';
import { parseCodeBlockSource } from '@/lib/code-library';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  const supabase = createAdminClient();

  // Admin client bypasses RLS - no auth check needed

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

  // Support custom preview directory for production deployments
  const previewDir = process.env.PREVIEW_DIR || join(process.cwd(), 'preview');

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

  const results: Array<{
    name: string;
    slug: string;
    sourceFile: string;
    htmlLength?: number;
    cssLength?: number;
    javascriptLength?: number;
    dependenciesCount?: number;
    action?: 'created' | 'updated' | 'skipped';
    error?: string;
  }> = [];

  // Process each block individually with error handling
  for (const block of blocks) {
    const slug = basename(block.file, '.html');
    const resultEntry = {
      name: block.name,
      slug,
      sourceFile: block.file,
    };

    try {
      const filePath = join(previewDir, block.file);
      const rawContent = readFileSync(filePath, 'utf-8');

      // Parse the source file to extract HTML, CSS, JavaScript, and dependencies
      const { html, css, javascript, dependencies } = parseCodeBlockSource(rawContent);

      // Convert dependencies to the format expected by the database
      // Add version field with default 'latest' for consistency
      const deps = dependencies.map(dep => ({
        name: dep.name || '',
        cdnUrl: dep.cdnUrl,
        version: 'latest',
      }));

      // Check if block already exists by slug
      const { data: existingBlock, error: fetchError } = await supabase
        .from('code_blocks')
        .select('id')
        .eq('name', block.name)
        .maybeSingle();

      if (fetchError) {
        results.push({ ...resultEntry, error: fetchError.message });
        continue;
      }

      const blockData = {
        name: block.name,
        description: block.description,
        category: block.category,
        html,
        css,
        javascript,
        dependencies: deps,
        version: '1.0.0',
        status: 'ready',
      };

      if (existingBlock) {
        // Update existing block
        const { error: updateError } = await supabase
          .from('code_blocks')
          .update(blockData)
          .eq('id', existingBlock.id);

        if (updateError) {
          results.push({ ...resultEntry, error: updateError.message });
        } else {
          results.push({
            ...resultEntry,
            htmlLength: html.length,
            cssLength: css.length,
            javascriptLength: javascript.length,
            dependenciesCount: deps.length,
            action: 'updated',
          });
        }
      } else {
        // Insert new block
        const { error: insertError } = await supabase
          .from('code_blocks')
          .insert([blockData]);

        if (insertError) {
          results.push({ ...resultEntry, error: insertError.message });
        } else {
          results.push({
            ...resultEntry,
            htmlLength: html.length,
            cssLength: css.length,
            javascriptLength: javascript.length,
            dependenciesCount: deps.length,
            action: 'created',
          });
        }
      }
    } catch (e) {
      results.push({
        ...resultEntry,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  // Check for errors
  const errors = results.filter(r => r.error);
  const successes = results.filter(r => !r.error);

  const response = {
    results,
    summary: {
      total: blocks.length,
      success: successes.length,
      errors: errors.length,
      created: successes.filter(r => r.action === 'created').length,
      updated: successes.filter(r => r.action === 'updated').length,
    },
  };

  // Return appropriate status code
  if (errors.length > 0 && successes.length === 0) {
    return NextResponse.json({ error: 'Все импорты завершились с ошибками', ...response }, { status: 500 });
  }

  return NextResponse.json(response);
}
