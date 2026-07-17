-- ============================================================
-- CrimeLens — Seed Data for Ranks and Designations
-- Run this in your Supabase SQL Editor to populate the dropdowns
-- ============================================================

-- 1. Insert Ranks (Karnataka State Police Hierarchy)
INSERT INTO public."Rank" ("RankID", "RankName", "Hierarchy", "Active") VALUES
(1, 'Director General of Police (DGP)', 1, '1'),
(2, 'Additional Director General of Police (ADGP)', 2, '1'),
(3, 'Inspector General of Police (IGP)', 3, '1'),
(4, 'Deputy Inspector General of Police (DIG)', 4, '1'),
(5, 'Superintendent of Police (SP)', 5, '1'),
(6, 'Additional Superintendent of Police (Addl. SP)', 6, '1'),
(7, 'Deputy Superintendent of Police (DSP)', 7, '1'),
(8, 'Inspector of Police (PI)', 8, '1'),
(9, 'Sub-Inspector of Police (PSI)', 9, '1'),
(10, 'Assistant Sub-Inspector of Police (ASI)', 10, '1'),
(11, 'Head Constable (HC)', 11, '1'),
(12, 'Police Constable (PC)', 12, '1')
ON CONFLICT ("RankID") DO UPDATE 
SET "RankName" = EXCLUDED."RankName",
    "Hierarchy" = EXCLUDED."Hierarchy",
    "Active" = EXCLUDED."Active";

-- 2. Insert Designations
INSERT INTO public."Designation" ("DesignationID", "DesignationName", "Active", "SortOrder") VALUES
(1, 'Station House Officer (SHO)', '1', 1),
(2, 'Investigating Officer (IO)', '1', 2),
(3, 'Circle Inspector', '1', 3),
(4, 'Duty Officer', '1', 4),
(5, 'Cyber Crime Analyst', '1', 5),
(6, 'Intelligence Officer', '1', 6),
(7, 'Beat Officer', '1', 7),
(8, 'First Responder', '1', 8),
(9, 'Technical Staff', '1', 9)
ON CONFLICT ("DesignationID") DO UPDATE 
SET "DesignationName" = EXCLUDED."DesignationName",
    "Active" = EXCLUDED."Active",
    "SortOrder" = EXCLUDED."SortOrder";
