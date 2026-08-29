'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createPage, updatePage } from '../actions';

interface PageFormProps {
  page?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    seo_title: string | null;
    seo_description: string | null;
  };
}

export default function PageForm({ page }: PageFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      if (page) {
        await updatePage(page.id, formData);
      } else {
        await createPage(formData);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Page Title"
          name="title"
          defaultValue={page?.title}
          placeholder="About Us"
          required
          disabled={isSubmitting}
        />

        <Input
          label="Slug (URL)"
          name="slug"
          defaultValue={page?.slug}
          placeholder="about-us"
          disabled={isSubmitting}
        />
      </div>

      <Textarea
        label="Content"
        name="content"
        defaultValue={page?.content}
        placeholder="Write your page content here..."
        rows={10}
        required
        disabled={isSubmitting}
      />

      <div className="border-t border-slate-700/50 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">SEO Settings</h3>
        
        <div className="space-y-6">
          <Input
            label="SEO Title"
            name="seo_title"
            defaultValue={page?.seo_title || ''}
            placeholder="Page Title for Search Engines"
            disabled={isSubmitting}
          />

          <Textarea
            label="SEO Description"
            name="seo_description"
            defaultValue={page?.seo_description || ''}
            placeholder="Brief description for search engines..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

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
          {page ? 'Update Page' : 'Create Page'}
        </Button>
      </div>
    </form>
  );
}
