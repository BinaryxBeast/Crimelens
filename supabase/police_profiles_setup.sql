-- ============================================================
-- CrimeLens — Employee (Police Profiles) Setup & Triggers
-- Run this in your Supabase SQL Editor
-- Table names follow database_rules conventions
-- (database_rules: Employee.csv)
-- ============================================================

-- 1. Create the Employee table (formerly police_profiles)
CREATE TABLE IF NOT EXISTS public."Employee" (
  "EmployeeID" UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  "FirstName" TEXT NOT NULL,
  mobile_no TEXT NOT NULL,
  "KGID" TEXT UNIQUE NOT NULL,
  "DesignationID" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS and setup policies
ALTER TABLE public."Employee" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can view their own profile"
  ON public."Employee" FOR SELECT
  USING (auth.uid() = "EmployeeID");

CREATE POLICY "Officers can update their own profile"
  ON public."Employee" FOR UPDATE
  USING (auth.uid() = "EmployeeID");

-- Allow public to view Employee profiles (useful if displaying officer info on public FIRs)
CREATE POLICY "Public can view Employee profiles"
  ON public."Employee" FOR SELECT
  USING (true);

-- 3. Trigger Function: Inject Officer Details into Complaint
CREATE OR REPLACE FUNCTION public.inject_officer_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS if necessary
AS $$
DECLARE
  v_officer_name TEXT;
  v_officer_mobile TEXT;
  v_officer_no TEXT;
  v_officer_post TEXT;
BEGIN
  -- Fetch the profile of the user making the insert request
  SELECT "FirstName", mobile_no, "KGID", "DesignationID"
  INTO v_officer_name, v_officer_mobile, v_officer_no, v_officer_post
  FROM public."Employee"
  WHERE "EmployeeID" = auth.uid();

  -- If a profile exists for the current user, merge the details into the complaint_data JSONB
  IF FOUND THEN
    -- Ensure complaint_data is not null before merging
    IF NEW.complaint_data IS NULL THEN
      NEW.complaint_data := '{}'::jsonb;
    END IF;

    -- Inject the officer details into the JSONB object
    NEW.complaint_data := NEW.complaint_data || jsonb_build_object(
      'officer_name', v_officer_name,
      'officer_mobile', v_officer_mobile,
      'officer_no', v_officer_no,
      'officer_post', v_officer_post
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach Trigger to CaseMaster table (formerly incidents)
DROP TRIGGER IF EXISTS trg_inject_officer_details ON public."CaseMaster";

CREATE TRIGGER trg_inject_officer_details
BEFORE INSERT ON public."CaseMaster"
FOR EACH ROW
EXECUTE FUNCTION public.inject_officer_details();
