/**
 * Applies a namespace prefix to CSS selectors for scoping
 * Handles complex selectors safely:
 * - @media queries
 * - @keyframes
 * - :pseudo selectors
 * - attribute selectors
 * - CSS variables
 *
 * @param css - CSS content to namespace
 * @param namespace - Namespace identifier (e.g., "tilda-abc123")
 * @returns Namespaced CSS
 */
export function applyNamespace(css: string, namespace: string): string {
  if (!css || !namespace) {
    return css;
  }

  // Split CSS into rules while preserving structure
  const lines = css.split('\n');
  const result: string[] = [];
  let insideAtRule = false;
  let atRuleDepth = 0;
  let buffer = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track @media, @supports, etc.
    if (trimmed.startsWith('@media') || trimmed.startsWith('@supports') || trimmed.startsWith('@container')) {
      insideAtRule = true;
      atRuleDepth = 0;
      result.push(line); // Keep @media/@supports as-is
      continue;
    }

    // Don't namespace @keyframes, @font-face, @import
    if (trimmed.startsWith('@keyframes') || trimmed.startsWith('@font-face') || trimmed.startsWith('@import') || trimmed.startsWith('@charset')) {
      result.push(line);
      continue;
    }

    // Track braces inside @media
    if (insideAtRule) {
      atRuleDepth += (line.match(/{/g) || []).length;
      atRuleDepth -= (line.match(/}/g) || []).length;

      if (atRuleDepth < 0) {
        insideAtRule = false;
        atRuleDepth = 0;
      }
    }

    // Check if this is a selector line (before opening brace)
    if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.endsWith('*/')) {
      // Selector lines typically end with { or continue to next line
      if (trimmed.includes('{') && !trimmed.startsWith('@')) {
        // This line has selector and opening brace
        const parts = line.split('{');
        const selector = parts[0].trim();
        const rest = parts.slice(1).join('{');

        if (selector && !selector.startsWith('@')) {
          const namespacedSelector = namespaceSelector(selector, namespace);
          result.push(`${namespacedSelector} {${rest}`);
          continue;
        }
      } else if (!trimmed.includes('}') && !trimmed.includes(':') && !trimmed.includes(';')) {
        // Might be a multi-line selector
        buffer += ' ' + trimmed;
        continue;
      } else if (buffer) {
        // Complete the buffered selector
        buffer += ' ' + trimmed;
        if (buffer.includes('{')) {
          const parts = buffer.split('{');
          const selector = parts[0].trim();
          const rest = parts.slice(1).join('{');
          const namespacedSelector = namespaceSelector(selector, namespace);
          result.push(`${namespacedSelector} {${rest}`);
          buffer = '';
          continue;
        }
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Namespace a single CSS selector
 */
function namespaceSelector(selector: string, namespace: string): string {
  // Split by comma for multiple selectors
  const selectors = selector.split(',').map(s => s.trim());

  const namespaced = selectors.map(sel => {
    // Skip if already namespaced
    if (sel.includes(`#${namespace}`)) {
      return sel;
    }

    // Handle special selectors
    if (sel.startsWith(':root') || sel.startsWith('html') || sel.startsWith('body')) {
      // Replace with namespace for scoping
      return sel.replace(/^(:root|html|body)/, `#${namespace}`);
    }

    // Handle * universal selector
    if (sel.trim() === '*') {
      return `#${namespace} *`;
    }

    // Handle pseudo-elements and pseudo-classes
    if (sel.startsWith(':')) {
      return `#${namespace}${sel}`;
    }

    // Handle attribute selectors, pseudo-classes, pseudo-elements
    // Complex selector - prepend namespace
    if (sel.includes('[') || sel.includes(':') || sel.includes('+') || sel.includes('>') || sel.includes('~')) {
      // Find the first element/class/id before special characters
      const match = sel.match(/^([.#]?[\w-]+)/);
      if (match) {
        const firstPart = match[1];
        const rest = sel.substring(firstPart.length);
        return `#${namespace} ${firstPart}${rest}`;
      }
      return `#${namespace} ${sel}`;
    }

    // Simple selector (class, id, tag)
    return `#${namespace} ${sel}`;
  });

  return namespaced.join(', ');
}

/**
 * Generate a stable namespace ID from a block ID
 * @param blockId - The code block ID
 * @returns Stable namespace like "tilda-abc12345"
 */
export function generateNamespace(blockId: string): string {
  if (!blockId) {
    return `tilda-${Math.random().toString(36).substring(2, 10)}`;
  }

  // Use first 8 chars of block ID for stability
  const shortId = blockId.slice(0, 8);
  return `tilda-${shortId}`;
}
