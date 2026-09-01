/**
 * Parsed code block structure
 */
export interface ParsedCodeBlock {
  html: string;
  css: string;
  javascript: string;
  dependencies: Dependency[];
}

/**
 * External dependency (CDN resource)
 */
export interface Dependency {
  name?: string;
  cdnUrl: string;
  type: 'css' | 'js' | 'font' | 'unknown';
}

/**
 * Build options for assembling code blocks
 */
export interface BuildOptions {
  html: string;
  css: string;
  javascript: string;
  dependencies: Dependency[];
  format: 'full' | 'tilda-fragment';
  namespace?: string;
}
