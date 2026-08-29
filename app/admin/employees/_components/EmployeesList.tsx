'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import DeleteEmployeeButton from './DeleteEmployeeButton';
import { togglePublished, reorderEmployees } from '../actions';
import { getEmployeePhotoUrl } from '@/lib/employees/storage';
import type { Employee } from '@/types/employees';

interface EmployeesListProps {
  initialEmployees: Employee[];
}

interface SortableEmployeeProps {
  employee: Employee;
  onDeleted?: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => Promise<void>;
  isToggling: boolean;
  dragDisabled: boolean;
}

function SortableEmployee({
  employee,
  onDeleted,
  onTogglePublished,
  isToggling,
  dragDisabled,
}: SortableEmployeeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: employee.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTogglePublished = async () => {
    await onTogglePublished(employee.id, !employee.published);
  };

  const fullName = employee.full_name || `${employee.first_name} ${employee.last_name}`;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {employee.photo_path ? (
          <img
            src={getEmployeePhotoUrl(employee.photo_path)}
            alt={fullName}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#DB9844] to-[#AF5D3E] flex items-center justify-center text-white font-bold text-lg">
            {employee.first_name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{fullName}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                employee.published
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-600/50 text-slate-400'
              }`}
            >
              {employee.published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-sm text-[#DB9844] mb-1">{employee.position}</p>
          {employee.specialization && (
            <p className="text-xs text-slate-500 mb-1">{employee.specialization}</p>
          )}
          <div className="flex gap-4 text-xs text-slate-400 mt-2">
            <span>{employee.experience_years}+ лет опыта</span>
            <span>{employee.happy_patients || '0+'} пациентов</span>
            <span>{employee.courses_count} курсов</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Link href={`/admin/employees/${employee.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            Edit
          </Button>
        </Link>
        <Button
          variant={employee.published ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleTogglePublished}
          disabled={isToggling}
          className="px-3"
        >
          {isToggling ? '...' : employee.published ? 'Unpublish' : 'Publish'}
        </Button>
        <DeleteEmployeeButton id={employee.id} name={fullName} onDeleted={onDeleted} />
      </div>
    </div>
  );
}

export default function EmployeesList({ initialEmployees }: EmployeesListProps) {
  const [employees, setEmployees] = useState(initialEmployees);
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

    const previousPublished = employees.find((employee) => employee.id === id)?.published;
    if (previousPublished === undefined) return;

    setActionError(null);
    setPendingToggleId(id);
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id ? { ...employee, published } : employee
      )
    );

    try {
      await togglePublished(id, published);
    } catch (error) {
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === id ? { ...employee, published: previousPublished } : employee
        )
      );
      setActionError(
        `Не удалось изменить статус сотрудника: ${
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

    if (over && String(active.id) !== String(over.id)) {
      const oldIndex = employees.findIndex((employee) => employee.id === String(active.id));
      const newIndex = employees.findIndex((employee) => employee.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const previousEmployees = employees;
      const newEmployees = arrayMove(previousEmployees, oldIndex, newIndex);
      setActionError(null);
      setEmployees(newEmployees);
      setIsReordering(true);

      try {
        await reorderEmployees(newEmployees.map((employee) => employee.id));
      } catch (error) {
        setEmployees(previousEmployees);
        setActionError(
          `Не удалось изменить порядок сотрудников: ${
            error instanceof Error ? error.message : 'неизвестная ошибка'
          }`
        );
      } finally {
        setIsReordering(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}
      <DndContext id="employees-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={employees} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {employees.map((employee) => (
            <SortableEmployee
              key={employee.id}
              employee={employee}
              onTogglePublished={handleTogglePublished}
              isToggling={pendingToggleId === employee.id}
              dragDisabled={isReordering || Boolean(pendingToggleId)}
              onDeleted={(id) => setEmployees((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </div>
      </SortableContext>
      </DndContext>
    </div>
  );
}
