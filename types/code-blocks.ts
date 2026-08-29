export type CodeBlockStatus = 'draft' | 'ready' | 'archived';
export type ValidationStatus = 'unchecked' | 'pass' | 'warning' | 'error';

export type CodeBlockCategory =
  | 'hero'
  | 'gallery'
  | 'slider'
  | 'before_after'
  | 'interactive'
  | 'team'
  | 'reviews'
  | 'animation'
  | 'mouse_interaction'
  | 'scroll_animation'
  | 'video'
  | 'custom_ui'
  | 'other';

export const CODE_BLOCK_CATEGORIES: { value: CodeBlockCategory; label: string }[] = [
  { value: 'hero', label: 'Hero' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'slider', label: 'Slider' },
  { value: 'before_after', label: 'Before / After' },
  { value: 'interactive', label: 'Interactive' },
  { value: 'team', label: 'Team' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'animation', label: 'Animation' },
  { value: 'mouse_interaction', label: 'Mouse Interaction' },
  { value: 'scroll_animation', label: 'Scroll Animation' },
  { value: 'video', label: 'Video' },
  { value: 'custom_ui', label: 'Custom UI' },
  { value: 'other', label: 'Other' },
];

export interface CodeBlockDependency {
  name: string;
  version?: string;
  cdnUrl?: string;
}

export interface CodeBlock {
  id: string;
  name: string;
  description: string;
  category: CodeBlockCategory;
  html: string;
  css: string;
  javascript: string;
  version: string;
  status: CodeBlockStatus;
  responsive_status: ValidationStatus;
  validation_status: ValidationStatus;
  dependencies: CodeBlockDependency[];
  created_at: string;
  updated_at: string;
}

export interface CodeBlockFormData {
  name: string;
  description: string;
  category: CodeBlockCategory;
  html: string;
  css: string;
  javascript: string;
  status: CodeBlockStatus;
  dependencies: CodeBlockDependency[];
}
