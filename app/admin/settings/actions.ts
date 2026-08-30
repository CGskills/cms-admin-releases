'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { revalidatePath } from 'next/cache';
import { getFormText, isPlainRecord, requireFormText } from '@/lib/validation/input';

export async function updateSettings(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const site_name = requireFormText(formData, 'site_name', 240);
  const email = getFormText(formData, 'email', 320);
  const phone = getFormText(formData, 'phone', 80);
  const logo = getFormText(formData, 'logo', 2_000);
  const socialLinksStr = getFormText(formData, 'social_links', 5_000);

  let social_links = null;
  if (socialLinksStr) {
    try {
      const parsed = JSON.parse(socialLinksStr) as unknown;
      social_links = isPlainRecord(parsed) ? parsed : null;
    } catch {
      social_links = null;
    }
  }

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({
        site_name,
        email: email || null,
        phone: phone || null,
        logo: logo || null,
        social_links,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from('settings').insert({
      site_name,
      email: email || null,
      phone: phone || null,
      logo: logo || null,
      social_links,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath('/admin/settings');
}
