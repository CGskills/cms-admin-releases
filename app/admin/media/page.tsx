import { requireAdminServerContext } from '@/lib/auth/server';
import { listAdminStorageFiles, STORAGE_BUCKETS } from '@/lib/storage/server';
import MediaManager, { type MediaBucket } from './_components/MediaManager';

// Storage metadata changes outside the app, so always obtain a fresh listing
// when the Media tab is opened. Mutations still update the client state
// immediately through MediaManager.
export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const { supabase } = await requireAdminServerContext();

  const initialBuckets = await Promise.all(
    STORAGE_BUCKETS.map(async (bucket): Promise<MediaBucket> => {
      try {
        const files = await listAdminStorageFiles(bucket, supabase);
        return {
          bucket,
          files: files.map((file) => ({
            ...file,
            publicUrl: supabase.storage.from(bucket).getPublicUrl(file.path).data.publicUrl,
          })),
        };
      } catch (error: unknown) {
        return {
          bucket,
          files: [],
          error: error instanceof Error ? error.message : 'Unable to load this bucket',
        };
      }
    }),
  );

  return <MediaManager initialBuckets={initialBuckets} />;
}
