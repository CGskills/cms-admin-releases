import { createClient } from '@/lib/supabase/server';

export type ActivityAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
export type EntityType = 'portfolio' | 'pricing' | 'testimonials' | 'employees' | 'code_blocks';

interface LogActivityParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity({
  action,
  entityType,
  entityId,
  entityName,
  metadata,
}: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('activity_logs').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      metadata: metadata || null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
