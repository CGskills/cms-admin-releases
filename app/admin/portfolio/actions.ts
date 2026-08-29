'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logActivity } from '@/lib/activity/log';
import type { AuthenticatedServerContext } from '@/lib/auth/server';
import { assertOrderedItems, assertUuid, getBoundedInteger, getBoundedNumber, getFormText, requireFormText } from '@/lib/validation/input';
import {
  deleteAdminImage,
  getAdminStoragePath,
  getManagedUploadPath,
  removeAdminStorageObjects,
  uploadAdminImage,
} from '@/lib/storage/server';

const PORTFOLIO_BUCKET = 'portfolio';

function toPortfolioPath(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return getAdminStoragePath(PORTFOLIO_BUCKET, value);
  } catch {
    return null;
  }
}

function uniquePaths(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => toPortfolioPath(value)).filter((value): value is string => Boolean(value)))];
}

function managedUploadPaths(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => getManagedUploadPath(PORTFOLIO_BUCKET, value)).filter((value): value is string => Boolean(value)))];
}

function getUploadedPaths(formData: FormData): string[] {
  const raw = formData.get('uploaded_paths');
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 20_000) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(
      parsed
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 2_000),
    )].slice(0, 128);
  } catch {
    return [];
  }
}

async function cleanupPortfolioPaths(
  supabase: AuthenticatedServerContext['supabase'],
  paths: readonly (string | null | undefined)[],
): Promise<void> {
  const unique = uniquePaths(paths);
  if (unique.length === 0) return;

  try {
    await removeAdminStorageObjects(PORTFOLIO_BUCKET, unique, supabase);
  } catch {
    // The database is authoritative. A failed best-effort cleanup remains
    // visible in Media for an administrator to retry.
  }
}

async function rollbackPortfolioUploads(
  supabase: AuthenticatedServerContext['supabase'],
  values: readonly (string | null | undefined)[],
): Promise<void> {
  const paths = managedUploadPaths(values);
  if (paths.length === 0) return;

  try {
    await removeAdminStorageObjects(PORTFOLIO_BUCKET, paths, supabase);
  } catch {
    // Do not mask the original database error. Media exposes any object that
    // could not be rolled back for a later retry.
  }
}

export async function uploadPortfolioImageAction(
  file: File,
  oldPath?: string | null
): Promise<{ path: string; url: string }> {
  return uploadAdminImage({
    bucket: PORTFOLIO_BUCKET,
    folder: 'projects',
    file,
    oldPath,
  });
}

export async function deletePortfolioImageAction(path: string): Promise<void> {
  await deleteAdminImage(PORTFOLIO_BUCKET, path);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(
  supabase: AuthenticatedServerContext['supabase'],
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase
      .from('portfolio_items')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existing } = await query.maybeSingle();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function createPortfolio(formData: FormData) {
  const { supabase } = await requireAdminServerContext();
  const uploadedPaths = getUploadedPaths(formData);
  let committed = false;
  try {

  const title = requireFormText(formData, 'title', 240);
  const subtitle = getFormText(formData, 'subtitle', 300);
  const description = getFormText(formData, 'description', 10_000);
  const category = getFormText(formData, 'category', 120);
  const client = getFormText(formData, 'client', 240);
  const project_date = getFormText(formData, 'project_date', 40);
  const project_url = getFormText(formData, 'project_url', 2_000);
  const image_url = getFormText(formData, 'image_url', 2_000);
  const before_image = getFormText(formData, 'before_image', 2_000);
  const after_image = getFormText(formData, 'after_image', 2_000);
  const col_span = getBoundedInteger(getFormText(formData, 'col_span', 3), 6, 1, 12);
  const tile_height = getBoundedInteger(getFormText(formData, 'tile_height', 4), 280, 120, 1_200);
  const cover_x = getBoundedNumber(getFormText(formData, 'cover_x', 8), 50, 0, 100);
  const cover_y = getBoundedNumber(getFormText(formData, 'cover_y', 8), 50, 0, 100);
  const cover_zoom = getBoundedNumber(getFormText(formData, 'cover_zoom', 8), 1, 0.5, 3);
  const visible = formData.get('visible') === 'true';

  const technologiesString = getFormText(formData, 'technologies', 2_000);
  const technologies = technologiesString
    ? technologiesString.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const galleryString = getFormText(formData, 'gallery', 10_000);
  const gallery = galleryString
    ? galleryString.split(',').map((url) => url.trim()).filter(Boolean)
    : [];
  let slug = getFormText(formData, 'slug', 240);
  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  if (!slug) throw new Error('A valid slug is required');

  slug = await generateUniqueSlug(supabase, slug);

  const { data: maxOrder } = await supabase
    .from('portfolio_items')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const order_index = maxOrder ? maxOrder.order_index + 1 : 0;

  const { error } = await supabase.from('portfolio_items').insert({
    title,
    slug,
    subtitle: subtitle || '',
    description: description || '',
    category: category || null,
    technologies,
    client: client || null,
    project_date: project_date || null,
    project_url: project_url || null,
    image_url: image_url || '',
    before_image: before_image || null,
    after_image: after_image || null,
    gallery,
    col_span,
    tile_height,
    cover_x,
    cover_y,
    cover_zoom,
    order_index,
    visible,
  });

  if (error) throw new Error(error.message);
  committed = true;

  const createdPaths = new Set(uniquePaths([image_url, before_image, after_image, ...gallery]));
  await cleanupPortfolioPaths(
    supabase,
    managedUploadPaths(uploadedPaths).filter((path) => !createdPaths.has(path)),
  );

  await logActivity({ action: 'create', entityType: 'portfolio', entityName: title });

  revalidatePath('/admin/portfolio');
  redirect('/admin/portfolio');
  } catch (error: unknown) {
    if (!committed) await rollbackPortfolioUploads(supabase, uploadedPaths);
    throw error;
  }
}

export async function updatePortfolio(id: string, formData: FormData) {
  const uploadedPaths = getUploadedPaths(formData);
  const { supabase } = await requireAdminServerContext();
  let committed = false;
  try {
  assertUuid(id);

  const { data: existing, error: existingError } = await supabase
    .from('portfolio_items')
    .select('image_url, before_image, after_image, gallery')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const title = requireFormText(formData, 'title', 240);
  const subtitle = getFormText(formData, 'subtitle', 300);
  const description = getFormText(formData, 'description', 10_000);
  const category = getFormText(formData, 'category', 120);
  const client = getFormText(formData, 'client', 240);
  const project_date = getFormText(formData, 'project_date', 40);
  const project_url = getFormText(formData, 'project_url', 2_000);
  const image_url = getFormText(formData, 'image_url', 2_000);
  const before_image = getFormText(formData, 'before_image', 2_000);
  const after_image = getFormText(formData, 'after_image', 2_000);
  const col_span = getBoundedInteger(getFormText(formData, 'col_span', 3), 6, 1, 12);
  const tile_height = getBoundedInteger(getFormText(formData, 'tile_height', 4), 280, 120, 1_200);
  const cover_x = getBoundedNumber(getFormText(formData, 'cover_x', 8), 50, 0, 100);
  const cover_y = getBoundedNumber(getFormText(formData, 'cover_y', 8), 50, 0, 100);
  const cover_zoom = getBoundedNumber(getFormText(formData, 'cover_zoom', 8), 1, 0.5, 3);
  const visible = formData.get('visible') === 'true';

  const technologiesString = getFormText(formData, 'technologies', 2_000);
  const technologies = technologiesString
    ? technologiesString.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const galleryString = getFormText(formData, 'gallery', 10_000);
  const gallery = galleryString
    ? galleryString.split(',').map((url) => url.trim()).filter(Boolean)
    : [];
  let slug = getFormText(formData, 'slug', 240);
  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  if (!slug) throw new Error('A valid slug is required');

  slug = await generateUniqueSlug(supabase, slug, id);

  const { error } = await supabase
    .from('portfolio_items')
    .update({
      title,
      slug,
      subtitle: subtitle || '',
      description: description || '',
      category: category || null,
      technologies,
      client: client || null,
      project_date: project_date || null,
      project_url: project_url || null,
      image_url: image_url || '',
      before_image: before_image || null,
      after_image: after_image || null,
      gallery,
      col_span,
      tile_height,
      cover_x,
      cover_y,
      cover_zoom,
      visible,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  committed = true;

  const previousPaths = uniquePaths([
    existing?.image_url,
    existing?.before_image,
    existing?.after_image,
    ...(existing?.gallery || []),
  ]);
  const nextPaths = uniquePaths([image_url, before_image, after_image, ...gallery]);
  const nextSet = new Set(nextPaths);
  await cleanupPortfolioPaths(
    supabase,
    previousPaths.filter((path) => !nextSet.has(path)),
  );
  await cleanupPortfolioPaths(
    supabase,
    managedUploadPaths(uploadedPaths).filter((path) => !nextSet.has(path)),
  );

  await logActivity({ action: 'update', entityType: 'portfolio', entityId: id, entityName: title });

  revalidatePath('/admin/portfolio');
  redirect('/admin/portfolio');
  } catch (error: unknown) {
    if (!committed) await rollbackPortfolioUploads(supabase, uploadedPaths);
    throw error;
  }
}

export async function deletePortfolio(id: string) {
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { data: item, error: fetchError } = await supabase
    .from('portfolio_items')
    .select('title, image_url, before_image, after_image, gallery')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error, count } = await supabase
    .from('portfolio_items')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1 || !item) {
    throw new Error('Portfolio item was not found or was not deleted');
  }

  await cleanupPortfolioPaths(supabase, [
    item?.image_url,
    item?.before_image,
    item?.after_image,
    ...(item?.gallery || []),
  ]);

  await logActivity({ action: 'delete', entityType: 'portfolio', entityId: id, entityName: item?.title });

  revalidatePath('/admin/portfolio');
}

export const deletePortfolioItem = deletePortfolio;

export async function updatePortfolioOrder(
  items: { id: string; order_index: number }[]
) {
  assertOrderedItems(items);
  const { supabase } = await requireAdminServerContext();

  const updates = items.map(({ id, order_index }) =>
    supabase.from('portfolio_items').update({ order_index }).eq('id', id)
  );

  const results = await Promise.all(updates);
  const failedUpdate = results.find(({ error }) => error);
  if (failedUpdate?.error) throw new Error(failedUpdate.error.message);

  revalidatePath('/admin/portfolio');
}
