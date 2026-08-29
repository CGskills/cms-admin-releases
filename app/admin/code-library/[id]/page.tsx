import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CodeBlockForm from '../_components/CodeBlockForm';
import type { CodeBlock } from '@/types/code-blocks';

export default async function EditCodeBlockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: block, error } = await supabase
    .from('code_blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !block) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Редактировать блок</h1>
        <p className="text-slate-400">
          {block.name} — v{block.version}
        </p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <CodeBlockForm codeBlock={block as CodeBlock} />
      </div>
    </>
  );
}
