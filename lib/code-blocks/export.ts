import type { CodeBlockDependency } from '@/types/code-blocks';

export function isFullDocument(html: string): boolean {
  return /<!doctype\s+html|<html(?:\s|>)/i.test(html);
}

/**
 * A complete block is ONLY a full HTML document (DOCTYPE + <html>).
 * Fragments with embedded <style>/<script> are NOT complete — they need wrapping.
 */
export function isCompleteBlock(html: string): boolean {
  return isFullDocument(html);
}

function dependencyTags(dependencies: CodeBlockDependency[]): string[] {
  return dependencies
    .map((dependency) => dependency.cdnUrl?.trim())
    .filter((url): url is string => Boolean(url))
    .map((url) => `<script src="${url.replace(/"/g, '&quot;')}"></script>`);
}

/** Add configured CDN scripts to a complete document only when not already present. */
export function appendMissingDependencies(html: string, dependencies: CodeBlockDependency[]): string {
  const missing = dependencyTags(dependencies).filter((tag) => {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    return src && !html.includes(src);
  });
  if (!missing.length) return html;
  const scripts = missing.join('\n');
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${scripts}\n</body>`);
  return `${html}\n${scripts}`;
}

export function appendCodeToDocument(
  html: string,
  css: string,
  javascript: string,
  dependencies: CodeBlockDependency[],
): string {
  let result = appendMissingDependencies(html, dependencies);
  const style = css.trim() ? `<style>\n${css}\n</style>` : '';
  const script = javascript.trim() ? `<script>\n${javascript}\n</script>` : '';
  const additions = [style, script].filter(Boolean).join('\n');
  if (!additions) return result;
  if (style && /<\/head\s*>/i.test(result)) {
    result = result.replace(/<\/head\s*>/i, `${style}\n</head>`);
  } else if (style) {
    result = `${style}\n${result}`;
  }
  if (script && /<\/body\s*>/i.test(result)) {
    result = result.replace(/<\/body\s*>/i, `${script}\n</body>`);
  } else if (script) {
    result = `${result}\n${script}`;
  }
  return result;
}

export function blockNamespace(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  return `tilda-${slug || 'block'}`;
}

/**
 * Extract embedded <style> and <script> tags from an HTML fragment.
 * Returns { html, css, javascript } where html has those tags removed.
 */
export function extractEmbeddedCode(html: string): { html: string; css: string; javascript: string } {
  if (isFullDocument(html)) {
    return { html, css: '', javascript: '' };
  }

  let extractedCss = '';
  let extractedJs = '';
  let cleanedHtml = html;

  // Extract all <style> blocks
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styleMatches = [...html.matchAll(styleRegex)];
  if (styleMatches.length > 0) {
    extractedCss = styleMatches.map((m) => m[1]).join('\n\n');
    cleanedHtml = cleanedHtml.replace(styleRegex, '');
  }

  // Extract all <script> blocks (not CDN scripts with src attribute)
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  const scriptMatches = [...cleanedHtml.matchAll(scriptRegex)];
  if (scriptMatches.length > 0) {
    extractedJs = scriptMatches.map((m) => m[1]).join('\n\n');
    cleanedHtml = cleanedHtml.replace(scriptRegex, '');
  }

  return {
    html: cleanedHtml.trim(),
    css: extractedCss.trim(),
    javascript: extractedJs.trim(),
  };
}

export function wrapFragmentExport(
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  dependencies: CodeBlockDependency[],
  namespace: string,
): string {
  const wrappedCss = cssCode
    ? cssCode.replace(/([^{}@][^{}]*?)\s*\{/g, (match, selectors) => {
        if (selectors.trim().startsWith('@')) return match;
        const wrapped = selectors.split(',').map((s: string) => {
          const trimmed = s.trim();
          if (!trimmed || trimmed.startsWith('@') || trimmed === '*' || trimmed === 'body' || trimmed === 'html') return trimmed;
          return `.${namespace} ${trimmed}`;
        }).join(', ');
        return `${wrapped} {`;
      })
    : '';
  const parts: string[] = [];
  const deps = dependencyTags(dependencies);
  if (deps.length) parts.push(deps.join('\n'));
  if (wrappedCss) parts.push(`<style>\n${wrappedCss}\n</style>`);
  parts.push(`<div class="${namespace}">\n${htmlCode}\n</div>`);
  if (jsCode.trim()) parts.push(`<script>\n(function() {\n${jsCode}\n})();\n</script>`);
  return parts.join('\n\n');
}

export function buildExportCode(
  html: string,
  css: string,
  javascript: string,
  dependencies: CodeBlockDependency[],
  blockName: string,
): string {
  // Full document — append separate css/js if provided
  if (isFullDocument(html)) {
    return appendCodeToDocument(html, css, javascript, dependencies);
  }

  // Fragment — extract embedded code and merge with separate fields
  const extracted = extractEmbeddedCode(html);
  const mergedCss = css.trim() || extracted.css;
  const mergedJs = javascript.trim() || extracted.javascript;
  const cleanHtml = extracted.html || html;

  // If nothing was extracted and no separate css/js, return fragment as-is with dependencies
  if (!mergedCss && !mergedJs && !extracted.css && !extracted.javascript) {
    return wrapFragmentExport(html, css, javascript, dependencies, blockNamespace(blockName));
  }

  // Fragment with embedded or separate code — wrap with namespace
  return wrapFragmentExport(cleanHtml, mergedCss, mergedJs, dependencies, blockNamespace(blockName));
}
