'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CodeBlockDependency } from '@/types/code-blocks';
import { buildExportCode, isFullDocument } from '@/lib/code-blocks/export';

interface ExportCodeProps {
  html: string;
  css: string;
  javascript: string;
  dependencies: CodeBlockDependency[];
  blockName: string;
}

export default function ExportCode({
  html: htmlCode,
  css: cssCode,
  javascript: jsCode,
  dependencies,
  blockName,
}: ExportCodeProps) {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const isFullDoc = useMemo(() => isFullDocument(htmlCode), [htmlCode]);

  const exportCode = useMemo(
    () => buildExportCode(htmlCode, cssCode, jsCode, dependencies, blockName),
    [htmlCode, cssCode, jsCode, dependencies, blockName],
  );

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

  return (
    <div>
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
          onClick={() => setShowExport(!showExport)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium"
        >
          {showExport ? 'Hide Export' : 'Export'}
        </button>
      </div>

      {isFullDoc && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-xs font-medium">
            Это полный HTML-документ. Код включает все зависимости (CDN, шрифты, стили, скрипты).
            Вставьте в Tilda HTML-блок как есть.
          </p>
        </div>
      )}

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
