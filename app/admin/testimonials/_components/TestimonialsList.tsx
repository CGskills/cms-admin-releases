'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import DeleteTestimonialButton from './DeleteTestimonialButton';
import { togglePublished, reorderTestimonials } from '../actions';
import { getTestimonialImageUrl } from '@/lib/testimonials/storage';
import type { Testimonial } from '@/types/testimonials';

interface TestimonialsListProps {
  initialTestimonials: Testimonial[];
}

interface SortableTestimonialProps {
  testimonial: Testimonial;
  onDeleted?: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => Promise<void>;
  isToggling: boolean;
  dragDisabled: boolean;
}

function SortableTestimonial({
  testimonial,
  onDeleted,
  onTogglePublished,
  isToggling,
  dragDisabled,
}: SortableTestimonialProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testimonial.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTogglePublished = async () => {
    await onTogglePublished(testimonial.id, !testimonial.published);
  };

  const fullName = testimonial.surname
    ? `${testimonial.name} ${testimonial.surname}`
    : testimonial.name;

  const location = testimonial.location
    ? testimonial.location
    : testimonial.company
    ? testimonial.company
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 hover:border-[#DB9844]/50 transition-all"
    >
      <div className="flex items-start gap-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-[#DB9844] transition-colors mt-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>

        {testimonial.avatar_path ? (
          <img
            src={getTestimonialImageUrl(testimonial.avatar_path)}
            alt={fullName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB9844] to-[#AF5D3E] flex items-center justify-center text-white font-semibold">
            {testimonial.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{fullName}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                testimonial.published
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-600/50 text-slate-400'
              }`}
            >
              {testimonial.published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-1">
            {testimonial.position && testimonial.position}
            {testimonial.position && testimonial.company && ' • '}
            {testimonial.company && testimonial.company}
          </p>
          {location && (
            <p className="text-xs text-slate-500 mb-2">{location}</p>
          )}
          <div className="flex mb-2">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${
                  i < testimonial.rating ? 'text-[#DB9844]' : 'text-slate-600'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-slate-300 text-sm line-clamp-2">
            &quot;{testimonial.content}&quot;
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Link href={`/admin/testimonials/${testimonial.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            Edit
          </Button>
        </Link>
        <Button
          variant={testimonial.published ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleTogglePublished}
          disabled={isToggling}
          className="px-3"
        >
          {isToggling ? '...' : testimonial.published ? 'Unpublish' : 'Publish'}
        </Button>
        <DeleteTestimonialButton id={testimonial.id} name={fullName} onDeleted={onDeleted} />
      </div>
    </div>
  );
}

export default function TestimonialsList({ initialTestimonials }: TestimonialsListProps) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTogglePublished = async (id: string, published: boolean) => {
    if (pendingToggleId || isReordering) return;

    const previousPublished = testimonials.find((testimonial) => testimonial.id === id)?.published;
    if (previousPublished === undefined) return;

    setActionError(null);
    setPendingToggleId(id);
    setTestimonials((current) =>
      current.map((testimonial) =>
        testimonial.id === id ? { ...testimonial, published } : testimonial
      )
    );

    try {
      await togglePublished(id, published);
    } catch (error) {
      setTestimonials((current) =>
        current.map((testimonial) =>
          testimonial.id === id ? { ...testimonial, published: previousPublished } : testimonial
        )
      );
      setActionError(
        `Не удалось изменить статус отзыва: ${
          error instanceof Error ? error.message : 'неизвестная ошибка'
        }`
      );
    } finally {
      setPendingToggleId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isReordering || pendingToggleId) return;

    const { active, over } = event;

    if (!over || String(active.id) === String(over.id)) return;

      const oldIndex = testimonials.findIndex((testimonial) => testimonial.id === String(active.id));
      const newIndex = testimonials.findIndex((testimonial) => testimonial.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const previousTestimonials = testimonials;
      const newTestimonials = arrayMove(previousTestimonials, oldIndex, newIndex);
      setActionError(null);
      setTestimonials(newTestimonials);
      setIsReordering(true);

      try {
        await reorderTestimonials(newTestimonials.map((testimonial) => testimonial.id));
      } catch (error) {
        setTestimonials(previousTestimonials);
        setActionError(
          `Не удалось изменить порядок отзывов: ${
            error instanceof Error ? error.message : 'неизвестная ошибка'
          }`
        );
      } finally {
        setIsReordering(false);
      }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}
      <DndContext id="testimonials-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={testimonials} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <SortableTestimonial
              key={testimonial.id}
              testimonial={testimonial}
              onTogglePublished={handleTogglePublished}
              isToggling={pendingToggleId === testimonial.id}
              dragDisabled={isReordering || Boolean(pendingToggleId)}
              onDeleted={(id) => setTestimonials((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </div>
      </SortableContext>
      </DndContext>
    </div>
  );
}
