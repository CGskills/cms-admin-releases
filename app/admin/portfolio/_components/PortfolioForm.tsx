'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createPortfolio, deletePortfolioImageAction, updatePortfolio } from '../actions';
import { extractPathFromUrl } from '@/lib/storage/upload';
import { PortfolioItem, TILE_PRESETS, TileSize } from '@/types/portfolio';
import ImageUploader from './ImageUploader';

// Parse structured description HTML back to parts
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseDescription(html: string): { problem: string; solution: string; result: string } {
  if (!html) return { problem: '', solution: '', result: '' };
  const extract = (label: string): string => {
    const regex = new RegExp(`<strong>${label}:?<\\/strong>\\s*([\\s\\S]*?)(?=<\\/p>|<strong>|$)`, 'i');
    const match = html.match(regex);
    if (match) {
      return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, '').trim());
    }
    return '';
  };
  return {
    problem: extract('Проблема'),
    solution: extract('Решение'),
    result: extract('Результат'),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

// Compose structured HTML from parts
function composeDescription(problem: string, solution: string, result: string): string {
  const parts: string[] = [];
  if (problem.trim()) {
    parts.push(`<p><strong>Проблема:</strong> ${escapeHtml(problem.trim())}</p>`);
  }
  if (solution.trim()) {
    parts.push(`<p><strong>Решение:</strong> ${escapeHtml(solution.trim())}</p>`);
  }
  if (result.trim()) {
    parts.push(`<p><strong>Результат:</strong> ${escapeHtml(result.trim())}</p>`);
  }
  return parts.join('\n');
}

interface PortfolioFormProps {
  project?: PortfolioItem;
}

const sizeLabels: Record<TileSize, string> = {
  '1x1': 'Маленькая',
  '2x1': 'Средняя',
  '2x2': 'Большая',
  '3x1': 'Широкая',
  'full': 'На всю',
};

export default function PortfolioForm({ project }: PortfolioFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Image states
  const [mainImage, setMainImage] = useState(project?.image_url || '');
  const [beforeImage, setBeforeImage] = useState(project?.before_image || '');
  const [afterImage, setAfterImage] = useState(project?.after_image || '');
  const [uploadedImagePaths, setUploadedImagePaths] = useState<string[]>([]);
  const [gallery] = useState<string[]>(project?.gallery || []);

  // Layout states
  const [colSpan, setColSpan] = useState(project?.col_span ?? 6);
  const [tileHeight, setTileHeight] = useState(project?.tile_height ?? 280);

  // Cover states
  const [coverX, setCoverX] = useState(project?.cover_x ?? 50);
  const [coverY, setCoverY] = useState(project?.cover_y ?? 50);
  const [coverZoom, setCoverZoom] = useState(project?.cover_zoom ?? 1);

  // Structured description parts
  const initialParts = parseDescription(project?.description || '');
  const [problem, setProblem] = useState(initialParts.problem);
  const [solution, setSolution] = useState(initialParts.solution);
  const [result, setResult] = useState(initialParts.result);

  // Active preset detection
  const activePreset = (Object.entries(TILE_PRESETS).find(
    ([, p]) => p.colSpan === colSpan && p.height === tileHeight
  )?.[0] ?? null) as TileSize | null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      // Compose structured description from parts
      formData.set('description', composeDescription(problem, solution, result));

      formData.set('image_url', mainImage);
      formData.set('before_image', beforeImage);
      formData.set('after_image', afterImage);
      formData.set('gallery', gallery.join(','));
      formData.set('col_span', String(colSpan));
      formData.set('tile_height', String(tileHeight));
      formData.set('cover_x', String(coverX));
      formData.set('cover_y', String(coverY));
      formData.set('cover_zoom', String(coverZoom));
      formData.set('uploaded_paths', JSON.stringify(uploadedImagePaths));

      if (project) {
        await updatePortfolio(project.id, formData);
      } else {
        await createPortfolio(formData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      // The server action removes temporary uploads when validation or the
      // database mutation fails. Restore the persisted values so a retry
      // cannot submit a URL for an object that has already been rolled back.
      setMainImage(project?.image_url || '');
      setBeforeImage(project?.before_image || '');
      setAfterImage(project?.after_image || '');
      setUploadedImagePaths([]);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (isSubmitting) return;

    const initialPaths = new Set(
      [project?.image_url, project?.before_image, project?.after_image]
        .map((value) => (value ? extractPathFromUrl(value, 'portfolio') : null))
        .filter((value): value is string => Boolean(value)),
    );
    const temporaryPaths = [...new Set(uploadedImagePaths)]
      .filter((path) => !initialPaths.has(path));

    await Promise.allSettled(temporaryPaths.map((path) => deletePortfolioImageAction(path)));
    router.back();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">Основная информация</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Название проекта *"
            name="title"
            defaultValue={project?.title}
            placeholder="Красивый сайт"
            required
            disabled={isSubmitting}
          />

          <Input
            label="URL-адрес (slug)"
            name="slug"
            defaultValue={project?.slug}
            placeholder="krasiviy-sait"
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Подзаголовок"
          name="subtitle"
          defaultValue={project?.subtitle}
          placeholder="Современный веб-дизайн"
          disabled={isSubmitting}
        />
      </div>

      {/* Structured Case Description */}
      <div className="border-t border-slate-700/50 pt-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Описание кейса</h3>
          <p className="text-sm text-slate-400">
            Структурированный формат: Проблема → Решение → Результат
          </p>
        </div>

        <div className="space-y-4">
          <Textarea
            label="Проблема"
            name="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Опишите проблему клиента или задачу проекта. Например: «Разрушение жевательного зуба более чем на 60%. Пациент жаловался на дискомфорт при пережёвывании и эстетический дефект.»"
            rows={4}
            disabled={isSubmitting}
          />

          <Textarea
            label="Решение"
            name="solution"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Как вы решили эту проблему? Какие технологии и подходы использовали. Например: «После санации полости рта и подготовки зуба была установлена металлокерамическая коронка, полностью восстановившая жевательную функцию и эстетику.»"
            rows={4}
            disabled={isSubmitting}
          />

          <Textarea
            label="Результат"
            name="result"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Какого результата достигли? Какие улучшения произошли. Например: «Полное восстановление формы и функции зуба. Пациент вернулся к привычному рациону без дискомфорта.»"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div className="bg-[#DB9844]/10 border border-[#DB9844]/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#DB9844] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-slate-300">
              <p className="font-medium mb-1">Как это будет отображаться:</p>
              <p className="text-slate-400">
                Заполненные поля будут отображаться на сайте с заголовками
                <span className="text-[#DB9844]"> Проблема</span>,
                <span className="text-[#DB9844]"> Решение</span> и
                <span className="text-[#DB9844]"> Результат</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="border-t border-slate-700/50 pt-8 space-y-6">
        <h3 className="text-lg font-semibold text-white">Детали проекта</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Категория"
            name="category"
            defaultValue={project?.category || ''}
            placeholder="Веб-разработка"
            disabled={isSubmitting}
          />

          <Input
            label="Клиент"
            name="client"
            defaultValue={project?.client || ''}
            placeholder="Название компании"
            disabled={isSubmitting}
          />

          <Input
            label="Дата проекта"
            name="project_date"
            type="date"
            defaultValue={project?.project_date || ''}
            disabled={isSubmitting}
          />

          <Input
            label="Ссылка на проект"
            name="project_url"
            type="url"
            defaultValue={project?.project_url || ''}
            placeholder="https://example.com"
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Технологии (через запятую)"
          name="technologies"
          defaultValue={project?.technologies?.join(', ') || ''}
          placeholder="React, TypeScript, Tailwind CSS"
          disabled={isSubmitting}
        />
      </div>

      {/* Images */}
      <div className="border-t border-slate-700/50 pt-8 space-y-6">
        <h3 className="text-lg font-semibold text-white">Изображения</h3>

        <ImageUploader
          label="Основное изображение *"
          value={mainImage}
          onChange={(url, uploadedPath) => {
            setMainImage(url);
            if (uploadedPath) {
              setUploadedImagePaths((paths) => paths.includes(uploadedPath) ? paths : [...paths, uploadedPath]);
            }
          }}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploader
            label="Фото «До»"
            value={beforeImage}
            onChange={(url, uploadedPath) => {
              setBeforeImage(url);
              if (uploadedPath) {
                setUploadedImagePaths((paths) => paths.includes(uploadedPath) ? paths : [...paths, uploadedPath]);
              }
            }}
          />

          <ImageUploader
            label="Фото «После»"
            value={afterImage}
            onChange={(url, uploadedPath) => {
              setAfterImage(url);
              if (uploadedPath) {
                setUploadedImagePaths((paths) => paths.includes(uploadedPath) ? paths : [...paths, uploadedPath]);
              }
            }}
          />
        </div>

        <div className="bg-slate-900/30 border border-slate-700/30 rounded-lg p-4">
          <p className="text-sm text-slate-400">
            <strong className="text-slate-300">До/После:</strong> Добавьте оба изображения для слайдера сравнения на сайте.
          </p>
        </div>
      </div>

      {/* Grid Layout — interactive */}
      <div className="border-t border-slate-700/50 pt-8 space-y-6">
        <h3 className="text-lg font-semibold text-white">Размер плитки</h3>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TILE_PRESETS) as TileSize[]).map((size) => {
            const preset = TILE_PRESETS[size];
            const isActive = activePreset === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setColSpan(preset.colSpan);
                  setTileHeight(preset.height);
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

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ширина в колонках: <span className="text-white font-mono">{colSpan}</span>
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={colSpan}
              onChange={(e) => setColSpan(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
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
              Высота плитки: <span className="text-white font-mono">{tileHeight}px</span>
            </label>
            <input
              type="range"
              min={120}
              max={700}
              step={10}
              value={tileHeight}
              onChange={(e) => setTileHeight(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
            <div className="mt-2 flex items-end">
              <div
                className="w-full bg-[#DB9844]/20 border border-[#DB9844]/40 rounded transition-all"
                style={{ height: `${Math.min(tileHeight / 4, 120)}px` }}
              />
            </div>
          </div>
        </div>

        {/* Hidden inputs for form submission */}
        <input type="hidden" name="col_span" value={colSpan} />
        <input type="hidden" name="tile_height" value={tileHeight} />
      </div>

      {/* Cover Positioning — interactive, always visible */}
      <div className="border-t border-slate-700/50 pt-8 space-y-6">
        <h3 className="text-lg font-semibold text-white">Позиция обложки</h3>
        <p className="text-sm text-slate-400">
          Настройте как изображение отображается на плитке — сдвиньте фокус или увеличьте нужную область.
        </p>

        {/* Live preview */}
        <div className="flex justify-center">
          <div
            className="relative w-full max-w-md bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50"
            style={{ aspectRatio: `${colSpan} / ${Math.round(tileHeight / 100)}` }}
          >
            {mainImage ? (
              <img
                src={mainImage}
                alt="Превью"
                className="w-full h-full object-cover transition-all duration-200"
                style={{
                  objectPosition: `${coverX}% ${coverY}%`,
                  transform: `scale(${coverZoom})`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm min-h-[200px]">
                Загрузите изображение для превью
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
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Позиция X: <span className="text-white font-mono">{coverX}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={coverX}
              onChange={(e) => setCoverX(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Позиция Y: <span className="text-white font-mono">{coverY}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={coverY}
              onChange={(e) => setCoverY(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Увеличение: <span className="text-white font-mono">{coverZoom}x</span>
            </label>
            <input
              type="range"
              min={100}
              max={250}
              step={5}
              value={coverZoom * 100}
              onChange={(e) => setCoverZoom(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#DB9844]"
            />
          </div>
        </div>

        {/* Hidden inputs for form submission */}
        <input type="hidden" name="cover_x" value={coverX} />
        <input type="hidden" name="cover_y" value={coverY} />
        <input type="hidden" name="cover_zoom" value={coverZoom} />
      </div>

      {/* Visibility */}
      <div className="border-t border-slate-700/50 pt-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="visible"
            value="true"
            defaultChecked={project?.visible !== false}
            className="w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-[#DB9844] focus:ring-2 focus:ring-[#DB9844] focus:ring-offset-2 focus:ring-offset-slate-900"
            disabled={isSubmitting}
          />
          <div>
            <span className="text-sm font-medium text-white">Показывать на сайте</span>
            <p className="text-xs text-slate-400">Снимите галочку, чтобы скрыть проект</p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {project ? 'Сохранить изменения' : 'Создать проект'}
        </Button>
      </div>
    </form>
  );
}
