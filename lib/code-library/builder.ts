import type { BuildOptions } from './types';
import { applyNamespace } from './namespace';

/**
 * Builds a complete HTML code block from separate parts
 *
 * Supports two formats:
 * - 'full': Complete HTML document with <!DOCTYPE html>
 * - 'tilda-fragment': Fragment for Tilda with optional namespace scoping
 */
export function buildCodeBlock(options: BuildOptions): string {
  const { html, css, javascript, dependencies, format, namespace } = options;

  if (format === 'full') {
    return buildFullDocument(html, css, javascript, dependencies);
  } else {
    return buildTildaFragment(html, css, javascript, dependencies, namespace);
  }
}

/**
 * Build a complete HTML document
 */
function buildFullDocument(
  html: string,
  css: string,
  javascript: string,
  dependencies: { cdnUrl: string; type?: string }[]
): string {
  const parts: string[] = [];

  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="ru">');
  parts.push('<head>');
  parts.push('  <meta charset="UTF-8">');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');

  // Add CSS dependencies
  const cssDeps = dependencies.filter(d => d.type === 'css' || d.type === 'font');
  cssDeps.forEach(dep => {
    parts.push(`  <link rel="stylesheet" href="${escapeHtml(dep.cdnUrl)}">`);
  });

  // Add inline CSS
  if (css && css.trim()) {
    parts.push('  <style>');
    parts.push(indentLines(css, 4));
    parts.push('  </style>');
  }

  parts.push('</head>');
  parts.push('<body>');

  // Add HTML content
  if (html && html.trim()) {
    parts.push(indentLines(html, 2));
  }

  // Add JS dependencies
  const jsDeps = dependencies.filter(d => d.type === 'js');
  jsDeps.forEach(dep => {
    parts.push(`  <script src="${escapeHtml(dep.cdnUrl)}"></script>`);
  });

  // Add inline JavaScript
  if (javascript && javascript.trim()) {
    parts.push('  <script>');
    parts.push(indentLines(javascript, 4));
    parts.push('  </script>');
  }

  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n');
}

/**
 * Build a Tilda-compatible fragment
 */
function buildTildaFragment(
  html: string,
  css: string,
  javascript: string,
  dependencies: { cdnUrl: string; type?: string }[],
  namespace?: string
): string {
  const parts: string[] = [];

  // Apply namespace to CSS if provided
  let finalCss = css;
  if (namespace && css && css.trim()) {
    finalCss = applyNamespace(css, namespace);
  }

  // Add inline CSS
  if (finalCss && finalCss.trim()) {
    parts.push('<style>');
    parts.push(finalCss);
    parts.push('</style>');
  }

  // Add CSS dependencies (fonts, stylesheets)
  const cssDeps = dependencies.filter(d => d.type === 'css' || d.type === 'font');
  cssDeps.forEach(dep => {
    parts.push(`<link rel="stylesheet" href="${escapeHtml(dep.cdnUrl)}">`);
  });

  // Wrap HTML with namespace if provided
  if (namespace && html && html.trim()) {
    parts.push(`<div id="${escapeHtml(namespace)}">`);
    parts.push(indentLines(html, 2));
    parts.push('</div>');
  } else if (html && html.trim()) {
    parts.push(html);
  }

  // Add JS dependencies
  const jsDeps = dependencies.filter(d => d.type === 'js');
  jsDeps.forEach(dep => {
    parts.push(`<script src="${escapeHtml(dep.cdnUrl)}"></script>`);
  });

  // Add inline JavaScript
  if (javascript && javascript.trim()) {
    parts.push('<script>');
    parts.push(javascript);
    parts.push('</script>');
  }

  return parts.join('\n');
}

/**
 * Indent lines of text
 */
function indentLines(text: string, spaces: number): string {
  if (!text) return '';

  const indent = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => line ? indent + line : line)
    .join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
