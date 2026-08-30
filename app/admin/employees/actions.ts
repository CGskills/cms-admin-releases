'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import type { AuthenticatedServerContext } from '@/lib/auth/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteAdminImage,
  getAdminStoragePath,
  getManagedUploadPath,
  removeAdminStorageObjects,
  uploadAdminImage,
} from '@/lib/storage/server';
import { logActivity } from '@/lib/activity/log';
import { assertUuid, assertUuidList, getBoundedInteger, getFormText, requireFormText } from '@/lib/validation/input';

const EMPLOYEES_BUCKET = 'employees';

function toEmployeePath(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return getAdminStoragePath(EMPLOYEES_BUCKET, value);
  } catch {
    return null;
  }
}

/**
 * Uploads happen before the entity mutation. Keep the paths produced by the
 * current form so failed saves can roll them back without ever trusting an
 * arbitrary path supplied by a client.
 */
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
    )].slice(0, 64);
  } catch {
    return [];
  }
}

function getManagedEmployeePaths(values: readonly string[]): string[] {
  return [...new Set(
    values
      .map((value) => getManagedUploadPath(EMPLOYEES_BUCKET, value))
      .filter((value): value is string => Boolean(value)),
  )];
}

async function cleanupEmployeePaths(
  supabase: AuthenticatedServerContext['supabase'],
  values: readonly (string | null | undefined)[],
): Promise<void> {
  const paths = [...new Set(values.map((value) => toEmployeePath(value)).filter((value): value is string => Boolean(value)))];
  if (paths.length === 0) return;

  try {
    await removeAdminStorageObjects(EMPLOYEES_BUCKET, paths, supabase);
  } catch {
    // Keep the row mutation authoritative. Any object that could not be
    // removed remains visible in Media for a later retry.
  }
}

async function rollbackEmployeeUploads(
  supabase: AuthenticatedServerContext['supabase'],
  values: readonly (string | null | undefined)[],
): Promise<void> {
  const paths = [...new Set(values.map((value) => getManagedUploadPath(EMPLOYEES_BUCKET, value)).filter((value): value is string => Boolean(value)))];
  if (paths.length === 0) return;

  try {
    await removeAdminStorageObjects(EMPLOYEES_BUCKET, paths, supabase);
  } catch {
    // Do not mask the original database failure.
  }
}

export async function uploadEmployeePhotoAction(
  file: File,
  employeeId?: string,
  oldPath?: string | null
): Promise<{ path: string; url: string }> {
  if (employeeId) assertUuid(employeeId);
  return uploadAdminImage({
    bucket: EMPLOYEES_BUCKET,
    folder: employeeId ? `avatars/${employeeId}` : 'avatars',
    file,
    oldPath,
  });
}

export async function deleteEmployeePhotoAction(path: string): Promise<void> {
  await deleteAdminImage(EMPLOYEES_BUCKET, path);
}

export async function createEmployee(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  const uploadedPaths = getUploadedPaths(formData);

  let committed = false;
  try {

    const first_name = requireFormText(formData, 'first_name', 120);
    const last_name = getFormText(formData, 'last_name', 120);
    const full_name = requireFormText(formData, 'full_name', 240);
    const position = requireFormText(formData, 'position', 240);
    const specialization = getFormText(formData, 'specialization', 240);
    const short_description = getFormText(formData, 'short_description', 500);
    const description = getFormText(formData, 'description', 10_000);
    const experience_years = getBoundedInteger(getFormText(formData, 'experience_years', 3), 0, 0, 80);
    const happy_patients = getFormText(formData, 'happy_patients', 120);
    const courses_count = getBoundedInteger(getFormText(formData, 'courses_count', 5), 0, 0, 10_000);
    const certificates_count = getBoundedInteger(getFormText(formData, 'certificates_count', 5), 0, 0, 10_000);
    const education = getFormText(formData, 'education', 5_000);
    const qualification = getFormText(formData, 'qualification', 5_000);
    const achievements = getFormText(formData, 'achievements', 5_000);
    const photo_path = getFormText(formData, 'photo_path', 2_000);
    const published = formData.get('published') === 'true';

    const { data: maxOrder } = await supabase
      .from('employees')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const order_index = (maxOrder?.order_index ?? -1) + 1;

    const { error } = await supabase.from('employees').insert({
      first_name,
      last_name,
      full_name,
      position,
      specialization: specialization || null,
      short_description: short_description || null,
      description,
      experience_years,
      happy_patients: happy_patients || null,
      courses_count,
      certificates_count,
      education: education || null,
      qualification: qualification || null,
      achievements: achievements || null,
      photo_path: photo_path || null,
      published,
      order_index,
    });

    if (error) throw new Error(error.message);
    committed = true;

    // A form may have uploaded and then replaced/cleared an image. Only the
    // path persisted in the row should survive a successful create.
    const persistedPath = toEmployeePath(photo_path);
    await cleanupEmployeePaths(
      supabase,
      getManagedEmployeePaths(uploadedPaths).filter((path) => path !== persistedPath),
    );

    await logActivity({ action: 'create', entityType: 'employees', entityName: full_name });

    revalidatePath('/admin/employees');
    revalidatePath('/');
    redirect('/admin/employees');
  } catch (error: unknown) {
    if (!committed) await rollbackEmployeeUploads(supabase, uploadedPaths);
    throw error;
  }
}

export async function updateEmployee(id: string, formData: FormData) {
  await validateCSRF();
  assertUuid(id);
  const uploadedPaths = getUploadedPaths(formData);
  const { supabase } = await requireAdminServerContext();
  let committed = false;
  try {

  const first_name = requireFormText(formData, 'first_name', 120);
  const last_name = getFormText(formData, 'last_name', 120);
  const full_name = requireFormText(formData, 'full_name', 240);
  const position = requireFormText(formData, 'position', 240);
  const specialization = getFormText(formData, 'specialization', 240);
  const short_description = getFormText(formData, 'short_description', 500);
  const description = getFormText(formData, 'description', 10_000);
  const experience_years = getBoundedInteger(getFormText(formData, 'experience_years', 3), 0, 0, 80);
  const happy_patients = getFormText(formData, 'happy_patients', 120);
  const courses_count = getBoundedInteger(getFormText(formData, 'courses_count', 5), 0, 0, 10_000);
  const certificates_count = getBoundedInteger(getFormText(formData, 'certificates_count', 5), 0, 0, 10_000);
  const education = getFormText(formData, 'education', 5_000);
  const qualification = getFormText(formData, 'qualification', 5_000);
  const achievements = getFormText(formData, 'achievements', 5_000);
  const photo_path = getFormText(formData, 'photo_path', 2_000);
  const published = formData.get('published') === 'true';

  const { data: existing, error: existingError } = await supabase
    .from('employees')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error('Employee was not found');

  const { error, count } = await supabase
    .from('employees')
    .update({
      first_name,
      last_name,
      full_name,
      position,
      specialization: specialization || null,
      short_description: short_description || null,
      description,
      experience_years,
      happy_patients: happy_patients || null,
      courses_count,
      certificates_count,
      education: education || null,
      qualification: qualification || null,
      achievements: achievements || null,
      photo_path: photo_path || null,
      published,
    }, { count: 'exact' })
    .eq('id', id);

  if (error) throw new Error(error.message);
  if (count !== 1) throw new Error('Employee was not found or was not updated');
  committed = true;

  const previousPath = toEmployeePath(existing?.photo_path);
  const nextPath = toEmployeePath(photo_path);
  const obsoletePaths = [
    previousPath && previousPath !== nextPath ? previousPath : null,
    ...getManagedEmployeePaths(uploadedPaths).filter((path) => path !== nextPath),
  ];
  await cleanupEmployeePaths(supabase, obsoletePaths);

  await logActivity({ action: 'update', entityType: 'employees', entityId: id, entityName: full_name });

  revalidatePath('/admin/employees');
  revalidatePath('/');
  redirect('/admin/employees');
  } catch (error: unknown) {
    if (!committed) await rollbackEmployeeUploads(supabase, uploadedPaths);
    throw error;
  }
}

export async function deleteEmployee(id: string) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select('full_name, photo_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error, count } = await supabase
    .from('employees')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  if (count !== 1 || !employee) {
    throw new Error('Employee was not found or was not deleted');
  }

  if (employee?.photo_path) {
    await cleanupEmployeePaths(supabase, [employee.photo_path]);
  }

  await logActivity({ action: 'delete', entityType: 'employees', entityId: id, entityName: employee.full_name });

  revalidatePath('/admin/employees');
  revalidatePath('/');
}

export async function togglePublished(id: string, published: boolean) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const { data: item } = await supabase.from('employees').select('full_name').eq('id', id).single();
  const { error } = await supabase
    .from('employees')
    .update({ published })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await logActivity({ action: published ? 'publish' : 'unpublish', entityType: 'employees', entityId: id, entityName: item?.full_name });

  revalidatePath('/admin/employees');
  revalidatePath('/');
}

export async function reorderEmployees(ids: string[]) {
  await validateCSRF();
  assertUuidList(ids);
  const { supabase } = await requireAdminServerContext();

  const updates = ids.map((id, index) =>
    supabase
      .from('employees')
      .update({ order_index: index })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const failedUpdate = results.find(({ error }) => error);
  if (failedUpdate?.error) throw new Error(failedUpdate.error.message);

  revalidatePath('/admin/employees');
  revalidatePath('/');
}
