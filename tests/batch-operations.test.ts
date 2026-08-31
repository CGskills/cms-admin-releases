import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock server-only import
vi.mock('server-only', () => ({}));

import { batchUpdateOrder, legacyBatchUpdateOrder } from '@/lib/database/batch-operations';

describe('Batch Operations', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
  });

  describe('batchUpdateOrder', () => {
    it('should call batch_update_order RPC function', async () => {
      const items = [
        { id: 'id-1', order_index: 0 },
        { id: 'id-2', order_index: 1 },
        { id: 'id-3', order_index: 2 },
      ];

      mockSupabase.rpc.mockResolvedValue({ error: null });

      await batchUpdateOrder(mockSupabase, 'employees', items);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('batch_update_order', {
        table_name: 'employees',
        updates: items,
      });
    });

    it('should handle empty items array', async () => {
      await batchUpdateOrder(mockSupabase, 'employees', []);

      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('should reject invalid table names', async () => {
      const items = [{ id: 'id-1', order_index: 0 }];

      await expect(
        batchUpdateOrder(mockSupabase, 'invalid_table', items)
      ).rejects.toThrow('Invalid table name');
    });

    it('should reject too many items', async () => {
      const items = Array.from({ length: 1001 }, (_, i) => ({
        id: `id-${i}`,
        order_index: i,
      }));

      await expect(
        batchUpdateOrder(mockSupabase, 'employees', items)
      ).rejects.toThrow('Too many items');
    });

    it('should throw error when RPC fails', async () => {
      const items = [{ id: 'id-1', order_index: 0 }];
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'Database error' },
      });

      await expect(
        batchUpdateOrder(mockSupabase, 'employees', items)
      ).rejects.toThrow('Database error');
    });
  });

  describe('legacyBatchUpdateOrder', () => {
    it('should update items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({
        id: `id-${i}`,
        order_index: i,
      }));

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      await legacyBatchUpdateOrder(mockSupabase, 'employees', items, 10);

      // Should call update for each item
      expect(mockUpdate).toHaveBeenCalledTimes(25);
      // Should call from with correct table
      expect(mockSupabase.from).toHaveBeenCalledWith('employees');
    });

    it('should handle update errors', async () => {
      const items = [{ id: 'id-1', order_index: 0 }];

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Update failed' },
            count: 0
          }),
        }),
      });

      await expect(
        legacyBatchUpdateOrder(mockSupabase, 'employees', items)
      ).rejects.toThrow('Update failed');
    });

    it('should handle rejected promises', async () => {
      const items = [{ id: 'id-1', order_index: 0 }];

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      });

      await expect(
        legacyBatchUpdateOrder(mockSupabase, 'employees', items)
      ).rejects.toThrow('Connection failed');
    });
  });
});
