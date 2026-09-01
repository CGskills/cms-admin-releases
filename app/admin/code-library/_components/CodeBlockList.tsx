'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteCodeBlockButton from './DeleteCodeBlockButton';
import { duplicateCodeBlock } from '../actions';
import {
  CODE_BLOCK_CATEGORIES,
  type CodeBlock,
  type CodeBlockCategory,
} from '@/types/code-blocks';
import { buildExportCode } from '@/lib/code-blocks/export';

interface CodeBlockListProps {
  initialBlocks: CodeBlock[];
}

export default function CodeBlockList({ initialBlocks }: CodeBlockListProps) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CodeBlockCategory | 'all'>('all');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Server props remain the source of truth (so duplicate/import updates are
  // picked up after router.refresh); hiddenIds only represents deletes that
  // have already been confirmed by the backend during this mounted view.
  const blocks = useMemo(
    () => initialBlocks.filter((block) => !hiddenIds.has(block.id)),
    [initialBlocks, hiddenIds],
  );

  // Delete-all is initiated by a sibling toolbar button, so use a scoped
  // browser event to update this client-owned list immediately after the API
  // confirms success.
  useEffect(() => {
    const handleDeleteAll = () => {
      setHiddenIds((current) => {
        const next = new Set(current);
        initialBlocks.forEach((block) => next.add(block.id));
        return next;
      });
    };
    window.addEventListener('code-blocks:deleted-all', handleDeleteAll);
    return () => window.removeEventListener('code-blocks:deleted-all', handleDeleteAll);
  }, [initialBlocks]);

  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      const matchesSearch =
        !search ||
        block.name.toLowerCase().includes(search.toLowerCase()) ||
        block.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || block.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [blocks, search, categoryFilter]);

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      await duplicateCodeBlock(id);
      router.refresh();
    } catch {
      alert('Не удалось дублировать блок');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleCopyCode = async (block: CodeBlock) => {
    const codeToCopy = buildExportCode(block.html, block.css, block.javascript, block.dependencies || [], block.name);

    try {
      await navigator.clipboard.writeText(codeToCopy);
    } catch {
      // Clipboard API is unavailable in insecure/embedded contexts. Keep the
      // fallback isolated and always clean up the temporary element.
      const textarea = document.createElement('textarea');
      textarea.value = codeToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand('copy')) throw new Error('copy failed');
      } catch {
        alert('Не удалось скопировать код. Выделите его во вкладке Export и скопируйте вручную.');
        return;
      } finally {
        textarea.remove();
      }
    }
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      ready: 'bg-green-500/10 text-green-400 border-green-500/30',
      archived: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };
    return styles[status] || styles.draft;
  };

  const getCategoryLabel = (value: string) => {
    return CODE_BLOCK_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  return (
    <div>
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CodeBlockCategory | 'all')}
          className="px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {CODE_BLOCK_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-400 mb-4">
        {filteredBlocks.length} of {blocks.length} blocks
      </div>

      {/* List */}
      {filteredBlocks.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">
            {search || categoryFilter !== 'all'
              ? 'No blocks match your filters'
              : 'No code blocks yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBlocks.map((block) => (
            <div
              key={block.id}
              className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/admin/code-library/${block.id}`}
                      className="text-white font-medium hover:text-[#DB9844] transition-colors truncate"
                    >
                      {block.name}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatusBadge(block.status)}`}
                    >
                      {block.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-slate-700/50 px-2 py-0.5 rounded">
                      {getCategoryLabel(block.category)}
                    </span>
                    <span>v{block.version}</span>
                    <span>
                      {new Date(block.updated_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {block.description && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{block.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(block)}
                    className={`p-2 rounded-lg transition-all ${
                      copiedId === block.id
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                    title={copiedId === block.id ? 'Copied!' : 'Copy Code'}
                  >
                    {copiedId === block.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(block.id)}
                    disabled={duplicatingId === block.id}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all disabled:opacity-50"
                    title="Duplicate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <Link
                    href={`/admin/code-library/${block.id}`}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <DeleteCodeBlockButton
                    id={block.id}
                    name={block.name}
                    onDeleted={(id) => setHiddenIds((current) => {
                      const next = new Set(current);
                      next.add(id);
                      return next;
                    })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
