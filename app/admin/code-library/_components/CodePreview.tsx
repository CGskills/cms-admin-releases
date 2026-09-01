'use client';

import { useState, useRef, useEffect } from 'react';
import type { CodeBlockDependency } from '@/types/code-blocks';
import { appendCodeToDocument, isFullDocument, extractEmbeddedCode } from '@/lib/code-blocks/export';

interface CodePreviewProps {
  html: string;
  css: string;
  javascript: string;
  dependencies?: CodeBlockDependency[];
}

const BREAKPOINTS = [
  { label: '320px', width: 320 },
  { label: '375px', width: 375 },
  { label: '390px', width: 390 },
  { label: '768px', width: 768 },
  { label: '1024px', width: 1024 },
  { label: '1280px', width: 1280 },
  { label: '1440px', width: 1440 },
  { label: '1920px', width: 1920 },
];

export default function CodePreview({ html: htmlCode, css: cssCode, javascript: jsCode, dependencies = [] }: CodePreviewProps) {
  const [activeBreakpoint, setActiveBreakpoint] = useState(1440);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let fullHtml: string;

    // Check if this is a complete HTML document
    const isFullDoc = isFullDocument(htmlCode);

    if (isFullDoc) {
      // Full document — append css/js if provided
      fullHtml = appendCodeToDocument(htmlCode, cssCode, jsCode, dependencies);
    } else {
      // Fragment — extract embedded styles/scripts and merge with separate css/js fields
      const extracted = extractEmbeddedCode(htmlCode);

      // Merge extracted code with provided css/js (provided takes precedence)
      const mergedCss = cssCode.trim() || extracted.css;
      const mergedJs = jsCode.trim() || extracted.javascript;
      const cleanHtml = extracted.html || htmlCode;

      // Wrap fragment with namespace
      const namespace = 'tilda-preview-block';
      const wrappedCss = mergedCss
        ? mergedCss.replace(/([^{}@][^{}]*?)\s*\{/g, (match, selectors) => {
            if (selectors.trim().startsWith('@')) return match;
            const wrapped = selectors
              .split(',')
              .map((s: string) => {
                const trimmed = s.trim();
                if (!trimmed || trimmed.startsWith('@')) return trimmed;
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

      // Build CDN scripts that aren't already in the HTML
      const cdnScripts = dependencies
        .filter((d) => d.cdnUrl && !htmlCode.includes(d.cdnUrl))
        .map((d) => `<script src="${d.cdnUrl!.replace(/"/g, '&quot;')}"></script>`)
        .join('\n');

      fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cdnScripts}
<style>
.${namespace} { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.5; }
${wrappedCss}
</style>
</head>
<body style="margin:0;padding:0;overflow-x:hidden;">
<div class="${namespace}">
${cleanHtml || '<p style="color:#94a3b8;text-align:center;padding:40px;">No HTML content</p>'}
</div>
<script>
(function() {
  try {
    ${mergedJs || ''}
  } catch(e) {
    console.error('Preview JS error:', e);
  }
})();
</script>
</body>
</html>`;
    }

    iframe.srcdoc = fullHtml;
  }, [htmlCode, cssCode, jsCode, dependencies]);

  return (
    <div>
      {/* Breakpoint selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.width}
            type="button"
            onClick={() => setActiveBreakpoint(bp.width)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeBreakpoint === bp.width
                ? 'bg-[#DB9844] text-white'
                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {bp.label}
          </button>
        ))}
      </div>

      {/* Preview iframe */}
      <div className="bg-white rounded-lg overflow-hidden border border-slate-700/50">
        <div
          className="mx-auto transition-all duration-300"
          style={{ width: `${activeBreakpoint}px`, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            title="Code Preview"
            className="w-full border-0"
            style={{ minHeight: '500px', height: '100%' }}
            // Preview content is user-authored HTML/JS.  Keep scripts useful
            // while denying them the admin page's origin, cookies and DOM.
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
