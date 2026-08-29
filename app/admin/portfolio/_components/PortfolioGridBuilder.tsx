'use client';

import { useState } from 'react';
import { PortfolioItem } from '@/types/portfolio';
import PortfolioTile from './PortfolioTile';
import QuickAddPortfolio from './QuickAddPortfolio';
import Button from '@/components/ui/Button';
import { updatePortfolioOrder } from '../actions';

interface PortfolioGridBuilderProps {
  initialProjects: PortfolioItem[];
}

// Keep responsive width classes statically discoverable by Tailwind. The
// inline gridColumn style below remains the source of truth for arbitrary
// values returned by the database, while this map provides the responsive
// fallback for the supported 12-column presets.
const RESPONSIVE_COL_SPAN_CLASSES: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
};

export default function PortfolioGridBuilder({
  initialProjects,
}: PortfolioGridBuilderProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (isSaving || !draggedItem || draggedItem === targetId) return;

    const draggedIndex = projects.findIndex((p) => p.id === draggedItem);
    const targetIndex = projects.findIndex((p) => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array. Keep an immutable snapshot for a reliable rollback if
    // the server action fails while the optimistic update is visible.
    const previousProjects = projects;
    const newProjects = [...previousProjects];
    const [removed] = newProjects.splice(draggedIndex, 1);
    newProjects.splice(targetIndex, 0, removed);

    // Update order_index
    const updatedProjects = newProjects.map((project, index) => ({
      ...project,
      order_index: index,
    }));

    setSaveError(null);
    setProjects(updatedProjects);
    setDraggedItem(null);

    // Save to database
    setIsSaving(true);
    try {
      await updatePortfolioOrder(
        updatedProjects.map((p) => ({ id: p.id, order_index: p.order_index }))
      );
    } catch (error) {
      setProjects(previousProjects);
      setSaveError(
        `Не удалось сохранить порядок портфолио: ${
          error instanceof Error ? error.message : 'неизвестная ошибка'
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowQuickAdd(true)} variant="secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Быстрое добавление
        </Button>
      </div>

      {/* Status indicator */}
      {isSaving && (
        <div className="bg-[#DB9844]/10 border border-[#DB9844]/50 rounded-lg p-3 text-[#DB9844] text-sm flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Сохранение...
        </div>
      )}
      {saveError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">
          {saveError}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4 auto-rows-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`col-span-12 ${RESPONSIVE_COL_SPAN_CLASSES[project.col_span] ?? 'md:col-span-12'}`}
            style={{
              gridColumn: `span ${project.col_span}`,
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, project.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, project.id)}
            onDragEnd={handleDragEnd}
          >
            <PortfolioTile
              project={project}
              isDragging={draggedItem === project.id}
              onDeleted={(id) => setProjects((current) => current.filter((item) => item.id !== id))}
            />
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 text-sm text-slate-400">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-[#DB9844] flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium text-slate-300 mb-1">Как использовать:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Нажмите «Быстрое добавление» для создания проекта с базовой информацией</li>
              <li>Перетаскивайте плитки для изменения порядка</li>
              <li>Нажмите «Редактировать» для изменения содержимого и размера</li>
              <li>Изменения сохраняются автоматически</li>
              <li>Используйте разную ширину колонок (4, 6, 8, 12) для создания сетки</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Add Dialog */}
      {showQuickAdd && (
        <QuickAddPortfolio
          onClose={() => setShowQuickAdd(false)}
          onCreated={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
