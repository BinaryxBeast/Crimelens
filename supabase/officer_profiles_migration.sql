-- ============================================================
-- CrimeLens — Officer Profiles Migration
-- Links auth.users to officer details (name, rank, KGID, unit, photo)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the officer_profiles table
CREATE TABLE IF NOT EXISTS public.officer_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  officer_name TEXT NOT NULL DEFAULT '',
  rank_id INTEGER REFERENCES "Rank"("RankID"),
  kgid TEXT DEFAULT '',
  unit_id INTEGER REFERENCES "Unit"("UnitID"),
  district_id INTEGER REFERENCES "District"("DistrictID"),
  designation_id INTEGER REFERENCES "Designation"("DesignationID"),
  mobile_no TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.officer_profiles IS 'Links Supabase auth users to their police officer profile details';
COMMENT ON COLUMN public.officer_profiles.id IS 'FK → auth.users.id — the authenticated user this profile belongs to';
COMMENT ON COLUMN public.officer_profiles.officer_name IS 'Full name of the officer';
COMMENT ON COLUMN public.officer_profiles.rank_id IS 'FK → Rank.RankID — current rank of the officer';
COMMENT ON COLUMN public.officer_profiles.kgid IS 'Karnataka Government ID (unique officer number)';
COMMENT ON COLUMN public.officer_profiles.unit_id IS 'FK → Unit.UnitID — police station/unit the officer is posted at';
COMMENT ON COLUMN public.officer_profiles.district_id IS 'FK → District.DistrictID — district the officer is posted in';
COMMENT ON COLUMN public.officer_profiles.designation_id IS 'FK → Designation.DesignationID — current designation';
COMMENT ON COLUMN public.officer_profiles.mobile_no IS 'Officer mobile number';
COMMENT ON COLUMN public.officer_profiles.photo_url IS 'URL to the officer photograph in Supabase Storage';

-- 2. Enable RLS
ALTER TABLE public.officer_profiles ENABLE ROW LEVEL SECURITY;

-- Officers can view their own profile
CREATE POLICY "officers_select_own_profile"
  ON public.officer_profiles FOR SELECT
  USING (auth.uid() = id);

-- Officers can update their own profile
CREATE POLICY "officers_update_own_profile"
  ON public.officer_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Officers can insert their own profile (first-time setup)
CREATE POLICY "officers_insert_own_profile"
  ON public.officer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow any authenticated user to read any profile (for displaying officer info on FIRs)
CREATE POLICY "authenticated_read_all_profiles"
  ON public.officer_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_officer_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_officer_profile_timestamp ON public.officer_profiles;
CREATE TRIGGER trg_officer_profile_timestamp
  BEFORE UPDATE ON public.officer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_officer_profile_timestamp();

-- 4. Create storage bucket for officer photos (run separately if needed)
-- In Supabase Dashboard: Storage → Create Bucket → Name: officer-photos, Public: Yes
-- Or use the SQL below:
INSERT INTO storage.buckets (id, name, public)
VALUES ('officer-photos', 'officer-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for officer photos
CREATE POLICY "officers_upload_own_photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'officer-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "officers_update_own_photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'officer-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "public_read_officer_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'officer-photos');
