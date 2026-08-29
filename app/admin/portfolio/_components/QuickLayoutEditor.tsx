'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import TileSizeSelector from './TileSizeSelector';
import CoverControls from './CoverControls';
import { updatePortfolio } from '../actions';
import { PortfolioItem } from '@/types/portfolio';

interface QuickLayoutEditorProps {
  item: PortfolioItem;
}

export default function QuickLayoutEditor({ item }: QuickLayoutEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [colSpan, setColSpan] = useState(item.col_span || 6);
  const [tileHeight, setTileHeight] = useState(item.tile_height || 280);
  const [coverX, setCoverX] = useState(item.cover_x ?? 50);
  const [coverY, setCoverY] = useState(item.cover_y ?? 50);
  const [coverZoom, setCoverZoom] = useState(item.cover_zoom ?? 1);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('title', item.title);
      formData.set('slug', item.slug);
      formData.set('subtitle', item.subtitle || '');
      formData.set('description', item.description || '');
      formData.set('category', item.category || '');
      formData.set('client', item.client || '');
      formData.set('project_date', item.project_date || '');
      formData.set('project_url', item.project_url || '');
      formData.set('image_url', item.image_url || '');
      formData.set('before_image', item.before_image || '');
      formData.set('after_image', item.after_image || '');
      formData.set('gallery', (item.gallery || []).join(','));
      formData.set('technologies', (item.technologies || []).join(','));
      formData.set('col_span', String(colSpan));
      formData.set('tile_height', String(tileHeight));
      formData.set('cover_x', String(coverX));
      formData.set('cover_y', String(coverY));
      formData.set('cover_zoom', String(coverZoom));
      formData.set('visible', String(item.visible));

      await updatePortfolio(item.id, formData);
      router.push('/admin/portfolio');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Preview */}
      <div className="flex justify-center">
        <div
          className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50 transition-all"
          style={{
            width: `${Math.min(colSpan * 80, 600)}px`,
            height: `${Math.min(tileHeight, 400)}px`,
          }}
        >
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover transition-all duration-200"
              style={{
                objectPosition: `${coverX}% ${coverY}%`,
                transform: `scale(${coverZoom})`,
              }}
            />
          )}
        </div>
      </div>

      {/* Tile Size */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Размер плитки</h3>
        <TileSizeSelector
          colSpan={colSpan}
          tileHeight={tileHeight}
          onColSpanChange={setColSpan}
          onTileHeightChange={setTileHeight}
        />
      </div>

      {/* Cover Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Позиция обложки</h3>
        <CoverControls
          coverX={coverX}
          coverY={coverY}
          coverZoom={coverZoom}
          imageUrl={item.image_url}
          onCoverXChange={setCoverX}
          onCoverYChange={setCoverY}
          onCoverZoomChange={setCoverZoom}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          Отмена
        </Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          Сохранить макет
        </Button>
      </div>
    </div>
  );
}
