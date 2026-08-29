'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { deletePricing } from '../actions';

interface DeletePricingButtonProps {
  id: string;
  name: string;
  onDeleted?: (id: string) => void;
}

export default function DeletePricingButton({ id, name, onDeleted }: DeletePricingButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePricing(id);
      onDeleted?.(id);
      setShowConfirm(false);
    } catch {
      alert('Не удалось удалить услугу');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-2">Удалить услугу</h3>
          <p className="text-slate-400 mb-6">
            Вы уверены, что хотите удалить «{name}»? Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={isDeleting} className="flex-1">
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} className="flex-1">
              Удалить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </Button>
  );
}
