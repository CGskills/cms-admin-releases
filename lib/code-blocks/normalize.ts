import type {
  CodeBlock,
  CodeBlockCategory,
  CodeBlockDependency,
  CodeBlockStatus,
  ValidationStatus,
} from '@/types/code-blocks';

const categories = new Set<CodeBlockCategory>([
  'hero', 'gallery', 'slider', 'before_after', 'interactive', 'team', 'reviews',
  'animation', 'mouse_interaction', 'scroll_animation', 'video', 'custom_ui', 'other',
]);
const statuses = new Set<CodeBlockStatus>(['draft', 'ready', 'archived']);
const validationStatuses = new Set<ValidationStatus>(['unchecked', 'pass', 'warning', 'error']);

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export function normalizeDependencies(value: unknown): CodeBlockDependency[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CodeBlockDependency[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    const name = text(item.name).trim();
    if (!name) return [];
    const version = text(item.version).trim();
    const cdnUrl = text(item.cdnUrl).trim();
    return [{ name, ...(version ? { version } : {}), ...(cdnUrl ? { cdnUrl } : {}) }];
  });
}

/** Converts nullable/legacy Supabase rows into the stable client contract. */
export function normalizeCodeBlock(value: unknown): CodeBlock | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  if (!id) return null;
  const category = categories.has(row.category as CodeBlockCategory)
    ? row.category as CodeBlockCategory
    : 'other';
  const status = statuses.has(row.status as CodeBlockStatus)
    ? row.status as CodeBlockStatus
    : 'draft';
  const validation_status = validationStatuses.has(row.validation_status as ValidationStatus)
    ? row.validation_status as ValidationStatus
    : 'unchecked';
  const responsive_status = validationStatuses.has(row.responsive_status as ValidationStatus)
    ? row.responsive_status as ValidationStatus
    : 'unchecked';

  return {
    id,
    name: text(row.name) || 'Untitled',
    description: text(row.description),
    category,
    html: text(row.html),
    css: text(row.css),
    javascript: text(row.javascript),
    version: text(row.version) || '1.0.0',
    status,
    responsive_status,
    validation_status,
    dependencies: normalizeDependencies(row.dependencies),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at) || text(row.created_at),
  };
}

