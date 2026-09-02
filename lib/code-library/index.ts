/**
 * Code Library Parser
 * Extracts HTML, CSS, JavaScript, and dependencies from preview files
 */

export interface Dependency {
  name: string;
  cdnUrl: string;
}

export interface ParsedCodeBlock {
  html: string;
  css: string;
  javascript: string;
  dependencies: Dependency[];
}

/**
 * Parse HTML file and extract separate HTML, CSS, JavaScript sections
 * Handles both full documents and fragments
 */
export function parseCodeBlockSource(rawContent: string): ParsedCodeBlock {
  let html = rawContent;
  let css = '';
  let javascript = '';
  const dependencies: Dependency[] = [];

  // Extract external CSS dependencies
  const linkMatches = rawContent.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi);
  for (const match of linkMatches) {
    const fullTag = match[0];
    const href = match[1];

    // Check if it's a stylesheet
    if (fullTag.toLowerCase().includes('stylesheet') || href.includes('.css')) {
      dependencies.push({
        name: extractNameFromUrl(href),
        cdnUrl: href,
      });
    }
  }

  // Extract external JS dependencies (script src, but not inline scripts)
  const scriptSrcMatches = rawContent.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of scriptSrcMatches) {
    const href = match[1];
    dependencies.push({
      name: extractNameFromUrl(href),
      cdnUrl: href,
    });
  }

  // Extract inline CSS from <style> tags
  const styleMatches = rawContent.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const cssBlocks: string[] = [];
  for (const match of styleMatches) {
    cssBlocks.push(match[1].trim());
  }
  css = cssBlocks.join('\n\n');

  // Extract inline JavaScript from <script> tags (excluding src scripts)
  const scriptMatches = rawContent.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
  const jsBlocks: string[] = [];
  for (const match of scriptMatches) {
    jsBlocks.push(match[1].trim());
  }
  javascript = jsBlocks.join('\n\n');

  // Remove <style> and inline <script> from HTML
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');

  // For full HTML documents, extract body content
  if (html.includes('<!DOCTYPE') || html.match(/<html[^>]*>/i)) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      html = bodyMatch[1].trim();
    }
  }

  // Remove external <script src> and <link> tags from HTML
  html = html.replace(/<script[^>]+src=[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link[^>]*>/gi, '');

  // Remove <!DOCTYPE>, <html>, <head>, </head>, </html> tags
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  html = html.replace(/<html[^>]*>/gi, '');
  html = html.replace(/<\/html>/gi, '');
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Clean up whitespace
  html = html.trim();
  css = css.trim();
  javascript = javascript.trim();

  return {
    html,
    css,
    javascript,
    dependencies,
  };
}

/**
 * Extract a readable name from a CDN URL
 */
function extractNameFromUrl(url: string): string {
  // Handle common CDN patterns
  if (url.includes('supabase')) return 'Supabase JS';
  if (url.includes('fontsource') && url.includes('montserrat')) return 'Montserrat Font';
  if (url.includes('fonts.googleapis.com') && url.includes('montserrat')) return 'Montserrat Font';
  if (url.includes('fonts.googleapis.com')) return 'Google Fonts';

  // Extract from URL path
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  const nameWithoutExt = lastPart.replace(/\.(js|css|min\.js|min\.css)$/i, '');

  // Capitalize first letter
  return nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
}

// Re-export new modules
export { buildFullDocument } from './builder';
export { applyNamespace } from './namespace';
export { normalizeLegacyBlock } from './normalize';
export {
  inferDependencyType,
  dependencyToTag,
  dependenciesToTags,
  type DependencyType
} from './dependencies';
