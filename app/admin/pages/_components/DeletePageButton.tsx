'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { deletePage } from '../actions';

interface DeletePageButtonProps {
  id: string;
  title: string;
  onDeleted?: (id: string) => void;
}

export default function DeletePageButton({ id, title, onDeleted }: DeletePageButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePage(id);
      onDeleted?.(id);
      setShowConfirm(false);
    } catch {
      alert('Failed to delete page');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-2">Delete Page</h3>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
      Delete
    </Button>
  );
}
