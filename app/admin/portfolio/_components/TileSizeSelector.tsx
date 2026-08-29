'use client';

import { TILE_PRESETS, TileSize } from '@/types/portfolio';

interface TileSizeSelectorProps {
  colSpan: number;
  tileHeight: number;
  onColSpanChange: (v: number) => void;
  onTileHeightChange: (v: number) => void;
}

const sizeLabels: Record<TileSize, string> = {
  '1x1': 'Маленькая',
  '2x1': 'Средняя',
  '2x2': 'Большая',
  '3x1': 'Широкая',
  'full': 'На всю ширину',
};

export default function TileSizeSelector({
  colSpan,
  tileHeight,
  onColSpanChange,
  onTileHeightChange,
}: TileSizeSelectorProps) {
  const currentSize = (Object.entries(TILE_PRESETS).find(
    ([, p]) => p.colSpan === colSpan && p.height === tileHeight
  )?.[0] ?? null) as TileSize | null;

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TILE_PRESETS) as TileSize[]).map((size) => {
          const preset = TILE_PRESETS[size];
          const isActive = currentSize === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => {
                onColSpanChange(preset.colSpan);
                onTileHeightChange(preset.height);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#DB9844] text-white shadow-lg shadow-[#DB9844]/25'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {sizeLabels[size]}
              <span className="ml-2 text-xs opacity-70">
                {preset.colSpan}col / {preset.height}px
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ширина в колонках (1-12)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={12}
              value={colSpan}
              onChange={(e) => onColSpanChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
            <span className="text-white font-mono text-sm w-8 text-center">{colSpan}</span>
          </div>
          {/* Visual grid preview */}
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-sm flex-1 transition-colors ${
                  i < colSpan ? 'bg-[#DB9844]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Высота плитки (px)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={120}
              max={700}
              step={10}
              value={tileHeight}
              onChange={(e) => onTileHeightChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
            <span className="text-white font-mono text-sm w-12 text-center">{tileHeight}px</span>
          </div>
          {/* Visual height preview */}
          <div className="mt-2 flex items-end">
            <div
              className="w-full bg-[#DB9844]/20 border border-[#DB9844]/40 rounded transition-all"
              style={{ height: `${Math.min(tileHeight / 4, 120)}px` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
