export interface PricingItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  order_index: number;
  visible: boolean;
  features: string;
}

export interface ParsedFeatures {
  slideIndex: number;
  subtitle: string;
  subtitleTitle: string;
  meta: string;
}

export function parseFeatures(f: string): ParsedFeatures {
  try {
    const o = typeof f === 'string' ? JSON.parse(f) : f;
    return {
      slideIndex: o.slideIndex ?? 0,
      subtitle: o.subtitle || '',
      subtitleTitle: o.subtitleTitle || '',
      meta: o.meta || '',
    };
  } catch {
    return { slideIndex: 0, subtitle: '', subtitleTitle: '', meta: '' };
  }
}

export function stringifyFeatures(f: ParsedFeatures): string {
  return JSON.stringify(f);
}

export const UNCATEGORIZED_CATEGORY = 'Без категории';
export const DEFAULT_SUBSECTION = 'Общие';

export type Subs = { [sub: string]: PricingItem[] };
export type Grouped = { [cat: string]: Subs };
