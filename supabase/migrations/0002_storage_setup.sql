-- Bunana V2 — Storage Bucket
-- Created: 2026-07-29
-- Description: Create fabric-samples bucket
-- Note: Storage RLS policies applied via Management API (see 0001_initial_schema.sql for docs)

-- Create storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('fabric-samples', 'fabric-samples', true,
        ARRAY['image/png','image/jpeg','image/webp','image/gif'], 10485760)
ON CONFLICT (id) DO NOTHING;
