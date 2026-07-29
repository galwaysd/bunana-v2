-- Bunana V2 — Initial Schema
-- Created: 2026-07-29
-- Description: Tables + RLS + Storage for fabric requirements publishing

-- ============================================================
-- 1. image_assets — SHA-256 dedup image registry
-- ============================================================
CREATE TABLE IF NOT EXISTS image_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sha256 text UNIQUE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for SHA-256 lookups (dedup)
CREATE INDEX IF NOT EXISTS idx_image_assets_sha256 ON image_assets (sha256);

-- Enable RLS
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read image assets (needed for /square display)
CREATE POLICY "image_assets_public_read"
  ON image_assets FOR SELECT
  USING (true);

-- Service role: full access (insert via API)
CREATE POLICY "image_assets_service_insert"
  ON image_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "image_assets_service_update"
  ON image_assets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. requirements — Fabric DNA publish records (V2 simplified)
-- ============================================================
CREATE TABLE IF NOT EXISTS requirements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  category text NOT NULL DEFAULT '其他面料',
  fabric_name text NOT NULL DEFAULT '',
  specs text NOT NULL DEFAULT '',
  keywords jsonb DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  confidence real NOT NULL DEFAULT 0,
  image_ids jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  ai_provider text NOT NULL DEFAULT 'demo',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requirements_created_at ON requirements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_category ON requirements (category);

-- Enable RLS
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read published requirements (/square)
CREATE POLICY "requirements_public_read"
  ON requirements FOR SELECT
  USING (true);

-- Service role: insert requirements (publish via API)
CREATE POLICY "requirements_service_insert"
  ON requirements FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 3. Storage — fabric-samples bucket
--    NOTE: Buckets must be created via Supabase Dashboard
--    or Management API. This comment serves as documentation.
--    Run after project creation:
--      Dashboard → Storage → New Bucket → "fabric-samples"
--      Settings: Public bucket = ON
--      Allowed MIME Types: image/png, image/jpeg, image/webp, image/gif
--      File size limit: 10 MB
-- ============================================================

-- Storage RLS: applied after bucket is created manually
-- Note: These policies only take effect AFTER the bucket exists.
-- Create the bucket via Dashboard or Management API first.

-- Public read for fabric-samples bucket
-- Run this after bucket creation:
-- BEGIN;
--   CREATE POLICY "fabric_samples_public_read"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'fabric-samples');
--   CREATE POLICY "fabric_samples_service_insert"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'fabric-samples');
-- COMMIT;
