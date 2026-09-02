/**
 * Normalize legacy code blocks by extracting CSS and JavaScript from HTML
 * into separate properties.
 */

interface CodeBlock {
  html?: string;
  css?: string;
  javascript?: string;
  [key: string]: unknown;
}

/**
 * Extracts CSS content from <style> tags in HTML string.
 * Preserves media queries, keyframes, and all CSS syntax.
 */
function extractCSS(html: string): { css: string; cleanedHtml: string } {
  const cssBlocks: string[] = [];

  // Match <style> tags with content, handling attributes and whitespace
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    const cssContent = match[1].trim();
    if (cssContent) {
      cssBlocks.push(cssContent);
    }
  }

  // Remove all <style> tags from HTML
  const cleanedHtml = html.replace(styleRegex, '').trim();

  return {
    css: cssBlocks.join('\n\n'),
    cleanedHtml
  };
}

/**
 * Extracts JavaScript content from <script> tags in HTML string.
 * Preserves all JavaScript syntax and module attributes.
 */
function extractJavaScript(html: string): { javascript: string; cleanedHtml: string } {
  const jsBlocks: string[] = [];

  // Match <script> tags with content, handling attributes like type="module"
  // Exclude external scripts (those with src attribute)
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const jsContent = match[1].trim();
    if (jsContent) {
      jsBlocks.push(jsContent);
    }
  }

  // Remove inline <script> tags from HTML (keep external scripts)
  const cleanedHtml = html.replace(scriptRegex, '').trim();

  return {
    javascript: jsBlocks.join('\n\n'),
    cleanedHtml
  };
}

/**
 * Normalizes a legacy code block by extracting embedded CSS and JavaScript
 * from HTML into separate properties.
 *
 * Only processes blocks where:
 * - html property exists and is non-empty
 * - css property is empty/missing
 * - javascript property is empty/missing
 * - html contains <style> or <script> tags
 *
 * @param block - The code block to normalize
 * @returns Normalized block with separate html/css/javascript properties
 */
export function normalizeLegacyBlock(block: CodeBlock): CodeBlock {
  // Return as-is if no html property
  if (!block.html || typeof block.html !== 'string') {
    return block;
  }

  // Check if css and javascript are empty/missing
  const cssEmpty = !block.css || block.css.trim() === '';
  const jsEmpty = !block.javascript || block.javascript.trim() === '';

  // If both css and js are already populated, no normalization needed
  if (!cssEmpty && !jsEmpty) {
    return block;
  }

  // Check if html contains style or script tags
  const hasStyleTags = /<style[^>]*>[\s\S]*?<\/style>/i.test(block.html);
  const hasScriptTags = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(block.html);

  // If no tags to extract, return as-is
  if (!hasStyleTags && !hasScriptTags) {
    return block;
  }

  // Extract CSS if needed
  let html = block.html;
  let css = block.css || '';

  if (cssEmpty && hasStyleTags) {
    const extracted = extractCSS(html);
    css = extracted.css;
    html = extracted.cleanedHtml;
  }

  // Extract JavaScript if needed
  let javascript = block.javascript || '';

  if (jsEmpty && hasScriptTags) {
    const extracted = extractJavaScript(html);
    javascript = extracted.javascript;
    html = extracted.cleanedHtml;
  }

  // Return normalized block
  return {
    ...block,
    html,
    css,
    javascript
  };
}
