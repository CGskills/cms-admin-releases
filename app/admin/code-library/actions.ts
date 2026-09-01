'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logActivity } from '@/lib/activity/log';
import type {
  CodeBlockCategory,
  CodeBlockStatus,
  CodeBlockDependency,
  ValidationStatus,
} from '@/types/code-blocks';
import { assertSafeUrl, assertUuid, getFormText, isPlainRecord, assertNpmPackageName, assertSemver } from '@/lib/validation/input';

const CODE_BLOCK_CATEGORIES = new Set<CodeBlockCategory>([
  'hero', 'gallery', 'slider', 'before_after', 'interactive', 'team', 'reviews',
  'animation', 'mouse_interaction', 'scroll_animation', 'video', 'custom_ui', 'other',
]);
const CODE_BLOCK_STATUSES = new Set<CodeBlockStatus>(['draft', 'ready', 'archived']);
const VALIDATION_STATUSES = new Set<ValidationStatus>(['unchecked', 'pass', 'warning', 'error']);

function parseCategory(value: FormDataEntryValue | null): CodeBlockCategory {
  const category = typeof value === 'string' ? value.trim() : '';
  if (!category) return 'other';
  if (!CODE_BLOCK_CATEGORIES.has(category as CodeBlockCategory)) throw new Error('Invalid category');
  return category as CodeBlockCategory;
}

function parseStatus(value: FormDataEntryValue | null): CodeBlockStatus {
  const status = typeof value === 'string' ? value.trim() : '';
  if (!status) return 'draft';
  if (!CODE_BLOCK_STATUSES.has(status as CodeBlockStatus)) throw new Error('Invalid status');
  return status as CodeBlockStatus;
}

function parseDependencies(value: FormDataEntryValue | null): CodeBlockDependency[] {
  if (value === null || value === '') return [];
  if (typeof value !== 'string' || value.length > 20_000) throw new Error('Invalid dependencies');

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid dependencies');
  }
  if (!Array.isArray(parsed) || parsed.length > 100) throw new Error('Invalid dependencies');

  return parsed.flatMap((entry) => {
    if (!isPlainRecord(entry) || typeof entry.name !== 'string') throw new Error('Invalid dependency');
    const name = entry.name.trim();
    // Empty rows are created by the optional dependency editor. Ignore them
    // so adding a row and saving without filling it cannot brick the form.
    if (!name) return [];
    if (name.length > 200) throw new Error('Invalid dependency name');

    // Validate npm package name format
    assertNpmPackageName(name);

    let version: string | undefined;
    if (entry.version !== undefined && entry.version !== null) {
      if (typeof entry.version !== 'string' || entry.version.length > 100) throw new Error('Invalid dependency version');
      version = entry.version.trim() || undefined;

      // Validate semver format if version is provided
      if (version) {
        assertSemver(version);
      }
    }

    let cdnUrl: string | undefined;
    if (entry.cdnUrl !== undefined && entry.cdnUrl !== null) {
      if (typeof entry.cdnUrl !== 'string' || entry.cdnUrl.length > 2_000) throw new Error('Invalid dependency URL');
      cdnUrl = entry.cdnUrl.trim() || undefined;
      if (cdnUrl) assertSafeUrl(cdnUrl, 'dependency URL');
    }

    return [{ name, ...(version ? { version } : {}), ...(cdnUrl ? { cdnUrl } : {}) }];
  });
}

function bumpVersion(current: string): string {
  const parts = current.split('.').map(Number);
  if (parts.length !== 3) return '1.0.0';
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

export async function createCodeBlock(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const name = getFormText(formData, 'name', 240) || 'Untitled';
  const description = getFormText(formData, 'description', 5_000);
  const category = parseCategory(formData.get('category'));
  const html = getFormText(formData, 'html', 1_000_000);
  const css = getFormText(formData, 'css', 1_000_000);
  const javascript = getFormText(formData, 'javascript', 1_000_000);
  const status = parseStatus(formData.get('status'));
  const dependencies = parseDependencies(formData.get('dependencies'));

  const { data, error } = await supabase
    .from('code_blocks')
    .insert({
      name,
      description,
      category,
      html,
      css,
      javascript,
      status,
      dependencies,
      version: '1.0.0',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity({
    action: 'create',
    entityType: 'code_blocks',
    entityId: data.id,
    entityName: name,
  });

  revalidatePath('/admin/code-library');
  redirect('/admin/code-library');
  return { success: true };
}

export async function updateCodeBlock(id: string, formData: FormData) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const name = getFormText(formData, 'name', 240) || 'Untitled';
  const description = getFormText(formData, 'description', 5_000);
  const category = parseCategory(formData.get('category'));
  const html = getFormText(formData, 'html', 1_000_000);
  const css = getFormText(formData, 'css', 1_000_000);
  const javascript = getFormText(formData, 'javascript', 1_000_000);
  const status = parseStatus(formData.get('status'));
  const dependencies = parseDependencies(formData.get('dependencies'));

  console.log('[updateCodeBlock] Saving code block:', {
    id,
    name,
    htmlLength: html.length,
    cssLength: css.length,
    jsLength: javascript.length,
    depsCount: dependencies.length,
  });

  // Bump patch version
  const { data: existing, error: existingError } = await supabase
    .from('code_blocks')
    .select('version')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existing) {
    throw new Error('Code block not found');
  }

  const newVersion = bumpVersion(existing.version);

  const { error, count } = await supabase
    .from('code_blocks')
    .update({
      name,
      description,
      category,
      html,
      css,
      javascript,
      status,
      dependencies,
      version: newVersion,
    }, { count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1) {
    throw new Error('Code block was not found or was not updated');
  }

  console.log('[updateCodeBlock] Successfully saved:', {
    id,
    version: newVersion,
    htmlLength: html.length,
    cssLength: css.length,
    jsLength: javascript.length,
  });

  await logActivity({
    action: 'update',
    entityType: 'code_blocks',
    entityId: id,
    entityName: name,
  });

  revalidatePath('/admin/code-library');
  revalidatePath(`/admin/code-library/${id}`);
}

export async function deleteCodeBlock(id: string) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { data: block, error: fetchError } = await supabase
    .from('code_blocks')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error, count } = await supabase
    .from('code_blocks')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1 || !block) {
    throw new Error('Code block was not found or was not deleted');
  }

  await logActivity({
    action: 'delete',
    entityType: 'code_blocks',
    entityId: id,
    entityName: block?.name,
  });

  revalidatePath('/admin/code-library');
}

export async function duplicateCodeBlock(id: string) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { data: original, error: fetchError } = await supabase
    .from('code_blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !original) {
    throw new Error('Code block not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original;

  const { error } = await supabase.from('code_blocks').insert({
    ...rest,
    name: `${original.name} (copy)`,
    version: '1.0.0',
    status: 'draft',
  });

  if (error) {
    throw new Error(error.message);
  }

  await logActivity({
    action: 'create',
    entityType: 'code_blocks',
    entityName: `${original.name} (copy)`,
  });

  revalidatePath('/admin/code-library');
}

export async function updateCodeBlockStatus(id: string, status: CodeBlockStatus) {
  await validateCSRF();
  assertUuid(id);
  if (!CODE_BLOCK_STATUSES.has(status)) throw new Error('Invalid status');
  const { supabase } = await requireAdminServerContext();

  const { error, count } = await supabase
    .from('code_blocks')
    .update({ status }, { count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1) {
    throw new Error('Code block was not found or was not updated');
  }

  revalidatePath('/admin/code-library');
}

export async function updateValidationStatus(
  id: string,
  field: 'responsive_status' | 'validation_status',
  value: string
) {
  await validateCSRF();
  assertUuid(id);
  if (field !== 'responsive_status' && field !== 'validation_status') {
    throw new Error('Invalid validation field');
  }
  if (!VALIDATION_STATUSES.has(value as ValidationStatus)) throw new Error('Invalid validation status');
  const { supabase } = await requireAdminServerContext();

  const { error, count } = await supabase
    .from('code_blocks')
    .update({ [field]: value }, { count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1) {
    throw new Error('Code block was not found or was not updated');
  }

  revalidatePath('/admin/code-library');
}
