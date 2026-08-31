import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Batch update order_index for multiple items in a single transaction.
 * Uses PostgreSQL function for optimal performance.
 *
 * @param supabase - Authenticated Supabase client
 * @param table - Table name (must be whitelisted in SQL function)
 * @param items - Array of {id, order_index} objects
 * @throws {Error} If batch update fails
 */
export async function batchUpdateOrder(
  supabase: SupabaseClient,
  table: string,
  items: { id: string; order_index: number }[]
): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) {
    return; // Nothing to update
  }

  if (items.length > 1000) {
    throw new Error('Too many items to reorder at once (max 1000)');
  }

  // Validate table name (client-side check, server also validates)
  const allowedTables = ['employees', 'pricing', 'portfolio_items', 'testimonials'];
  if (!allowedTables.includes(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  // Call PostgreSQL function
  const { error } = await supabase.rpc('batch_update_order', {
    table_name: table,
    updates: items,
  });

  if (error) {
    console.error('[BATCH_UPDATE_ORDER] Error:', error);
    throw new Error(error.message || 'Failed to update order');
  }
}

/**
 * Legacy batch update using Promise.all (fallback if SQL function not available).
 * Less efficient but more compatible.
 *
 * @deprecated Use batchUpdateOrder instead
 */
export async function legacyBatchUpdateOrder(
  supabase: SupabaseClient,
  table: string,
  items: { id: string; order_index: number }[],
  concurrency: number = 12
): Promise<void> {
  // Process in batches to avoid overwhelming the database
  for (let start = 0; start < items.length; start += concurrency) {
    const batch = items.slice(start, start + concurrency);

    const results = await Promise.allSettled(
      batch.map(({ id, order_index }) =>
        supabase
          .from(table)
          .update({ order_index }, { count: 'exact' })
          .eq('id', id)
      )
    );

    // Check for errors
    for (const result of results) {
      if (result.status === 'rejected') {
        throw new Error(result.reason instanceof Error ? result.reason.message : 'Update failed');
      }
      if (result.status === 'fulfilled' && result.value.error) {
        throw new Error(result.value.error.message);
      }
      if (result.status === 'fulfilled' && result.value.count !== 1) {
        throw new Error('Item not found or not updated');
      }
    }
  }
}
