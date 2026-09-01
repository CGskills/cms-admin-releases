'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import CodeEditor from './CodeEditor';
import CodePreview from './CodePreview';
import CodeValidation from './CodeValidation';
import ExportCode from './ExportCode';
import { createCodeBlock, updateCodeBlock } from '../actions';
import {
  CODE_BLOCK_CATEGORIES,
  type CodeBlock,
  type CodeBlockCategory,
  type CodeBlockStatus,
  type CodeBlockDependency,
} from '@/types/code-blocks';

interface CodeBlockFormProps {
  codeBlock?: CodeBlock;
}

type EditorTab = 'html' | 'css' | 'javascript';
type MainTab = 'editor' | 'preview' | 'validation' | 'export';

export default function CodeBlockForm({ codeBlock }: CodeBlockFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(codeBlock?.name || '');
  const [description, setDescription] = useState(codeBlock?.description || '');
  const [category, setCategory] = useState<CodeBlockCategory>(codeBlock?.category || 'other');
  const [status, setStatus] = useState<CodeBlockStatus>(codeBlock?.status || 'draft');
  const [html, setHtml] = useState(codeBlock?.html || '');
  const [css, setCss] = useState(codeBlock?.css || '');
  const [javascript, setJavascript] = useState(codeBlock?.javascript || '');
  const [dependencies, setDependencies] = useState<CodeBlockDependency[]>(
    codeBlock?.dependencies || []
  );

  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('html');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('editor');

  const [validationStatus, setValidationStatus] = useState<string>(codeBlock?.validation_status || 'unchecked');
  const [responsiveStatus, setResponsiveStatus] = useState<string>(codeBlock?.responsive_status || 'unchecked');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('description', description);
      formData.set('category', category);
      formData.set('html', html);
      formData.set('css', css);
      formData.set('javascript', javascript);
      formData.set('status', status);
      formData.set('dependencies', JSON.stringify(dependencies));

      if (codeBlock) {
        await updateCodeBlock(codeBlock.id, formData);
        // updateCodeBlock intentionally stays on the edit page; unlock the
        // editor and refresh the server props so the persisted version is shown.
        setIsSubmitting(false);
        router.refresh();
      } else {
        await createCodeBlock(formData);
      }
    } catch (err: unknown) {
      // Don't catch Next.js redirect errors
      if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const addDependency = () => {
    setDependencies([...dependencies, { name: '', version: '', cdnUrl: '' }]);
  };

  const updateDependency = (index: number, field: keyof CodeBlockDependency, value: string) => {
    const updated = [...dependencies];
    updated[index] = { ...updated[index], [field]: value };
    setDependencies(updated);
  };

  const removeDependency = (index: number) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const editorTabs: { key: EditorTab; label: string }[] = [
    { key: 'html', label: 'HTML' },
    { key: 'css', label: 'CSS' },
    { key: 'javascript', label: 'JavaScript' },
  ];

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: 'editor', label: 'Editor' },
    { key: 'preview', label: 'Preview' },
    { key: 'validation', label: 'Validation' },
    { key: 'export', label: 'Export' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Meta fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hero Section v1"
          required
          disabled={isSubmitting}
        />
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CodeBlockCategory)}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent disabled:opacity-50"
          >
            {CODE_BLOCK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CodeBlockStatus)}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent disabled:opacity-50"
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Version</label>
          <div className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 text-sm">
            {codeBlock?.version || '1.0.0'}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this code block..."
          disabled={isSubmitting}
          rows={2}
          className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DB9844] focus:border-transparent disabled:opacity-50 resize-none"
        />
      </div>

      {/* Dependencies */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">External Dependencies</label>
          <button
            type="button"
            onClick={addDependency}
            className="text-xs text-[#DB9844] hover:text-[#AF5D3E] transition-colors"
          >
            + Add Dependency
          </button>
        </div>
        {dependencies.length > 0 && (
          <div className="space-y-2">
            {dependencies.map((dep, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <input
                  value={dep.name}
                  onChange={(e) => updateDependency(i, 'name', e.target.value)}
                  placeholder="Library name"
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#DB9844]"
                />
                <input
                  value={dep.version || ''}
                  onChange={(e) => updateDependency(i, 'version', e.target.value)}
                  placeholder="Version"
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#DB9844]"
                />
                <input
                  value={dep.cdnUrl || ''}
                  onChange={(e) => updateDependency(i, 'cdnUrl', e.target.value)}
                  placeholder="CDN URL"
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#DB9844]"
                />
                <button
                  type="button"
                  onClick={() => removeDependency(i)}
                  className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs hover:bg-red-600/30 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main tabs */}
      <div className="border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700/50 bg-slate-800/30">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveMainTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeMainTab === tab.key
                  ? 'text-[#DB9844] border-b-2 border-[#DB9844] bg-slate-800/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.key === 'validation' && validationStatus !== 'unchecked' && (
                <span
                  className={`ml-2 inline-block w-2 h-2 rounded-full ${
                    validationStatus === 'pass'
                      ? 'bg-green-400'
                      : validationStatus === 'warning'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                  }`}
                />
              )}
              {tab.key === 'validation' && responsiveStatus !== 'unchecked' && (
                <span
                  className={`ml-1 inline-block w-2 h-2 rounded-full ${
                    responsiveStatus === 'pass'
                      ? 'bg-green-400'
                      : responsiveStatus === 'warning'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Editor tab */}
          {activeMainTab === 'editor' && (
            <div>
              {/* Editor sub-tabs */}
              <div className="flex gap-1 mb-4">
                {editorTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveEditorTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeEditorTab === tab.key
                        ? 'bg-[#DB9844] text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeEditorTab === 'html' && (
                <CodeEditor
                  value={html}
                  onChange={setHtml}
                  language="html"
                  placeholder="<!-- Enter your HTML here -->"
                  disabled={isSubmitting}
                />
              )}
              {activeEditorTab === 'css' && (
                <CodeEditor
                  value={css}
                  onChange={setCss}
                  language="css"
                  placeholder="/* Enter your CSS here */"
                  disabled={isSubmitting}
                />
              )}
              {activeEditorTab === 'javascript' && (
                <CodeEditor
                  value={javascript}
                  onChange={setJavascript}
                  language="javascript"
                  placeholder="// Enter your JavaScript here"
                  disabled={isSubmitting}
                />
              )}
            </div>
          )}

          {/* Preview tab */}
          {activeMainTab === 'preview' && (
            <CodePreview html={html} css={css} javascript={javascript} dependencies={dependencies} />
          )}

          {/* Validation tab */}
          {activeMainTab === 'validation' && (
            <CodeValidation
              html={html}
              css={css}
              javascript={javascript}
              onValidationComplete={setValidationStatus}
              onResponsiveComplete={setResponsiveStatus}
            />
          )}

          {/* Export tab */}
          {activeMainTab === 'export' && (
            <ExportCode
              html={html}
              css={css}
              javascript={javascript}
              dependencies={dependencies}
              blockName={name}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {codeBlock ? 'Сохранить изменения' : 'Создать блок'}
        </Button>
      </div>
    </form>
  );
}
