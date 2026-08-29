-- Canonical database hardening migration.
-- Apply this migration after the existing schema migrations. The SQL files in
-- supabase/*.sql are historical/reference material and must not be replayed
-- after this migration because their old policies are intentionally permissive.
--
-- This migration establishes the database-side authorization boundary. The
-- browser only has the Supabase publishable key; every CMS table and Storage
-- mutation is additionally gated by public.is_admin().

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Do not expose the allow-list itself to either API role. With RLS enabled and
-- no policies, direct SELECT/INSERT/UPDATE/DELETE is denied as well; the
-- SECURITY DEFINER function below is the only supported read path.
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = auth.uid()
        AND is_active = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON TABLE public.admin_users IS
  'Trusted operator-managed CMS administrators. Direct API access is denied.';
COMMENT ON FUNCTION public.is_admin() IS
  'Returns true only for an active admin_users row or app_metadata.role=admin.';

-- Surface a safe operational warning when the migration was applied before a
-- trusted operator bootstrapped an administrator. There is deliberately no
-- self-service bootstrap function.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE is_active = true
  ) AND NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE COALESCE(raw_app_meta_data ->> 'role', '') = 'admin'
  ) THEN
    RAISE WARNING
      'CMS hardening is active but no administrator is configured. Insert a trusted user into public.admin_users (or set app_metadata.role=admin), then sign in again.';
  END IF;
END $$;

-- Existing policies are OR-combined by Postgres. Remove every policy on the
-- CMS tables before creating the canonical set, rather than relying on a
-- fragile list of historical policy names.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'pages', 'portfolio_items', 'services', 'pricing', 'testimonials',
        'employees', 'settings', 'testimonial_media', 'code_blocks',
        'activity_logs'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END $$;

-- All CMS writes and authenticated reads are admin-only. The conditional table
-- checks keep this migration safe across installations that have not enabled
-- an optional module yet.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pages', 'portfolio_items', 'services', 'pricing', 'testimonials',
    'employees', 'settings', 'testimonial_media', 'code_blocks',
    'activity_logs'
  ]
  LOOP
    IF to_regclass(format('public.%s', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        'CMS administrators full access', table_name
      );
    END IF;
  END LOOP;
END $$;

-- Public website reads remain available exactly where the existing CMS
-- contract requires them. Admins also read through the policy above. The
-- optional published column is handled dynamically because older installs may
-- still have the original table shape.
DO $$
DECLARE
  has_published boolean;
BEGIN
  IF to_regclass('public.pages') IS NOT NULL THEN
    CREATE POLICY "Public read pages" ON public.pages
      FOR SELECT TO anon USING (true);
  END IF;

  IF to_regclass('public.portfolio_items') IS NOT NULL THEN
    CREATE POLICY "Public read portfolio items" ON public.portfolio_items
      FOR SELECT TO anon USING (true);
  END IF;

  IF to_regclass('public.services') IS NOT NULL THEN
    CREATE POLICY "Public read services" ON public.services
      FOR SELECT TO anon USING (true);
  END IF;

  IF to_regclass('public.pricing') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'pricing'
        AND column_name = 'visible'
    ) THEN
      CREATE POLICY "Public read visible pricing" ON public.pricing
        FOR SELECT TO anon USING (visible = true);
    ELSE
      CREATE POLICY "Public read pricing" ON public.pricing
        FOR SELECT TO anon USING (true);
    END IF;
  END IF;

  IF to_regclass('public.testimonials') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'testimonials'
        AND column_name = 'published'
    ) INTO has_published;
    IF has_published THEN
      CREATE POLICY "Public read published testimonials" ON public.testimonials
        FOR SELECT TO anon USING (published = true);
    ELSE
      CREATE POLICY "Public read testimonials" ON public.testimonials
        FOR SELECT TO anon USING (true);
    END IF;
  END IF;

  IF to_regclass('public.employees') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'employees'
        AND column_name = 'published'
    ) INTO has_published;
    IF has_published THEN
      CREATE POLICY "Public read published employees" ON public.employees
        FOR SELECT TO anon USING (published = true);
    ELSE
      CREATE POLICY "Public read employees" ON public.employees
        FOR SELECT TO anon USING (true);
    END IF;
  END IF;

  IF to_regclass('public.settings') IS NOT NULL THEN
    CREATE POLICY "Public read settings" ON public.settings
      FOR SELECT TO anon USING (true);
  END IF;

  IF to_regclass('public.testimonial_media') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'testimonials'
        AND column_name = 'published'
    ) THEN
      CREATE POLICY "Public read published testimonial media" ON public.testimonial_media
        FOR SELECT TO anon USING (
          EXISTS (
            SELECT 1 FROM public.testimonials
            WHERE public.testimonials.id = testimonial_media.testimonial_id
              AND public.testimonials.published = true
          )
        );
    ELSE
      CREATE POLICY "Public read testimonial media" ON public.testimonial_media
        FOR SELECT TO anon USING (true);
    END IF;
  END IF;
END $$;

-- Pricing replacement is an admin-only atomic operation. Keep the operation
-- server-side and validate the payload before touching rows.
DO $$
BEGIN
  IF to_regclass('public.pricing') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'duration')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'features')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'order_index')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pricing' AND column_name = 'visible')
  THEN
    CREATE INDEX IF NOT EXISTS idx_pricing_order_index ON public.pricing (order_index);
    CREATE INDEX IF NOT EXISTS idx_pricing_visible ON public.pricing (visible) WHERE visible = true;

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.replace_pricing_atomic(payload jsonb)
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $body$
      DECLARE
        inserted_count integer;
      BEGIN
        IF NOT public.is_admin() THEN
          RAISE EXCEPTION 'Administrator access required';
        END IF;
        IF jsonb_typeof(payload) <> 'array' OR jsonb_array_length(payload) > 10000 THEN
          RAISE EXCEPTION 'Invalid pricing payload';
        END IF;

        DELETE FROM public.pricing;

        INSERT INTO public.pricing (category, name, description, price, duration, features, order_index, visible)
        SELECT
          left(COALESCE(value->>'category', ''), 120),
          left(COALESCE(value->>'name', ''), 500),
          left(COALESCE(value->>'description', ''), 2000),
          left(COALESCE(value->>'price', ''), 120),
          left(COALESCE(value->>'duration', ''), 120),
          COALESCE(value->'features', '[]'::jsonb),
          COALESCE((value->>'order_index')::integer, 0),
          COALESCE((value->>'visible')::boolean, true)
        FROM jsonb_array_elements(payload)
        WHERE COALESCE(value->>'name', '') <> '' OR COALESCE(value->>'price', '') <> '';

        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        RETURN inserted_count;
      END;
      $body$;
    $fn$;
    REVOKE ALL ON FUNCTION public.replace_pricing_atomic(jsonb) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.replace_pricing_atomic(jsonb) TO authenticated;
    COMMENT ON FUNCTION public.replace_pricing_atomic(jsonb) IS
      'Atomically replaces pricing rows after server-side admin authorization and payload validation.';
  END IF;
END $$;

-- Ensure the six CMS Storage buckets exist. Public read is limited to the
-- buckets explicitly used by this application; all writes and deletes are
-- restricted to administrators.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('portfolio', 'portfolio', true, 10485760, '{"image/*"}'),
  ('employees', 'employees', true, 10485760, '{"image/*"}'),
  ('services', 'services', true, 10485760, '{"image/*"}'),
  ('avatars', 'avatars', true, 5242880, '{"image/*"}'),
  ('logos', 'logos', true, 5242880, '{"image/*"}'),
  ('testimonials', 'testimonials', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- Remove every existing Storage policy. Policies are OR-combined, so keeping
-- a legacy "authenticated can upload" policy would defeat the admin check.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END $$;

CREATE POLICY "CMS administrators manage storage"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = ANY (ARRAY['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials'])
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials'])
    AND public.is_admin()
  );

CREATE POLICY "Public read CMS storage"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = ANY (ARRAY['portfolio', 'employees', 'services', 'avatars', 'logos', 'testimonials'])
  );
