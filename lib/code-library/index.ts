/**
 * Code Library Parser and Builder
 *
 * Centralized utilities for parsing and building HTML code blocks
 * Used by Code Library preview and export features
 */

export { parseCodeBlockSource } from './parser';
export { buildCodeBlock } from './builder';
export { applyNamespace, generateNamespace } from './namespace';

export type { ParsedCodeBlock, Dependency, BuildOptions } from './types';
