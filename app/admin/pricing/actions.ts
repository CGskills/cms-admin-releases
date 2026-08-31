'use server';

import { requireAdminServerContext } from '@/lib/auth/server';
import { validateCSRF } from '@/lib/auth/csrf';
import { batchUpdateOrder } from '@/lib/database/batch-operations';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PricingSettings } from '@/types/pricing';
import { logActivity } from '@/lib/activity/log';
import { assertOrderedItems, assertUuid, getFormText, isPlainRecord, requireFormText } from '@/lib/validation/input';

const PRICING_REORDER_CONCURRENCY = 12;
type PricingOrderItem = { id: string; order_index: number };
type PricingOrderResponse = { error: { message: string } | null; count: number | null };

/**
 * @deprecated Use batchUpdateOrder from lib/database/batch-operations instead
 * Legacy function kept for reference only
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function persistPricingOrder(
  items: PricingOrderItem[],
  update: (item: PricingOrderItem) => Promise<PricingOrderResponse>,
): Promise<void> {
  for (let start = 0; start < items.length; start += PRICING_REORDER_CONCURRENCY) {
    const batch = items.slice(start, start + PRICING_REORDER_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(update));

    for (const result of results) {
      if (result.status === 'rejected') {
        throw new Error(result.reason instanceof Error ? result.reason.message : 'Pricing order update failed');
      }
      if (result.value.error) throw new Error(result.value.error.message);
      if (result.value.count !== 1) throw new Error('Pricing item was not found or order was not updated');
    }
  }
}

// ─── CRUD ───────────────────────────────────────

export async function createPricing(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const category = requireFormText(formData, 'category', 120);
  const name = requireFormText(formData, 'name', 240);
  const description = getFormText(formData, 'description', 2_000);
  const price = getFormText(formData, 'price', 120);
  const duration = getFormText(formData, 'duration', 120);

  const featuresStr = getFormText(formData, 'features', 5_000);
  const features = featuresStr
    ? featuresStr.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  // order_index will be automatically assigned by database sequence
  const { error } = await supabase.from('pricing').insert({
    category,
    name,
    description,
    price,
    duration: duration || '',
    features,
    visible: true,
  });

  if (error) throw new Error(error.message);

  await logActivity({ action: 'create', entityType: 'pricing', entityName: name });

  revalidatePath('/admin/pricing');
  redirect('/admin/pricing');
}

export async function updatePricing(id: string, formData: FormData) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();

  const category = requireFormText(formData, 'category', 120);
  const name = requireFormText(formData, 'name', 240);
  const description = getFormText(formData, 'description', 2_000);
  const price = getFormText(formData, 'price', 120);
  const duration = getFormText(formData, 'duration', 120);

  const featuresStr = getFormText(formData, 'features', 5_000);
  const features = featuresStr
    ? featuresStr.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  const { error, count } = await supabase
    .from('pricing')
    .update({ category, name, description, price, duration: duration || '', features }, { count: 'exact' })
    .eq('id', id);

  if (error) throw new Error(error.message);
  if (count !== 1) throw new Error('Pricing item was not found or was not updated');

  await logActivity({ action: 'update', entityType: 'pricing', entityId: id, entityName: name });

  revalidatePath('/admin/pricing');
  redirect('/admin/pricing');
}

export async function deletePricing(id: string) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();
  const { data: item, error: fetchError } = await supabase
    .from('pricing')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error, count } = await supabase
    .from('pricing')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw new Error(error.message);
  if (count !== 1 || !item) throw new Error('Pricing item was not found or was not deleted');
  await logActivity({ action: 'delete', entityType: 'pricing', entityId: id, entityName: item?.name });
  revalidatePath('/admin/pricing');
}

export async function updatePricingOrder(items: { id: string; order_index: number }[]) {
  await validateCSRF();
  assertOrderedItems(items);
  const { supabase } = await requireAdminServerContext();

  // Use batch update function for better performance
  await batchUpdateOrder(supabase, 'pricing', items);

  revalidatePath('/admin/pricing');
}

export async function togglePricingVisibility(id: string, visible: boolean) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();
  const { data: item } = await supabase.from('pricing').select('name').eq('id', id).single();
  const { error, count } = await supabase
    .from('pricing')
    .update({ visible }, { count: 'exact' })
    .eq('id', id);
  if (error) throw new Error(error.message);
  if (count !== 1) throw new Error('Pricing item was not found or visibility was not updated');
  await logActivity({ action: visible ? 'publish' : 'unpublish', entityType: 'pricing', entityId: id, entityName: item?.name });
  revalidatePath('/admin/pricing');
}

export async function quickUpdatePricing(
  id: string,
  field: string,
  value: string
) {
  await validateCSRF();
  assertUuid(id);
  const { supabase } = await requireAdminServerContext();
  const allowedFields = new Set(['category', 'name', 'description', 'price', 'duration']);

  if (typeof field !== 'string' || field.length === 0 || field.length > 80 || value.length > 10_000) {
    throw new Error('Invalid pricing update');
  }

  if (!allowedFields.has(field)) {
    const { data: settingsRow, error: settingsError } = await supabase
      .from('settings')
      .select('pricing_settings')
      .limit(1)
      .maybeSingle();

    if (settingsError) throw new Error(settingsError.message);

    const columns = isPlainRecord(settingsRow?.pricing_settings)
      && Array.isArray(settingsRow.pricing_settings.columns)
      ? settingsRow.pricing_settings.columns
      : [];
    const isConfiguredCustomField = columns.some(
      (column) => isPlainRecord(column) && column.key === field
    );

    if (!isConfiguredCustomField) {
      throw new Error('Unsupported pricing field');
    }

    const { data: item, error: itemError } = await supabase
      .from('pricing')
      .select('custom_fields')
      .eq('id', id)
      .single();

    if (itemError) throw new Error(itemError.message);

    const customFields = isPlainRecord(item.custom_fields) ? item.custom_fields : {};
    const { error, count } = await supabase
      .from('pricing')
      .update({ custom_fields: { ...customFields, [field]: value } }, { count: 'exact' })
      .eq('id', id);

    if (error) throw new Error(error.message);
    if (count !== 1) throw new Error('Pricing item was not found or custom field was not updated');
    revalidatePath('/admin/pricing');
    return;
  }

  const update: Record<string, string> = { [field]: value.trim() };
  const { error, count } = await supabase
    .from('pricing')
    .update(update, { count: 'exact' })
    .eq('id', id);
  if (error) throw new Error(error.message);
  if (count !== 1) throw new Error('Pricing item was not found or was not updated');
  revalidatePath('/admin/pricing');
}

// ─── Settings ───────────────────────────────────

export async function getPricingSettings(): Promise<PricingSettings> {
  const { supabase } = await requireAdminServerContext();
  const { data } = await supabase
    .from('settings')
    .select('pricing_settings')
    .limit(1)
    .single();
  if (data?.pricing_settings && typeof data.pricing_settings === 'object') {
    return data.pricing_settings as unknown as PricingSettings;
  }
  return {
    currency: '₽',
    currencyPosition: 'after',
    showDuration: true,
    showDescription: true,
    tableStyle: 'default',
    accentColor: '#DB9844',
  };
}

export async function savePricingSettings(settings: PricingSettings) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
      const { error, count } = await supabase
      .from('settings')
      .update({ pricing_settings: settings as unknown as Record<string, unknown> }, { count: 'exact' })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    if (count !== 1) throw new Error('Pricing settings were not found or were not updated');
  } else {
    const { error } = await supabase.from('settings').insert({
      site_name: 'CMS',
      pricing_settings: settings as unknown as Record<string, unknown>,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/pricing');
}

// ─── Category Management ───────────────────────

export async function renameCategory(oldName: string, newName: string) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  if (!oldName.trim() || !newName.trim() || oldName.length > 120 || newName.length > 120) {
    throw new Error('Invalid category name');
  }
  
  // Update all items in the old category
  const { error, count } = await supabase
    .from('pricing')
    .update({ category: newName }, { count: 'exact' })
    .eq('category', oldName);
    
  if (error) throw new Error(error.message);
  if (!count) throw new Error('Pricing category was not found or was not renamed');
  
  revalidatePath('/admin/pricing');
}

export async function mergeCategories(fromCategory: string, toCategory: string) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  if (!fromCategory.trim() || !toCategory.trim() || fromCategory.length > 120 || toCategory.length > 120) {
    throw new Error('Invalid category name');
  }
  
  // Move all items from one category to another
  const { error, count } = await supabase
    .from('pricing')
    .update({ category: toCategory }, { count: 'exact' })
    .eq('category', fromCategory);
    
  if (error) throw new Error(error.message);
  if (!count) throw new Error('Pricing category was not found or was not merged');
  
  revalidatePath('/admin/pricing');
}

export async function deleteCategory(categoryName: string) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  if (!categoryName.trim() || categoryName.length > 120) throw new Error('Invalid category name');

  const { error, count } = await supabase
    .from('pricing')
    .delete({ count: 'exact' })
    .eq('category', categoryName);

  if (error) throw new Error(error.message);
  if (!count) throw new Error('Pricing category was not found or was not deleted');

  revalidatePath('/admin/pricing');
}

// ─── Subsection Management ─────────────────────

export async function renameSubsection(category: string, oldName: string, newName: string) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  if (!category.trim() || !newName.trim() || category.length > 120 || oldName.length > 120 || newName.length > 120) {
    throw new Error('Invalid subsection name');
  }

  const { error } = await supabase
    .from('pricing')
    .update({ description: newName })
    .eq('category', category)
    .eq('description', oldName || '');

  if (error) throw new Error(error.message);

  revalidatePath('/admin/pricing');
}

export async function deleteSubsection(category: string, subsectionName: string) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();
  if (!category.trim() || category.length > 120 || subsectionName.length > 120) {
    throw new Error('Invalid subsection name');
  }

  const { error, count } = await supabase
    .from('pricing')
    .delete({ count: 'exact' })
    .eq('category', category)
    .eq('description', subsectionName || '');

  if (error) throw new Error(error.message);
  if (!count) throw new Error('Pricing subsection was not found or was not deleted');

  revalidatePath('/admin/pricing');
}

// ─── Direct Create (for tree editor) ─────────────

export async function createPricingDirect(formData: FormData) {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  const category = requireFormText(formData, 'category', 120);
  const name = requireFormText(formData, 'name', 240);
  const description = getFormText(formData, 'description', 2_000);
  const price = getFormText(formData, 'price', 120);
  const featuresStr = getFormText(formData, 'features', 5_000);

  const duration = getFormText(formData, 'duration', 120);
  const features = featuresStr ? [featuresStr] : [];

  // order_index will be automatically assigned by database sequence
  const { data, error } = await supabase
    .from('pricing')
    .insert({
      category,
      name,
      description,
      price,
      duration,
      visible: true,
      features,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/pricing');
  return data;
}

// ─── Pricing tree editor (server-only mutations) ───────────────────────────
//
// The tree editor is a Client Component because it needs drag-and-drop and
// local UI state.  It must not use the publishable Supabase client for writes:
// an authenticated-but-non-admin user would otherwise be able to mutate data
// whenever a historical `TO authenticated` RLS policy is present.  These
// Server Actions perform the same operations after the ADMIN_EMAILS check in
// requireAdminServerContext().

export interface PricingEditorItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  order_index: number;
  visible: boolean;
  /** JSON text keeps the client payload serialisable across the RSC boundary. */
  features: string;
}

type PricingEditorMutation =
  | { kind: 'reorder'; items: { id: string; order_index: number }[] }
  | { kind: 'updateItem'; id: string; name: string; price: string; features: string }
  | { kind: 'toggleVisibility'; id: string; visible: boolean }
  | { kind: 'deleteItem'; id: string }
  | { kind: 'createItem'; category: string; description: string; name: string; price: string; features: string }
  | { kind: 'renameCategory'; oldName: string; newName: string }
  | { kind: 'deleteCategory'; category: string }
  | { kind: 'renameSubsection'; category: string; oldName: string; newName: string }
  | { kind: 'deleteSubsection'; category: string; subsection: string }
  | { kind: 'moveToSlide'; id: string; slideIndex: number; features: string };

const EDITOR_CATEGORY_LABEL = 'Без категории';
const EDITOR_DEFAULT_SUBSECTION = 'Общие';

function editorText(value: unknown, field: string, maxLength: number, required = false): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const text = value.trim();
  if (text.length > maxLength || (required && !text)) throw new Error(`Invalid ${field}`);
  return text;
}

function editorCategory(value: unknown, allowEmpty = true): string {
  const category = editorText(value, 'category', 120);
  if (category === EDITOR_CATEGORY_LABEL) return '';
  if (!allowEmpty && !category) throw new Error('Category is required');
  return category;
}

function editorFeatures(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || value.length > 5_000) throw new Error('Invalid features');
  let parsed: unknown;
  try {
    parsed = value ? JSON.parse(value) : {};
  } catch {
    throw new Error('Invalid features');
  }
  if (!isPlainRecord(parsed)) throw new Error('Invalid features');
  return parsed;
}

function editorFeaturesText(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(editorFeatures(value));
    } catch {
      return JSON.stringify({});
    }
  }
  return isPlainRecord(value) ? JSON.stringify(value) : JSON.stringify({});
}

/** Read the editor data through an authenticated, allow-listed server action. */
export async function getPricingEditorItems(): Promise<PricingEditorItem[]> {
  const { supabase } = await requireAdminServerContext();
  const { data, error } = await supabase
    .from('pricing')
    .select('id,category,name,description,price,order_index,visible,features')
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    price: row.price ?? '',
    order_index: Number.isInteger(row.order_index) ? row.order_index : 0,
    visible: row.visible !== false,
    features: editorFeaturesText(row.features),
  }));
}

/**
 * Execute one tree-editor mutation after checking the authenticated admin.
 * The action intentionally returns no optimistic state; the client updates
 * its local state only after this call resolves successfully and then reads a
 * fresh list with getPricingEditorItems().
 */
export async function mutatePricingEditor(input: PricingEditorMutation): Promise<void> {
  await validateCSRF();
  const { supabase } = await requireAdminServerContext();

  if (!isPlainRecord(input) || typeof input.kind !== 'string') {
    throw new Error('Invalid pricing mutation');
  }

  switch (input.kind) {
    case 'reorder': {
      assertOrderedItems(input.items);
      // Use optimized batch update
      await batchUpdateOrder(supabase, 'pricing', input.items);
      break;
    }
    case 'updateItem': {
      assertUuid(input.id);
      const name = editorText(input.name, 'name', 500, true);
      const price = editorText(input.price, 'price', 120);
      const features = editorFeatures(input.features);
      const { error, count } = await supabase
        .from('pricing')
        .update({ name, price, features: features as unknown as string[] }, { count: 'exact' })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      if (count !== 1) throw new Error('Pricing item was not found or was not updated');
      break;
    }
    case 'toggleVisibility': {
      assertUuid(input.id);
      if (typeof input.visible !== 'boolean') throw new Error('Invalid visibility');
      const { error, count } = await supabase
        .from('pricing')
        .update({ visible: input.visible }, { count: 'exact' })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      if (count !== 1) throw new Error('Pricing item was not found or visibility was not updated');
      break;
    }
    case 'deleteItem': {
      assertUuid(input.id);
      const { error, count } = await supabase
        .from('pricing')
        .delete({ count: 'exact' })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      if (count !== 1) throw new Error('Pricing item was not found or was not deleted');
      break;
    }
    case 'createItem': {
      const category = editorCategory(input.category, false);
      const description = editorText(input.description, 'description', 2_000);
      const name = editorText(input.name, 'name', 500, true);
      const price = editorText(input.price, 'price', 120);
      const features = editorFeatures(input.features);

      // order_index will be automatically assigned by database sequence
      const { error } = await supabase.from('pricing').insert({
        category,
        description,
        name,
        price,
        visible: true,
        features: features as unknown as string[],
      });
      if (error) throw new Error(error.message);
      break;
    }
    case 'renameCategory': {
      const oldName = editorCategory(input.oldName);
      const newName = editorCategory(input.newName, false);
      const { error, count } = await supabase
        .from('pricing')
        .update({ category: newName }, { count: 'exact' })
        .eq('category', oldName);
      if (error) throw new Error(error.message);
      if (!count) throw new Error('Pricing category was not found or was not renamed');
      break;
    }
    case 'deleteCategory': {
      const category = editorCategory(input.category);
      const { error, count } = await supabase
        .from('pricing')
        .delete({ count: 'exact' })
        .eq('category', category);
      if (error) throw new Error(error.message);
      if (!count) throw new Error('Pricing category was not found or was not deleted');
      break;
    }
    case 'renameSubsection': {
      const category = editorCategory(input.category);
      const oldName = editorText(input.oldName, 'old subsection', 120);
      const newName = editorText(input.newName, 'subsection', 120, true);
      const categoryQuery = supabase
        .from('pricing')
        .update({ description: newName }, { count: 'exact' })
        .eq('category', category);
      const { error, count } = oldName === EDITOR_DEFAULT_SUBSECTION
        ? await categoryQuery.in('description', ['', EDITOR_DEFAULT_SUBSECTION])
        : await categoryQuery.eq('description', oldName);
      if (error) throw new Error(error.message);
      if (!count) throw new Error('Pricing subsection was not found or was not renamed');
      break;
    }
    case 'deleteSubsection': {
      const category = editorCategory(input.category);
      const subsection = editorText(input.subsection, 'subsection', 120);
      const categoryQuery = supabase.from('pricing').delete({ count: 'exact' }).eq('category', category);
      const { error, count } = subsection === EDITOR_DEFAULT_SUBSECTION
        ? await categoryQuery.in('description', ['', EDITOR_DEFAULT_SUBSECTION])
        : await categoryQuery.eq('description', subsection);
      if (error) throw new Error(error.message);
      if (!count) throw new Error('Pricing subsection was not found or was not deleted');
      break;
    }
    case 'moveToSlide': {
      assertUuid(input.id);
      if (!Number.isInteger(input.slideIndex) || input.slideIndex < 0 || input.slideIndex > 10_000) {
        throw new Error('Invalid slide index');
      }
      const features = editorFeatures(input.features);
      features.slideIndex = input.slideIndex;
      const { error, count } = await supabase
        .from('pricing')
        .update({ features: features as unknown as string[] }, { count: 'exact' })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      if (count !== 1) throw new Error('Pricing item was not found or slide was not updated');
      break;
    }
    default:
      throw new Error('Unsupported pricing mutation');
  }

  revalidatePath('/admin/pricing');
}
