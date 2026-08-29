'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertUuid, getFormText, requireFormText } from '@/lib/validation/input';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createPage(formData: FormData) {
  const { supabase } = await requireAdminServerContext();

  const title = requireFormText(formData, 'title', 240);
  const content = getFormText(formData, 'content', 100_000);
  const seo_title = getFormText(formData, 'seo_title', 240);
  const seo_description = getFormText(formData, 'seo_description', 500);
  let slug = getFormText(formData, 'slug', 240);

  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  if (!slug) throw new Error('A valid slug is required');

  const { error } = await supabase.from('pages').insert({
    title,
    slug,
    content,
    seo_title: seo_title || null,
    seo_description: seo_description || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/pages');
  redirect('/admin/pages');
}

export async function updatePage(id: string, formData: FormData) {
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const title = requireFormText(formData, 'title', 240);
  const content = getFormText(formData, 'content', 100_000);
  const seo_title = getFormText(formData, 'seo_title', 240);
  const seo_description = getFormText(formData, 'seo_description', 500);
  let slug = getFormText(formData, 'slug', 240);

  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  if (!slug) throw new Error('A valid slug is required');

  const { error } = await supabase
    .from('pages')
    .update({
      title,
      slug,
      content,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/pages');
  redirect('/admin/pages');
}

export async function deletePage(id: string) {
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { error, count } = await supabase
    .from('pages')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1) {
    throw new Error('Page was not found or was not deleted');
  }

  revalidatePath('/admin/pages');
}
