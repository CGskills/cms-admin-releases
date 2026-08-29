'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CodeBlockDependency } from '@/types/code-blocks';

interface ExportCodeProps {
  html: string;
  css: string;
  javascript: string;
  dependencies: CodeBlockDependency[];
  blockName: string;
}

function isFullDocument(html: string): boolean {
  return html.includes('<!DOCTYPE') || html.includes('<html');
}

function buildFragmentExport(
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  dependencies: CodeBlockDependency[],
  namespace: string
): string {
  // Wrap CSS selectors in namespace (skip globals like *, body, html, @-rules)
  const wrappedCss = cssCode
    ? cssCode.replace(/([^{}@][^{}]*?)\s*\{/g, (match, selectors) => {
        if (selectors.trim().startsWith('@')) return match;
        const wrapped = selectors
          .split(',')
          .map((s: string) => {
            const trimmed = s.trim();
            if (!trimmed || trimmed.startsWith('@')) return trimmed;
            // Skip global selectors
            if (trimmed === '*' || trimmed === 'body' || trimmed === 'html') return trimmed;
            if (trimmed.startsWith('.') || trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.startsWith(':')) {
              return `.${namespace} ${trimmed}`;
            }
            if (/^[a-z]/i.test(trimmed)) {
              return `.${namespace} ${trimmed}`;
            }
            return trimmed;
          })
          .join(', ');
        return `${wrapped} {`;
      })
    : '';

  // Wrap JS in IIFE
  const wrappedJs = jsCode
    ? `<script>
(function() {
  ${jsCode}
})();
</script>`
    : '';

  // CDN dependencies
  const depScripts = dependencies
    .filter((d) => d.cdnUrl)
    .map((d) => `<script src="${d.cdnUrl}"></script>`)
    .join('\n');

  const parts: string[] = [];

  if (depScripts) {
    parts.push(depScripts);
  }

  if (wrappedCss) {
    parts.push(`<style>\n${wrappedCss}\n</style>`);
  }

  parts.push(`<div class="${namespace}">\n${htmlCode}\n</div>`);

  if (wrappedJs) {
    parts.push(wrappedJs);
  }

  return parts.join('\n\n');
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

  const namespace = useMemo(() => {
    const slug = blockName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20) || 'block';
    return `tilda-${slug}`;
  }, [blockName]);

  const exportCode = useMemo(() => {
    // If css/js fields are empty and html contains style/script tags,
    // it's a full block (imported) — output as-is
    const isFullBlock = !cssCode && !jsCode &&
      (htmlCode.includes('<style') || htmlCode.includes('<script'));

    if (isFullBlock || isFullDoc) {
      return htmlCode;
    }
    return buildFragmentExport(htmlCode, cssCode, jsCode, dependencies, namespace);
  }, [isFullDoc, htmlCode, cssCode, jsCode, dependencies, namespace]);

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
      document.execCommand('copy');
      document.body.removeChild(textarea);
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
