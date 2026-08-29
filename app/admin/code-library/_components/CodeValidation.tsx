'use client';

import { useState, useCallback } from 'react';

interface ValidationResult {
  type: 'pass' | 'warning' | 'error';
  message: string;
}

interface ResponsiveResult {
  width: number;
  status: 'pass' | 'warning' | 'error';
  issues: string[];
}

interface CodeValidationProps {
  html: string;
  css: string;
  javascript: string;
  onValidationComplete?: (status: 'pass' | 'warning' | 'error') => void;
  onResponsiveComplete?: (status: 'pass' | 'warning' | 'error') => void;
}

const RESPONSIVE_WIDTHS = [320, 375, 390, 768, 834, 1024, 1280, 1440, 1600, 1920, 2560];

export default function CodeValidation({
  html: htmlCode,
  css: cssCode,
  javascript: jsCode,
  onValidationComplete,
  onResponsiveComplete,
}: CodeValidationProps) {
  const [codeResults, setCodeResults] = useState<ValidationResult[]>([]);
  const [responsiveResults, setResponsiveResults] = useState<ResponsiveResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const validateCode = useCallback(() => {
    const results: ValidationResult[] = [];

    // For full documents, extract parts for validation
    const isFullDoc = htmlCode.includes('<!DOCTYPE') || htmlCode.includes('<html');
    const effectiveHtml = htmlCode;
    let effectiveCss = cssCode;
    let effectiveJs = jsCode;

    if (isFullDoc) {
      // Extract CSS from <style> tags in the document
      const cssMatches = htmlCode.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      effectiveCss = cssMatches
        ? cssMatches.map((m) => m.replace(/<\/?style[^>]*>/gi, '')).join('\n')
        : '';

      // Extract inline JS from <script> tags (not external)
      const scriptMatches = htmlCode.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
      effectiveJs = scriptMatches
        ? scriptMatches
            .filter((m) => !m.includes('src='))
            .map((m) => m.replace(/<\/?script[^>]*>/gi, ''))
            .join('\n')
        : '';
    }

    // HTML checks
    if (!effectiveHtml.trim()) {
      results.push({ type: 'warning', message: 'HTML is empty' });
    } else {
      // Unclosed tags
      const openTags = effectiveHtml.match(/<[a-z][a-z0-9]*[^/]*>/gi) || [];
      const closeTags = effectiveHtml.match(/<\/[a-z][a-z0-9]*>/gi) || [];
      if (openTags.length > closeTags.length + 5) {
        results.push({ type: 'warning', message: 'Possible unclosed HTML tags detected' });
      }

      // Duplicate IDs
      const ids = effectiveHtml.match(/id="([^"]+)"/g) || [];
      const idValues = ids.map((m) => m.replace(/id="([^"]+)"/, '$1'));
      const duplicates = idValues.filter((v, i) => idValues.indexOf(v) !== i);
      if (duplicates.length > 0) {
        results.push({ type: 'error', message: `Duplicate IDs found: ${[...new Set(duplicates)].join(', ')}` });
      }

      // Global selectors check
      const globalSelectors = effectiveCss.match(/(?:^|\s)(body|html|\*)\s*\{/g);
      if (globalSelectors) {
        results.push({ type: 'warning', message: 'Global CSS selectors detected (body, html, *). These may conflict with Tilda.' });
      }
    }

    // CSS checks
    if (effectiveCss.trim()) {
      const openBraces = (effectiveCss.match(/\{/g) || []).length;
      const closeBraces = (effectiveCss.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        results.push({ type: 'error', message: `CSS brace mismatch: ${openBraces} opening vs ${closeBraces} closing` });
      }
    }

    // JS checks
    if (effectiveJs.trim()) {
      // eval check
      if (/\beval\s*\(/.test(effectiveJs)) {
        results.push({ type: 'error', message: 'eval() detected — security risk and not allowed' });
      }

      // new Function check
      if (/new\s+Function\s*\(/.test(effectiveJs)) {
        results.push({ type: 'error', message: 'new Function() detected — security risk and not allowed' });
      }

      // Global variable check
      const globalVarMatches = effectiveJs.match(/(?:^|\n)\s*(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
      if (globalVarMatches && !effectiveJs.includes('(function') && !effectiveJs.includes('(()')) {
        results.push({ type: 'warning', message: 'Variables may be in global scope. Consider wrapping in IIFE.' });
      }

      // Basic syntax check (safe, no execution)
      try {
        new Function(effectiveJs);
      } catch (e) {
        results.push({
          type: 'error',
          message: `JavaScript syntax error: ${e instanceof Error ? e.message : 'unknown'}`,
        });
      }
    }

    // Tilda compatibility checks
    if (effectiveHtml.includes('data-reactid') || effectiveHtml.includes('__next')) {
      results.push({ type: 'error', message: 'React/Next.js artifacts detected — not Tilda compatible' });
    }

    if (effectiveJs.includes('import ') && effectiveJs.includes('from ')) {
      results.push({ type: 'error', message: 'ES module imports detected — not compatible with Tilda HTML blocks' });
    }

    if (results.length === 0) {
      results.push({ type: 'pass', message: 'All code validation checks passed' });
    }

    setCodeResults(results);

    const worstType = results.some((r) => r.type === 'error')
      ? 'error'
      : results.some((r) => r.type === 'warning')
        ? 'warning'
        : 'pass';
    onValidationComplete?.(worstType);
  }, [htmlCode, cssCode, jsCode, onValidationComplete]);

  const validateResponsive = useCallback(() => {
    // For full documents, extract CSS for responsive checks
    const isFullDoc = htmlCode.includes('<!DOCTYPE') || htmlCode.includes('<html');
    let effectiveCss = cssCode;
    if (isFullDoc) {
      const cssMatches = htmlCode.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      effectiveCss = cssMatches
        ? cssMatches.map((m) => m.replace(/<\/?style[^>]*>/gi, '')).join('\n')
        : '';
    }

    const results: ResponsiveResult[] = RESPONSIVE_WIDTHS.map((width) => {
      const issues: string[] = [];

      // Check for fixed widths in CSS
      const fixedWidthMatch = effectiveCss.match(/width:\s*(\d+)px/g);
      if (fixedWidthMatch) {
        for (const match of fixedWidthMatch) {
          const px = parseInt(match.replace(/width:\s*/, ''));
          if (px > width && px < 3000) {
            issues.push(`Fixed width ${px}px exceeds ${width}px viewport`);
          }
        }
      }

      // Check for viewport units that might cause issues
      if (effectiveCss.includes('100vw') && width < 768) {
        issues.push('100vw may cause horizontal overflow on mobile');
      }

      // Check for large fixed positioning
      if (/position:\s*fixed/.test(effectiveCss) && width < 768) {
        issues.push('Fixed positioning detected — may overlap content on mobile');
      }

      return {
        width,
        status: issues.length === 0 ? 'pass' : issues.some((i) => i.includes('exceeds')) ? 'error' : 'warning',
        issues,
      };
    });

    setResponsiveResults(results);

    const worstType = results.some((r) => r.status === 'error')
      ? 'error'
      : results.some((r) => r.status === 'warning')
        ? 'warning'
        : 'pass';
    onResponsiveComplete?.(worstType);
  }, [htmlCode, cssCode, onResponsiveComplete]);

  const runAllChecks = useCallback(() => {
    setIsChecking(true);
    validateCode();
    validateResponsive();
    setIsChecking(false);
  }, [validateCode, validateResponsive]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <span className="text-green-400">PASS</span>;
      case 'warning':
        return <span className="text-yellow-400">WARNING</span>;
      case 'error':
        return <span className="text-red-400">ERROR</span>;
      default:
        return <span className="text-slate-500">—</span>;
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={runAllChecks}
        disabled={isChecking}
        className="mb-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all text-sm font-medium disabled:opacity-50"
      >
        {isChecking ? 'Checking...' : 'Run Validation'}
      </button>

      {/* Code validation results */}
      {codeResults.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Code Validation</h4>
          <div className="space-y-1">
            {codeResults.map((result, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-2 rounded-lg ${
                  result.type === 'error'
                    ? 'bg-red-500/10 text-red-400'
                    : result.type === 'warning'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-green-500/10 text-green-400'
                }`}
              >
                {result.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive validation results */}
      {responsiveResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Responsive Check</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {responsiveResults.map((result) => (
              <div
                key={result.width}
                className={`text-xs px-3 py-2 rounded-lg ${
                  result.status === 'error'
                    ? 'bg-red-500/10'
                    : result.status === 'warning'
                      ? 'bg-yellow-500/10'
                      : 'bg-green-500/10'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{result.width}px</span>
                  {getStatusIcon(result.status)}
                </div>
                {result.issues.length > 0 && (
                  <div className="mt-1 text-slate-500 text-[10px]">
                    {result.issues[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
