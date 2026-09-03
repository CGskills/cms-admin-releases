import { createClient } from '@/lib/supabase/server';
import CodeBlockList from './_components/CodeBlockList';
import { CodeLibraryActions } from './_components/CodeLibraryActions';
import type { CodeBlock } from '@/types/code-blocks';
import { normalizeCodeBlock } from '@/lib/code-blocks/normalize';

function getSupabaseSqlEditorUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return 'https://supabase.com/dashboard';

  try {
    const url = new URL(configuredUrl);
    const hostname = url.hostname;

    // Extract project ref from various Supabase URL formats
    // Handles: projectref.supabase.co, projectref.supabase.net, etc.
    const supabasePattern = /^(.+?)\.supabase\.(co|net|io)$/i;
    const match = hostname.match(supabasePattern);

    if (match && match[1]) {
      const projectRef = match[1];
      // Basic sanity check: non-empty and URL-safe
      if (projectRef.length > 0 && projectRef.length < 100) {
        return `https://supabase.com/dashboard/project/${encodeURIComponent(projectRef)}/sql/new`;
      }
    }

    // Fallback to dashboard home if we can't parse the project ref
    return 'https://supabase.com/dashboard';
  } catch {
    // If URL parsing fails, return safe fallback
    return 'https://supabase.com/dashboard';
  }
}

export default async function CodeLibraryPage() {
  const supabase = await createClient();
  const supabaseSqlEditorUrl = getSupabaseSqlEditorUrl();

  const { data: tableCheck } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'code_blocks')
    .single();

  const isTableMissing = !tableCheck;

  let blocks = null;
  let error = null;
  let normalizedBlocks: CodeBlock[] = [];
  let failedNormalizationCount = 0;

  if (!isTableMissing) {
    const result = await supabase
      .from('code_blocks')
      .select('*')
      .order('updated_at', { ascending: false });
    blocks = result.data;
    error = result.error;

    if (blocks && !error) {
      const originalCount = blocks.length;
      normalizedBlocks = blocks.map(normalizeCodeBlock).filter((block): block is CodeBlock => block !== null);
      failedNormalizationCount = originalCount - normalizedBlocks.length;
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Code Library</h1>
          <p className="text-slate-400">Создавайте и управляйте кодовыми блоками для Tilda</p>
        </div>
        {!isTableMissing && !error && <CodeLibraryActions />}
      </div>

      {isTableMissing && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-yellow-400 font-bold text-lg mb-2">Таблица не найдена</h3>
          <p className="text-yellow-300/80 text-sm mb-4">
            Таблица <code className="bg-slate-800 px-1 rounded">code_blocks</code> ещё не создана в Supabase.
            Выполните следующий SQL в Supabase SQL Editor:
          </p>
          <a
            href={supabaseSqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-4 px-4 py-2 bg-[#DB9844] text-white rounded-lg hover:bg-[#AF5D3E] transition-all text-sm font-medium"
          >
            Открыть Supabase SQL Editor
          </a>
          <pre className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[400px] text-xs text-slate-300 font-mono whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS code_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  javascript TEXT DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'archived')),
  responsive_status TEXT DEFAULT 'unchecked'
    CHECK (responsive_status IN ('unchecked', 'pass', 'warning', 'error')),
  validation_status TEXT DEFAULT 'unchecked'
    CHECK (validation_status IN ('unchecked', 'pass', 'warning', 'error')),
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_blocks_category ON code_blocks(category);
CREATE INDEX IF NOT EXISTS idx_code_blocks_status ON code_blocks(status);
CREATE INDEX IF NOT EXISTS idx_code_blocks_created_at ON code_blocks(created_at DESC);

CREATE OR REPLACE FUNCTION update_code_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_code_blocks_updated_at ON code_blocks;
CREATE TRIGGER trigger_code_blocks_updated_at
  BEFORE UPDATE ON code_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_code_blocks_updated_at();

ALTER TABLE code_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated code_blocks full access" ON code_blocks;
CREATE POLICY "Authenticated code_blocks full access"
  ON code_blocks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "No anonymous code_blocks access" ON code_blocks;
CREATE POLICY "No anonymous code_blocks access"
  ON code_blocks FOR ALL TO anon
  USING (false);`}
          </pre>
        </div>
      )}

      {error && !isTableMissing && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Ошибка загрузки блоков: {error.message}
        </div>
      )}

      {failedNormalizationCount > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-orange-400 font-semibold text-sm mb-1">
                {failedNormalizationCount} {failedNormalizationCount === 1 ? 'блок не загружен' : 'блока не загружены'}
              </h3>
              <p className="text-orange-300/80 text-sm">
                Некоторые блоки не могут быть загружены из-за проблем с данными. Проверьте целостность данных в Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {!error && (!blocks || blocks.length === 0) ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DB9844]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Нет кодовых блоков</h3>
          <p className="text-slate-400 mb-6">
            Создайте первый блок кода для вставки в Tilda или импортируйте примеры
          </p>
        </div>
      ) : !error && blocks ? (
        <CodeBlockList initialBlocks={normalizedBlocks} />
      ) : null}
    </>
  );
}
