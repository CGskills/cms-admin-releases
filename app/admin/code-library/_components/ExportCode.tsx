'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CodeBlockDependency } from '@/types/code-blocks';
import { buildCodeBlock, generateNamespace } from '@/lib/code-library';
import type { Dependency } from '@/lib/code-library';

interface ExportCodeProps {
  html: string;
  css: string;
  javascript: string;
  dependencies: CodeBlockDependency[];
  blockName: string;
  blockId?: string;
}

type ExportFormat = 'full' | 'tilda-fragment';

export default function ExportCode({
  html: htmlCode,
  css: cssCode,
  javascript: jsCode,
  dependencies,
  blockName,
  blockId,
}: ExportCodeProps) {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('full');

  // Convert CodeBlockDependency to builder Dependency format
  const convertedDeps = useMemo((): Dependency[] => {
    // Infer dependency type from URL
    const inferDependencyType = (url: string): 'css' | 'js' | 'font' | 'unknown' => {
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return 'font';
      if (url.endsWith('.css')) return 'css';
      if (url.endsWith('.js')) return 'js';
      return 'unknown';
    };

    return dependencies.map(dep => ({
      name: dep.name,
      cdnUrl: dep.cdnUrl || '',
      type: inferDependencyType(dep.cdnUrl || '')
    }));
  }, [dependencies]);

  // Generate stable namespace for Tilda format
  const namespace = useMemo(() => {
    return blockId ? generateNamespace(blockId) : generateNamespace(blockName);
  }, [blockId, blockName]);

  // Build export code using unified builder
  const exportCode = useMemo(() => {
    return buildCodeBlock({
      html: htmlCode,
      css: cssCode,
      javascript: jsCode,
      dependencies: convertedDeps,
      format: exportFormat,
      namespace: exportFormat === 'tilda-fragment' ? namespace : undefined
    });
  }, [htmlCode, cssCode, jsCode, convertedDeps, exportFormat, namespace]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = exportCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand('copy')) throw new Error('copy failed');
      } catch {
        alert('Не удалось скопировать код. Выделите его вручную в окне Export.');
        return;
      } finally {
        textarea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [exportCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([exportCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blockName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportCode, blockName]);

  return (
    <div>
      {/* Format selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Export Format</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExportFormat('full')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              exportFormat === 'full'
                ? 'bg-[#DB9844] text-white'
                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Full HTML Document
          </button>
          <button
            type="button"
            onClick={() => setExportFormat('tilda-fragment')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              exportFormat === 'tilda-fragment'
                ? 'bg-[#DB9844] text-white'
                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Tilda Block
          </button>
        </div>
      </div>

      {/* Format info */}
      {exportFormat === 'full' && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-xs font-medium">
            Полный HTML-документ с DOCTYPE. Включает все зависимости, стили и скрипты. Готов к использованию как standalone файл.
          </p>
        </div>
      )}

      {exportFormat === 'tilda-fragment' && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-purple-400 text-xs font-medium mb-1">
            Tilda-фрагмент с namespace: <code className="bg-slate-900 px-1 rounded">{namespace}</code>
          </p>
          <p className="text-purple-300/80 text-xs">
            CSS автоматически изолирован. Вставьте код в HTML-блок Tilda.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 bg-[#DB9844] text-white rounded-lg hover:bg-[#AF5D3E] transition-all text-sm font-medium"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
        >
          Download HTML
        </button>
        <button
          type="button"
          onClick={() => setShowExport(!showExport)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium"
        >
          {showExport ? 'Hide Code' : 'Show Code'}
        </button>
      </div>

      {/* Dependencies info */}
      {dependencies.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs font-medium mb-1">External Dependencies:</p>
          <ul className="text-yellow-300/80 text-xs space-y-1">
            {dependencies.map((dep, i) => (
              <li key={i}>
                {dep.name} {dep.version && `v${dep.version}`}
                {dep.cdnUrl && (
                  <span className="text-slate-500 ml-1 break-all">({dep.cdnUrl})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Code preview */}
      {showExport && (
        <div className="relative">
          <pre className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[500px] text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
            {exportCode}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-2 px-3 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-all"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
