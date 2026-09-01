import type { ParsedCodeBlock, Dependency } from './types';

/**
 * Parses HTML content and extracts separate HTML, CSS, JavaScript, and dependencies
 *
 * Supports:
 * - Full HTML documents with <!DOCTYPE html>
 * - HTML fragments
 * - Inline <style> and <script> tags
 * - External dependencies from <link> and <script src>
 * - @import statements in CSS
 * - Preserves complex CSS (@media, @keyframes, CSS variables)
 * - Preserves complex JavaScript (template literals, regex, comments)
 * - Preserves Russian text and comments
 */
export function parseCodeBlockSource(rawContent: string): ParsedCodeBlock {
  const result: ParsedCodeBlock = {
    html: '',
    css: '',
    javascript: '',
    dependencies: []
  };

  if (!rawContent || typeof rawContent !== 'string') {
    return result;
  }

  const content = rawContent.trim();
  const isFullDocument = /^\s*<!DOCTYPE\s+html/i.test(content);

  if (isFullDocument) {
    parseFullDocument(content, result);
  } else {
    parseFragment(content, result);
  }

  return result;
}

/**
 * Parse a full HTML document
 */
function parseFullDocument(content: string, result: ParsedCodeBlock): void {
  // Extract dependencies from <head>
  const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    const headContent = headMatch[1];

    // Extract external stylesheets
    const linkRegex = /<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(headContent)) !== null) {
      const fullTag = linkMatch[0];
      const href = linkMatch[1];

      // Only CSS links
      if (/rel\s*=\s*["']stylesheet["']/i.test(fullTag)) {
        result.dependencies.push({
          cdnUrl: href,
          type: 'css',
          name: extractNameFromUrl(href)
        });
      }
    }

    // Extract inline styles from <head>
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    const styles: string[] = [];
    while ((styleMatch = styleRegex.exec(headContent)) !== null) {
      styles.push(styleMatch[1].trim());
    }
    if (styles.length > 0) {
      result.css = styles.join('\n\n');
    }
  }

  // Extract body content
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];

    // Extract external scripts
    const scriptSrcRegex = /<script\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*><\/script>/gi;
    let scriptSrcMatch;
    while ((scriptSrcMatch = scriptSrcRegex.exec(bodyContent)) !== null) {
      const src = scriptSrcMatch[1];
      result.dependencies.push({
        cdnUrl: src,
        type: 'js',
        name: extractNameFromUrl(src)
      });
      // Remove from body content
      bodyContent = bodyContent.replace(scriptSrcMatch[0], '');
    }

    // Extract inline scripts
    const inlineScriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
    let inlineScriptMatch;
    const scripts: string[] = [];
    while ((inlineScriptMatch = inlineScriptRegex.exec(bodyContent)) !== null) {
      const fullTag = inlineScriptMatch[0];
      // Skip scripts with src attribute (already handled)
      if (!/\ssrc\s*=/i.test(fullTag)) {
        scripts.push(inlineScriptMatch[1].trim());
        // Remove from body content
        bodyContent = bodyContent.replace(fullTag, '');
      }
    }
    if (scripts.length > 0) {
      result.javascript = scripts.join('\n\n');
    }

    result.html = bodyContent.trim();
  }

  // Extract @import from CSS
  if (result.css) {
    extractCssImports(result.css, result.dependencies);
  }
}

/**
 * Parse an HTML fragment (no DOCTYPE)
 */
function parseFragment(content: string, result: ParsedCodeBlock): void {
  let workingContent = content;

  // Extract inline styles
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  const styles: string[] = [];
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    styles.push(styleMatch[1].trim());
    workingContent = workingContent.replace(styleMatch[0], '');
  }
  if (styles.length > 0) {
    result.css = styles.join('\n\n');
  }

  // Extract external stylesheets
  const linkRegex = /<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const fullTag = linkMatch[0];
    const href = linkMatch[1];

    if (/rel\s*=\s*["']stylesheet["']/i.test(fullTag)) {
      result.dependencies.push({
        cdnUrl: href,
        type: 'css',
        name: extractNameFromUrl(href)
      });
      workingContent = workingContent.replace(fullTag, '');
    }
  }

  // Extract external scripts
  const scriptSrcRegex = /<script\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*><\/script>/gi;
  let scriptSrcMatch;
  while ((scriptSrcMatch = scriptSrcRegex.exec(content)) !== null) {
    const src = scriptSrcMatch[1];
    result.dependencies.push({
      cdnUrl: src,
      type: 'js',
      name: extractNameFromUrl(src)
    });
    workingContent = workingContent.replace(scriptSrcMatch[0], '');
  }

  // Extract inline scripts
  const inlineScriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let inlineScriptMatch;
  const scripts: string[] = [];
  while ((inlineScriptMatch = inlineScriptRegex.exec(content)) !== null) {
    const fullTag = inlineScriptMatch[0];
    // Skip scripts with src attribute
    if (!/\ssrc\s*=/i.test(fullTag)) {
      scripts.push(inlineScriptMatch[1].trim());
      workingContent = workingContent.replace(fullTag, '');
    }
  }
  if (scripts.length > 0) {
    result.javascript = scripts.join('\n\n');
  }

  result.html = workingContent.trim();

  // Extract @import from CSS
  if (result.css) {
    extractCssImports(result.css, result.dependencies);
  }
}

/**
 * Extract @import statements from CSS and add to dependencies
 */
function extractCssImports(css: string, dependencies: Dependency[]): void {
  const importRegex = /@import\s+(?:url\s*\(\s*)?["']([^"']+)["']\s*\)?/gi;
  let importMatch;

  while ((importMatch = importRegex.exec(css)) !== null) {
    const url = importMatch[1];

    // Check if not already in dependencies
    if (!dependencies.some(d => d.cdnUrl === url)) {
      dependencies.push({
        cdnUrl: url,
        type: url.includes('fonts.googleapis.com') || url.includes('font') ? 'font' : 'css',
        name: extractNameFromUrl(url)
      });
    }
  }
}

/**
 * Extract a meaningful name from a URL
 */
function extractNameFromUrl(url: string): string {
  try {
    // Handle Google Fonts
    if (url.includes('fonts.googleapis.com')) {
      const match = url.match(/family=([^&:]+)/);
      if (match) {
        return match[1].replace(/\+/g, ' ');
      }
      return 'Google Fonts';
    }

    // Handle CDN libraries
    if (url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com')) {
      const parts = url.split('/');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'npm' && parts[i + 1]) {
          return parts[i + 1].replace('@', '');
        }
        if (parts[i].startsWith('@') && parts[i + 1]) {
          return `${parts[i]}/${parts[i + 1]}`;
        }
      }

      // Try to get filename
      const filename = url.split('/').pop() || '';
      return filename.replace(/\.(js|css|min\.js|min\.css)$/, '');
    }

    // Generic: get filename
    const filename = url.split('/').pop() || url;
    return filename.replace(/\.(js|css|min\.js|min\.css)$/, '');
  } catch {
    return url;
  }
}
