'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createService, updateService } from '../actions';

interface ServiceFormProps {
  service?: {
    id: string;
    title: string;
    description: string;
    icon: string | null;
  };
}

export default function ServiceForm({ service }: ServiceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      if (service) {
        await updateService(service.id, formData);
      } else {
        await createService(formData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Service Title"
        name="title"
        defaultValue={service?.title}
        placeholder="Web Development"
        required
        disabled={isSubmitting}
      />

      <Textarea
        label="Description"
        name="description"
        defaultValue={service?.description}
        placeholder="Describe the service..."
        rows={5}
        required
        disabled={isSubmitting}
      />

      <Input
        label="Icon (SVG path or emoji)"
        name="icon"
        defaultValue={service?.icon || ''}
        placeholder="M12 2L2 7l10 5 10-5-10-5z"
        disabled={isSubmitting}
      />

      <div className="flex gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {service ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}
