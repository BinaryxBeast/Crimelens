-- ============================================================
-- CrimeLens — Migration: Add complaint_data + Storage
-- Run this in your Supabase SQL Editor
-- Table names follow database_rules conventions
-- ============================================================

-- 1. Clear ALL existing data
TRUNCATE TABLE "CaseMasterAccused" CASCADE;
TRUNCATE TABLE "Victim" CASCADE;
TRUNCATE TABLE "CaseMaster" CASCADE;
TRUNCATE TABLE "Accused" CASCADE;

-- 2. Add complaint_data JSONB column to CaseMaster
ALTER TABLE "CaseMaster" ADD COLUMN IF NOT EXISTS complaint_data jsonb DEFAULT '{}';

-- 3. Make some columns optional (latitude/longitude can default to 0)
ALTER TABLE "CaseMaster" ALTER COLUMN latitude SET DEFAULT 0;
ALTER TABLE "CaseMaster" ALTER COLUMN longitude SET DEFAULT 0;

-- 4. Create the storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies: allow authenticated users to upload and public to read
CREATE POLICY "Anyone can view complaint images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-images');

CREATE POLICY "Authenticated users can upload complaint images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'complaint-images');

CREATE POLICY "Authenticated users can update complaint images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'complaint-images');

CREATE POLICY "Authenticated users can delete complaint images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'complaint-images');

-- 6. Index on complaint_data for search (GIN index)
CREATE INDEX IF NOT EXISTS idx_CaseMaster_complaint_data ON "CaseMaster" USING gin(complaint_data);
