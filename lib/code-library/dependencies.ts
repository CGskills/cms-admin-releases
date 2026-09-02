/**
 * Dependency conversion utilities for Code Library
 * Provides consistent dependency type inference and HTML tag generation
 * across Preview, Copy, and Export operations.
 */

import type { CodeBlockDependency } from '@/types/code-blocks';

export type DependencyType = 'css' | 'js' | 'font' | 'unknown';

/**
 * Infer dependency type from CDN URL.
 *
 * Detection rules:
 * - fonts.googleapis.com or fonts.gstatic.com → font
 * - .css extension → css
 * - .js extension → js
 * - default → js (scripts are safer default than stylesheets)
 */
export function inferDependencyType(url: string): DependencyType {
  const lowerUrl = url.toLowerCase();

  // Font detection
  if (lowerUrl.includes('fonts.googleapis.com') || lowerUrl.includes('fonts.gstatic.com')) {
    return 'font';
  }

  // CSS detection
  if (lowerUrl.endsWith('.css')) {
    return 'css';
  }

  // JS detection
  if (lowerUrl.endsWith('.js')) {
    return 'js';
  }

  // Default to JS for unknown types (safer than CSS)
  return 'js';
}

/**
 * Convert a single dependency to HTML tag.
 *
 * @param dependency - Code block dependency
 * @returns HTML tag string or empty string if no URL
 */
export function dependencyToTag(dependency: CodeBlockDependency): string {
  if (!dependency.cdnUrl) {
    return '';
  }

  const type = inferDependencyType(dependency.cdnUrl);

  // CSS and fonts use <link rel="stylesheet">
  if (type === 'css' || type === 'font') {
    return `<link rel="stylesheet" href="${dependency.cdnUrl}">`;
  }

  // JS and unknown types use <script src>
  return `<script src="${dependency.cdnUrl}"></script>`;
}

/**
 * Convert array of dependencies to HTML tags.
 * Filters out dependencies without CDN URLs.
 *
 * @param dependencies - Array of code block dependencies
 * @returns Array of HTML tag strings
 */
export function dependenciesToTags(dependencies: CodeBlockDependency[]): string[] {
  return dependencies
    .filter(d => d.cdnUrl)
    .map(dependencyToTag);
}
