'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertUuid, getFormText, requireFormText } from '@/lib/validation/input';

export async function createService(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const title = requireFormText(formData, 'title', 240);
  const description = requireFormText(formData, 'description', 10_000);
  const icon = getFormText(formData, 'icon', 2_000);

  const { error } = await supabase.from('services').insert({
    title,
    description,
    icon: icon || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/services');
  redirect('/admin/services');
}

export async function updateService(id: string, formData: FormData) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const title = requireFormText(formData, 'title', 240);
  const description = requireFormText(formData, 'description', 10_000);
  const icon = getFormText(formData, 'icon', 2_000);

  const { error } = await supabase
    .from('services')
    .update({
      title,
      description,
      icon: icon || null,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/services');
  redirect('/admin/services');
}

export async function deleteService(id: string) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { error, count } = await supabase
    .from('services')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1) {
    throw new Error('Service was not found or was not deleted');
  }

  revalidatePath('/admin/services');
}
