/**
 * Unified code builder utility
 * Builds complete HTML documents from separated HTML, CSS, JS, and dependencies
 */

export interface BuildDocumentOptions {
  html: string;
  css?: string;
  javascript?: string;
  dependencies?: string[];
}

/**
 * Builds a complete HTML document ready for preview, copy, or export
 *
 * @param options - Document components
 * @returns Complete HTML document string
 */
export function buildFullDocument(options: BuildDocumentOptions): string {
  const { html, css = '', javascript = '', dependencies = [] } = options;

  const parts: string[] = [];

  // DOCTYPE and opening
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="en">');
  parts.push('<head>');
  parts.push('  <meta charset="UTF-8">');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  parts.push('  <title>Code Preview</title>');

  // Inject dependencies in order
  if (dependencies.length > 0) {
    dependencies.forEach(dep => {
      const trimmed = dep.trim();
      if (trimmed) {
        parts.push(`  ${trimmed}`);
      }
    });
  }

  // Inject CSS
  if (css.trim()) {
    parts.push('  <style>');
    parts.push(css);
    parts.push('  </style>');
  }

  parts.push('</head>');
  parts.push('<body>');

  // Inject HTML
  parts.push(html);

  // Inject JavaScript
  if (javascript.trim()) {
    parts.push('  <script>');
    parts.push(javascript);
    parts.push('  </script>');
  }

  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n');
}

/**
 * Alternative entry point matching exact signature from task
 */
export function buildFullDocumentLegacy(
  html: string,
  css: string,
  javascript: string,
  dependencies: string[]
): string {
  return buildFullDocument({ html, css, javascript, dependencies });
}
