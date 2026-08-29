import { Database } from './database.types';

export type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row'];
export type PortfolioInsert = Database['public']['Tables']['portfolio_items']['Insert'];
export type PortfolioUpdate = Database['public']['Tables']['portfolio_items']['Update'];

// Tile size presets
export type TileSize = '1x1' | '2x1' | '2x2' | '3x1' | 'full';

export const TILE_PRESETS: Record<TileSize, { colSpan: number; height: number }> = {
  '1x1': { colSpan: 4, height: 280 },
  '2x1': { colSpan: 6, height: 280 },
  '2x2': { colSpan: 6, height: 560 },
  '3x1': { colSpan: 8, height: 280 },
  'full': { colSpan: 12, height: 280 },
};

// Grid размеры (col_span из 12-column grid)
export type GridSize = {
  label: string;
  colSpan: number;
  height: number;
};

export const GRID_SIZES: GridSize[] = [
  { label: 'Маленькая (1x1)', colSpan: 4, height: 280 },
  { label: 'Средняя (2x1)', colSpan: 6, height: 280 },
  { label: 'Большая (2x2)', colSpan: 6, height: 560 },
  { label: 'Широкая (3x1)', colSpan: 8, height: 280 },
  { label: 'Полноразмерная (4x1)', colSpan: 12, height: 280 },
  { label: 'Огромная (4x2)', colSpan: 12, height: 560 },
];

// Для drag & drop
export interface DraggablePortfolioItem extends PortfolioItem {
  isDragging?: boolean;
}

// Upload состояния
export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
}

// Before/After slider
export interface BeforeAfterImages {
  before: string | null;
  after: string | null;
}

// Gallery item
export interface GalleryImage {
  url: string;
  alt?: string;
  order: number;
}
