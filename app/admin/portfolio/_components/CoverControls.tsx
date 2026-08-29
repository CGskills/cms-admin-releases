'use client';

interface CoverControlsProps {
  coverX: number;
  coverY: number;
  coverZoom: number;
  imageUrl: string;
  onCoverXChange: (v: number) => void;
  onCoverYChange: (v: number) => void;
  onCoverZoomChange: (v: number) => void;
}

export default function CoverControls({
  coverX,
  coverY,
  coverZoom,
  imageUrl,
  onCoverXChange,
  onCoverYChange,
  onCoverZoomChange,
}: CoverControlsProps) {
  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="relative w-full aspect-video max-w-md bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Превью"
            className="w-full h-full object-cover transition-all duration-200"
            style={{
              objectPosition: `${coverX}% ${coverY}%`,
              transform: `scale(${coverZoom})`,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
            Загрузите изображение выше для превью
          </div>
        )}
        {/* Crosshair */}
        <div
          className="absolute w-6 h-6 border-2 border-white/50 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${coverX}%`, top: `${coverY}%` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-white/80 rounded-full" />
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Позиция X: {coverX}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={coverX}
            onChange={(e) => onCoverXChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Позиция Y: {coverY}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={coverY}
            onChange={(e) => onCoverYChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Увеличение: {coverZoom}x
          </label>
          <input
            type="range"
            min={100}
            max={250}
            step={5}
            value={coverZoom * 100}
            onChange={(e) => onCoverZoomChange(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
          />
        </div>
      </div>
    </div>
  );
}
