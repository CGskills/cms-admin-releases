'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { updateSettings } from '../actions';

interface SettingsFormProps {
  social_links?: Record<string, string> | null;
  settings?: {
    id: string;
    site_name: string;
    logo: string | null;
    email: string | null;
    phone: string | null;
    social_links: Record<string, string> | null;
  } | null;
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const defaultSocialLinks = settings?.social_links
    ? JSON.stringify(settings.social_links, null, 2)
    : '';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      await updateSettings(formData);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
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

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
          Настройки успешно сохранены!
        </div>
      )}

      <Input
        label="Название сайта"
        name="site_name"
        defaultValue={settings?.site_name || ''}
        placeholder="Мой сайт"
        required
        disabled={isSubmitting}
      />

      <Input
        label="URL логотипа"
        name="logo"
        type="url"
        defaultValue={settings?.logo || ''}
        placeholder="https://example.com/logo.png"
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Email"
          name="email"
          type="email"
          defaultValue={settings?.email || ''}
          placeholder="contact@example.com"
          disabled={isSubmitting}
        />

        <Input
          label="Телефон"
          name="phone"
          type="tel"
          defaultValue={settings?.phone || ''}
          placeholder="+7 (999) 123-45-67"
          disabled={isSubmitting}
        />
      </div>

      <Textarea
        label="Социальные сети (JSON)"
        name="social_links"
        defaultValue={defaultSocialLinks}
        placeholder='{"facebook": "https://...", "instagram": "https://...", "telegram": "https://..."}'
        rows={4}
        disabled={isSubmitting}
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Сохранить настройки
        </Button>
      </div>
    </form>
  );
}
