-- Generated Migration SQL

CREATE TABLE IF NOT EXISTS "Accused" (
  "AccusedMasterID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CaseMasterID" uuid,
  "AccusedName" TEXT,
  "AgeYear" INTEGER,
  "GenderID" INTEGER,
  "PersonID" TEXT
);

COMMENT ON COLUMN "Accused"."AccusedMasterID" IS 'Primary key — unique identifier for each accused person';
COMMENT ON COLUMN "Accused"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case this accused is linked to';
COMMENT ON COLUMN "Accused"."AccusedName" IS 'Full name of the accused';
COMMENT ON COLUMN "Accused"."AgeYear" IS 'Age of the accused';
COMMENT ON COLUMN "Accused"."GenderID" IS 'Gender of the accused mentioned as M/F/T';
COMMENT ON COLUMN "Accused"."PersonID" IS 'Accused Sorting like A1, A2, A3….';

CREATE TABLE IF NOT EXISTS "Act" (
  "ActCode" TEXT PRIMARY KEY,
  "ActDescription" TEXT,
  "ShortName" TEXT,
  "Active" BIT
);

COMMENT ON COLUMN "Act"."ActCode" IS 'Primary key — unique code for the legal act (e.g. IPC, NDPS)';
COMMENT ON COLUMN "Act"."ActDescription" IS 'Full official name/description of the act';
COMMENT ON COLUMN "Act"."ShortName" IS 'Abbreviated/common name of the act';
COMMENT ON COLUMN "Act"."Active" IS 'Whether the act is currently active and usable (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "ActSectionAssociation" (
  "CaseMasterID" uuid,
  "ActID" INTEGER,
  "SectionID" INTEGER,
  "ActOrderID" INTEGER,
  "SectionOrderID" INTEGER
);

COMMENT ON COLUMN "ActSectionAssociation"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case this act-section applies to';
COMMENT ON COLUMN "ActSectionAssociation"."ActID" IS 'FK → Act.ActCode — legal act under which charges are framed';
COMMENT ON COLUMN "ActSectionAssociation"."SectionID" IS 'FK → Section.SectionCode — specific section of the act invoked';
COMMENT ON COLUMN "ActSectionAssociation"."ActOrderID" IS 'Display/print order of the act within the case';
COMMENT ON COLUMN "ActSectionAssociation"."SectionOrderID" IS 'Display/print order of the section under the act';

CREATE TABLE IF NOT EXISTS "ArrestSurrender" (
  "ArrestSurrenderID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CaseMasterID" uuid,
  "ArrestSurrenderTypeID" INTEGER,
  "ArrestSurrenderDate" DATE,
  "ArrestSurrenderStateId" INTEGER,
  "ArrestSurrenderDistrictId" INTEGER,
  "PoliceStationID" INTEGER,
  "IOID" INTEGER,
  "CourtID" INTEGER,
  "AccusedMasterID" uuid,
  "IsAccused" BIT,
  "IsComplainantAccused" BIT
);

COMMENT ON COLUMN "ArrestSurrender"."ArrestSurrenderID" IS 'Primary key — unique identifier for each arrest/surrender event';
COMMENT ON COLUMN "ArrestSurrender"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case linked to this arrest/surrender';
COMMENT ON COLUMN "ArrestSurrender"."ArrestSurrenderTypeID" IS 'Type of event: arrest or voluntary surrender (lookup value)';
COMMENT ON COLUMN "ArrestSurrender"."ArrestSurrenderDate" IS 'Date of arrest or surrender';
COMMENT ON COLUMN "ArrestSurrender"."ArrestSurrenderStateId" IS 'FK → State.StateID — state where arrest/surrender occurred';
COMMENT ON COLUMN "ArrestSurrender"."ArrestSurrenderDistrictId" IS 'FK → District.DistrictID — district where arrest/surrender occurred';
COMMENT ON COLUMN "ArrestSurrender"."PoliceStationID" IS 'FK → Unit.UnitID — police station handling the arrest';
COMMENT ON COLUMN "ArrestSurrender"."IOID" IS 'FK → Employee.EmployeeID — Investigating Officer who made the arrest';
COMMENT ON COLUMN "ArrestSurrender"."CourtID" IS 'FK → Court.CourtID — court before which accused was produced';
COMMENT ON COLUMN "ArrestSurrender"."AccusedMasterID" IS 'FK → Accused.AccusedMasterID — accused person linked to this arrest/surrender';
COMMENT ON COLUMN "ArrestSurrender"."IsAccused" IS 'Flag (0/1): whether the person is the primary accused in the case';
COMMENT ON COLUMN "ArrestSurrender"."IsComplainantAccused" IS 'Flag (0/1): whether the complainant is also listed as accused';

CREATE TABLE IF NOT EXISTS "CaseCategory" (
  "CaseCategoryID" INTEGER PRIMARY KEY,
  "LookupValue" TEXT
);

COMMENT ON COLUMN "CaseCategory"."CaseCategoryID" IS 'Primary key — unique identifier for the case category. Referenced by CaseMaster.CaseCategoryID';
COMMENT ON COLUMN "CaseCategory"."LookupValue" IS 'Category name (FIR, UDR, PAR..)';

CREATE TABLE IF NOT EXISTS "CaseMaster" (
  "CaseMasterID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CrimeNo" TEXT,
  "CaseNo" TEXT,
  "CrimeRegisteredDate" DATE,
  "PolicePersonID" INTEGER,
  "PoliceStationID" INTEGER,
  "CaseCategoryID" INTEGER,
  "GravityOffenceID" INTEGER,
  "CrimeMajorHeadID" INTEGER,
  "CrimeMinorHeadID" INTEGER,
  "CaseStatusID" INTEGER,
  "CourtID" INTEGER,
  "IncidentFromDate" TIMESTAMP,
  "IncidentToDate" TIMESTAMP,
  "InfoReceivedPSDate" TIMESTAMP,
  "latitude" DECIMAL,
  "longitude" DECIMAL,
  "BriefFacts" TEXT
);

COMMENT ON COLUMN "CaseMaster"."CaseMasterID" IS 'Primary key — unique identifier for each FIR/case';
COMMENT ON COLUMN "CaseMaster"."CrimeNo" IS 'Crime Number is assigned at the police station level and is linked to the corresponding PoliceStationID. The Crime Number follows a structured format consisting of: 1 digit Case Category Code + 4 digit District ID + 4 digit Police Station ID (Unit ID) + 4 digit Year + 5 digit Running Serial Number A separate running serial number is maintained for each police station, case category, and year. Examples: • FIR: 104430006202600001 • UDR: 304430006202600001 • Zero FIR: 804430006202600001 • PAR: 404430006202600001';
COMMENT ON COLUMN "CaseMaster"."CaseNo" IS 'The Case Number is generated at the police station level and is associated with the corresponding PoliceStationID. For each case category, a unique serial number is maintained per police station and per year. The format is YYYY + 5-digit running serial number (e.g., 202600001). (Last 9 digits from CrimeNo)';
COMMENT ON COLUMN "CaseMaster"."CrimeRegisteredDate" IS 'Date when the FIR was registered';
COMMENT ON COLUMN "CaseMaster"."PolicePersonID" IS 'FK → Employee.EmployeeID — officer who registered the FIR';
COMMENT ON COLUMN "CaseMaster"."PoliceStationID" IS 'FK → Unit.UnitID — police station where FIR is registered';
COMMENT ON COLUMN "CaseMaster"."CaseCategoryID" IS 'FK → CaseCategory.CaseCategoryID — category';
COMMENT ON COLUMN "CaseMaster"."GravityOffenceID" IS 'FK → GravityOffence.GravityOffenceID — gravity level of the offence';
COMMENT ON COLUMN "CaseMaster"."CrimeMajorHeadID" IS 'FK → CrimeHead.CrimeHeadID — major crime head classification';
COMMENT ON COLUMN "CaseMaster"."CrimeMinorHeadID" IS 'FK → CrimeSubHead.CrimeSubHeadID — minor crime sub-head classification';
COMMENT ON COLUMN "CaseMaster"."CaseStatusID" IS 'FK → CaseStatusMaster.CaseStatusID — current status of the case';
COMMENT ON COLUMN "CaseMaster"."CourtID" IS 'FK → Court.CourtID — court where the case is being heard';
COMMENT ON COLUMN "CaseMaster"."IncidentFromDate" IS 'Start date and time of the incident';
COMMENT ON COLUMN "CaseMaster"."IncidentToDate" IS 'End date and time of the incident';
COMMENT ON COLUMN "CaseMaster"."InfoReceivedPSDate" IS 'Date and time when police station received information about the incident';
COMMENT ON COLUMN "CaseMaster"."latitude" IS 'GPS latitude coordinate of the incident location';
COMMENT ON COLUMN "CaseMaster"."longitude" IS 'GPS longitude coordinate of the incident location';
COMMENT ON COLUMN "CaseMaster"."BriefFacts" IS 'Summary of the case';

CREATE TABLE IF NOT EXISTS "CaseStatusMaster" (
  "CaseStatusID" INTEGER PRIMARY KEY,
  "CaseStatusName" TEXT
);

COMMENT ON COLUMN "CaseStatusMaster"."CaseStatusID" IS 'Primary key — unique identifier for each case status. Referenced by CaseMaster.CaseStatusID';
COMMENT ON COLUMN "CaseStatusMaster"."CaseStatusName" IS 'Name of the status (e.g. Under Investigation, Charge Sheeted, Closed)';

CREATE TABLE IF NOT EXISTS "CasteMaster" (
  "caste_master_id" INTEGER PRIMARY KEY,
  "caste_master_name" TEXT
);

COMMENT ON COLUMN "CasteMaster"."caste_master_id" IS 'Primary key — unique identifier for each caste. Referenced by ComplainantDetails.CasteID';
COMMENT ON COLUMN "CasteMaster"."caste_master_name" IS 'Name of the caste';

CREATE TABLE IF NOT EXISTS "ChargesheetDetails" (
  "CSID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CaseMasterID" uuid,
  "csdate" TIMESTAMP,
  "cstype" CHAR,
  "PolicePersonID" INTEGER
);

COMMENT ON COLUMN "ChargesheetDetails"."CSID" IS 'Primary key — unique identifier for the chargesheet';
COMMENT ON COLUMN "ChargesheetDetails"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case filed by this complainant';
COMMENT ON COLUMN "ChargesheetDetails"."csdate" IS 'Chargesheeted date';
COMMENT ON COLUMN "ChargesheetDetails"."cstype" IS 'Final report type A-> Chargesheet, B->False Case, C->Undetected';
COMMENT ON COLUMN "ChargesheetDetails"."PolicePersonID" IS 'FK → Employee.EmployeeID';

CREATE TABLE IF NOT EXISTS "ComplainantDetails" (
  "ComplainantID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CaseMasterID" uuid,
  "ComplainantName" TEXT,
  "AgeYear" INTEGER,
  "OccupationID" INTEGER,
  "ReligionID" INTEGER,
  "CasteID" INTEGER,
  "GenderID" INTEGER
);

COMMENT ON COLUMN "ComplainantDetails"."ComplainantID" IS 'Primary key — unique identifier for the complainant';
COMMENT ON COLUMN "ComplainantDetails"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case filed by this complainant';
COMMENT ON COLUMN "ComplainantDetails"."ComplainantName" IS 'Full name of the complainant';
COMMENT ON COLUMN "ComplainantDetails"."AgeYear" IS 'Age of the complainant';
COMMENT ON COLUMN "ComplainantDetails"."OccupationID" IS 'FK → OccupationMaster.OccupationID — occupation of the complainant';
COMMENT ON COLUMN "ComplainantDetails"."ReligionID" IS 'FK → ReligionMaster.ReligionID — religion of the complainant';
COMMENT ON COLUMN "ComplainantDetails"."CasteID" IS 'FK → CasteMaster.caste_master_id — caste of the complainant';
COMMENT ON COLUMN "ComplainantDetails"."GenderID" IS 'Gender of the complainant (lookup value)';

CREATE TABLE IF NOT EXISTS "Court" (
  "CourtID" INTEGER PRIMARY KEY,
  "CourtName" TEXT,
  "DistrictID" INTEGER,
  "StateID" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "Court"."CourtID" IS 'Primary key — unique identifier for the court. Referenced by CaseMaster.CourtID, ArrestSurrender.CourtID';
COMMENT ON COLUMN "Court"."CourtName" IS 'Full name of the court';
COMMENT ON COLUMN "Court"."DistrictID" IS 'FK → District.DistrictID — district where the court is located';
COMMENT ON COLUMN "Court"."StateID" IS 'FK → State.StateID — state where the court is located';
COMMENT ON COLUMN "Court"."Active" IS 'Whether the court is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "CrimeHead" (
  "CrimeHeadID" INTEGER PRIMARY KEY,
  "CrimeGroupName" TEXT,
  "Active" BIT
);

COMMENT ON COLUMN "CrimeHead"."CrimeHeadID" IS 'Primary key — unique identifier for the major crime head';
COMMENT ON COLUMN "CrimeHead"."CrimeGroupName" IS 'Name of the crime group/major head (e.g. Crimes Against Body)';
COMMENT ON COLUMN "CrimeHead"."Active" IS 'Whether this crime head is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "CrimeHeadActSection" (
  "CrimeHeadID" INTEGER,
  "ActCode" TEXT,
  "SectionCode" TEXT
);

COMMENT ON COLUMN "CrimeHeadActSection"."CrimeHeadID" IS 'FK → CrimeHead.CrimeHeadID — crime head this act-section combination maps to';
COMMENT ON COLUMN "CrimeHeadActSection"."ActCode" IS 'FK → Act.ActCode — legal act linked to this crime head';
COMMENT ON COLUMN "CrimeHeadActSection"."SectionCode" IS 'Section code from the act applicable to this crime head';

CREATE TABLE IF NOT EXISTS "CrimeSubHead" (
  "CrimeSubHeadID" INTEGER PRIMARY KEY,
  "CrimeHeadID" INTEGER,
  "CrimeHeadName" TEXT,
  "SeqID" INTEGER
);

COMMENT ON COLUMN "CrimeSubHead"."CrimeSubHeadID" IS 'Primary key — unique identifier for the crime sub-head';
COMMENT ON COLUMN "CrimeSubHead"."CrimeHeadID" IS 'FK → CrimeHead.CrimeHeadID — parent major crime head this belongs to';
COMMENT ON COLUMN "CrimeSubHead"."CrimeHeadName" IS 'Name of this crime sub-head (e.g. Murder, Robbery)';
COMMENT ON COLUMN "CrimeSubHead"."SeqID" IS 'Display/sort sequence number for ordering sub-heads';

CREATE TABLE IF NOT EXISTS "Designation" (
  "DesignationID" INTEGER PRIMARY KEY,
  "DesignationName" TEXT,
  "Active" BIT,
  "SortOrder" INTEGER
);

COMMENT ON COLUMN "Designation"."DesignationID" IS 'Primary key — unique identifier for the designation. Referenced by Employee.DesignationID';
COMMENT ON COLUMN "Designation"."DesignationName" IS 'Name of the designation (e.g. Investigating Officer, SHO)';
COMMENT ON COLUMN "Designation"."Active" IS 'Whether the designation is active (1=Active, 0=Inactive)';
COMMENT ON COLUMN "Designation"."SortOrder" IS 'Display sort order for dropdowns/reports';

CREATE TABLE IF NOT EXISTS "District" (
  "DistrictID" INTEGER PRIMARY KEY,
  "DistrictName" TEXT,
  "StateID" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "District"."DistrictID" IS 'Primary key — unique identifier for the district. Referenced by Court, Unit, Employee, ArrestSurrender';
COMMENT ON COLUMN "District"."DistrictName" IS 'Name of the district';
COMMENT ON COLUMN "District"."StateID" IS 'FK → State.StateID — state this district belongs to';
COMMENT ON COLUMN "District"."Active" IS 'Whether the district record is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "Employee" (
  "EmployeeID" INTEGER PRIMARY KEY,
  "DistrictID" INTEGER,
  "UnitID" INTEGER,
  "RankID" INTEGER,
  "DesignationID" INTEGER,
  "KGID" TEXT,
  "FirstName" TEXT,
  "EmployeeDOB" DATE,
  "GenderID" INTEGER,
  "BloodGroupID" INTEGER,
  "PhysicallyChallenged" BIT,
  "AppointmentDate" DATE
);

COMMENT ON COLUMN "Employee"."EmployeeID" IS 'Primary key — unique identifier for the police employee. Referenced by CaseMaster.PolicePersonID, ArrestSurrender.IOID';
COMMENT ON COLUMN "Employee"."DistrictID" IS 'FK → District.DistrictID — district the employee is currently posted in';
COMMENT ON COLUMN "Employee"."UnitID" IS 'FK → Unit.UnitID — unit/police station the employee is assigned to';
COMMENT ON COLUMN "Employee"."RankID" IS 'FK → Rank.RankID — current rank of the employee';
COMMENT ON COLUMN "Employee"."DesignationID" IS 'FK → Designation.DesignationID — current designation of the employee';
COMMENT ON COLUMN "Employee"."KGID" IS 'Karnataka Government ID (unique government employee number)';
COMMENT ON COLUMN "Employee"."FirstName" IS 'First name of the employee';
COMMENT ON COLUMN "Employee"."EmployeeDOB" IS 'Date of birth of the employee';
COMMENT ON COLUMN "Employee"."GenderID" IS 'Gender of the employee (lookup value)';
COMMENT ON COLUMN "Employee"."BloodGroupID" IS 'Blood group of the employee (lookup value)';
COMMENT ON COLUMN "Employee"."PhysicallyChallenged" IS 'Flag: whether the employee is physically challenged (1=Yes, 0=No)';
COMMENT ON COLUMN "Employee"."AppointmentDate" IS 'Date of appointment to government service';

CREATE TABLE IF NOT EXISTS "GravityOffence" (
  "GravityOffenceID" INTEGER PRIMARY KEY,
  "LookupValue" TEXT
);

COMMENT ON COLUMN "GravityOffence"."GravityOffenceID" IS 'Primary key — unique identifier for the gravity level. Referenced by CaseMaster.GravityOffenceID';
COMMENT ON COLUMN "GravityOffence"."LookupValue" IS 'Gravity description (e.g. Heinous, Non-Heinous)';

CREATE TABLE IF NOT EXISTS "OccupationMaster" (
  "OccupationID" INTEGER PRIMARY KEY,
  "OccupationName" TEXT
);

COMMENT ON COLUMN "OccupationMaster"."OccupationID" IS 'Primary key — unique identifier for each occupation. Referenced by ComplainantDetails.OccupationID';
COMMENT ON COLUMN "OccupationMaster"."OccupationName" IS 'Name of the occupation (e.g. Farmer, Government Employee)';

CREATE TABLE IF NOT EXISTS "Rank" (
  "RankID" INTEGER PRIMARY KEY,
  "RankName" TEXT,
  "Hierarchy" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "Rank"."RankID" IS 'Primary key — unique identifier for the rank. Referenced by Employee.RankID';
COMMENT ON COLUMN "Rank"."RankName" IS 'Name of the police rank (e.g. Constable, Inspector, DSP)';
COMMENT ON COLUMN "Rank"."Hierarchy" IS 'Rank hierarchy level (lower = higher rank)';
COMMENT ON COLUMN "Rank"."Active" IS 'Whether the rank is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "ReligionMaster" (
  "ReligionID" INTEGER PRIMARY KEY,
  "ReligionName" TEXT
);

COMMENT ON COLUMN "ReligionMaster"."ReligionID" IS 'Primary key — unique identifier for each religion. Referenced by ComplainantDetails.ReligionID';
COMMENT ON COLUMN "ReligionMaster"."ReligionName" IS 'Name of the religion (e.g. Hindu, Muslim, Christian)';

CREATE TABLE IF NOT EXISTS "Section" (
  "ActCode" TEXT,
  "SectionCode" TEXT,
  "SectionDescription" TEXT,
  "Active" BIT
);

COMMENT ON COLUMN "Section"."ActCode" IS 'FK → Act.ActCode — parent act this section belongs to';
COMMENT ON COLUMN "Section"."SectionCode" IS 'Section number/code (e.g. 302, 307)';
COMMENT ON COLUMN "Section"."SectionDescription" IS 'Full description of the section';
COMMENT ON COLUMN "Section"."Active" IS 'Whether the section is currently active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "State" (
  "StateID" INTEGER PRIMARY KEY,
  "StateName" TEXT,
  "NationalityID" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "State"."StateID" IS 'Primary key — unique identifier for the state. Referenced by Court, District, Unit, ArrestSurrender';
COMMENT ON COLUMN "State"."StateName" IS 'Name of the state';
COMMENT ON COLUMN "State"."NationalityID" IS 'Nationality reference ID';
COMMENT ON COLUMN "State"."Active" IS 'Whether the state record is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "Unit" (
  "UnitID" INTEGER PRIMARY KEY,
  "UnitName" TEXT,
  "TypeID" INTEGER,
  "ParentUnit" INTEGER,
  "NationalityID" INTEGER,
  "StateID" INTEGER,
  "DistrictID" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "Unit"."UnitID" IS 'Primary key — unique identifier for the police unit. Referenced by CaseMaster.PoliceStationID, Employee.UnitID, ArrestSurrender.PoliceStationID';
COMMENT ON COLUMN "Unit"."UnitName" IS 'Name of the unit or police station';
COMMENT ON COLUMN "Unit"."TypeID" IS 'FK → UnitType.UnitTypeID — type/category of the unit';
COMMENT ON COLUMN "Unit"."ParentUnit" IS 'Parent unit ID for hierarchy (self-reference to UnitID)';
COMMENT ON COLUMN "Unit"."NationalityID" IS 'Nationality reference ID';
COMMENT ON COLUMN "Unit"."StateID" IS 'FK → State.StateID — state the unit belongs to';
COMMENT ON COLUMN "Unit"."DistrictID" IS 'FK → District.DistrictID — district the unit belongs to';
COMMENT ON COLUMN "Unit"."Active" IS 'Whether the unit is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "UnitType" (
  "UnitTypeID" INTEGER PRIMARY KEY,
  "UnitTypeName" TEXT,
  "CityDistState" TEXT,
  "Hierarchy" INTEGER,
  "Active" BIT
);

COMMENT ON COLUMN "UnitType"."UnitTypeID" IS 'Primary key — unique identifier for the unit type. Referenced by Unit.TypeID';
COMMENT ON COLUMN "UnitType"."UnitTypeName" IS 'Name of the unit type (e.g. Police Station, Circle Office)';
COMMENT ON COLUMN "UnitType"."CityDistState" IS 'Operational level: City / District / State';
COMMENT ON COLUMN "UnitType"."Hierarchy" IS 'Hierarchy level number (lower = higher authority)';
COMMENT ON COLUMN "UnitType"."Active" IS 'Whether the unit type is active (1=Active, 0=Inactive)';

CREATE TABLE IF NOT EXISTS "Victim" (
  "VictimMasterID" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "CaseMasterID" uuid,
  "VictimName" TEXT,
  "AgeYear" INTEGER,
  "GenderID" INTEGER,
  "VictimPolice" TEXT
);

COMMENT ON COLUMN "Victim"."VictimMasterID" IS 'Primary key — unique identifier for each victim';
COMMENT ON COLUMN "Victim"."CaseMasterID" IS 'FK → CaseMaster.CaseMasterID — FIR/case this victim belongs to';
COMMENT ON COLUMN "Victim"."VictimName" IS 'Full name of the victim';
COMMENT ON COLUMN "Victim"."AgeYear" IS 'Age of the victim in years';
COMMENT ON COLUMN "Victim"."GenderID" IS 'Gender of the victim (lookup value) like m, f, t';
COMMENT ON COLUMN "Victim"."VictimPolice" IS 'If Victim is police then 1else 0';


-- Foreign Keys

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_victim_casemasterid_casemaster') THEN
    ALTER TABLE "Victim" ADD CONSTRAINT "fk_victim_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_accused_casemasterid_casemaster') THEN
    ALTER TABLE "Accused" ADD CONSTRAINT "fk_accused_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_casemasterid_casemaster') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complainantdetails_casemasterid_casemaster') THEN
    ALTER TABLE "ComplainantDetails" ADD CONSTRAINT "fk_complainantdetails_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_actsectionassociation_casemasterid_casemaster') THEN
    ALTER TABLE "ActSectionAssociation" ADD CONSTRAINT "fk_actsectionassociation_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_casecategoryid_casecategory') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_casecategoryid_casecategory" FOREIGN KEY ("CaseCategoryID") REFERENCES "CaseCategory"("CaseCategoryID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_gravityoffenceid_gravityoffence') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_gravityoffenceid_gravityoffence" FOREIGN KEY ("GravityOffenceID") REFERENCES "GravityOffence"("GravityOffenceID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_crimemajorheadid_crimehead') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_crimemajorheadid_crimehead" FOREIGN KEY ("CrimeMajorHeadID") REFERENCES "CrimeHead"("CrimeHeadID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_crimeminorheadid_crimesubhead') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_crimeminorheadid_crimesubhead" FOREIGN KEY ("CrimeMinorHeadID") REFERENCES "CrimeSubHead"("CrimeSubHeadID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_casestatusid_casestatusmaster') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_casestatusid_casestatusmaster" FOREIGN KEY ("CaseStatusID") REFERENCES "CaseStatusMaster"("CaseStatusID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_courtid_court') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_courtid_court" FOREIGN KEY ("CourtID") REFERENCES "Court"("CourtID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_policepersonid_employee') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_policepersonid_employee" FOREIGN KEY ("PolicePersonID") REFERENCES "Employee"("EmployeeID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_arrestsurrenderstateid_state') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_arrestsurrenderstateid_state" FOREIGN KEY ("ArrestSurrenderStateId") REFERENCES "State"("StateID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_arrestsurrenderdistrictid_district') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_arrestsurrenderdistrictid_district" FOREIGN KEY ("ArrestSurrenderDistrictId") REFERENCES "District"("DistrictID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_courtid_court') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_courtid_court" FOREIGN KEY ("CourtID") REFERENCES "Court"("CourtID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_ioid_employee') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_ioid_employee" FOREIGN KEY ("IOID") REFERENCES "Employee"("EmployeeID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complainantdetails_occupationid_occupationmaster') THEN
    ALTER TABLE "ComplainantDetails" ADD CONSTRAINT "fk_complainantdetails_occupationid_occupationmaster" FOREIGN KEY ("OccupationID") REFERENCES "OccupationMaster"("OccupationID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complainantdetails_religionid_religionmaster') THEN
    ALTER TABLE "ComplainantDetails" ADD CONSTRAINT "fk_complainantdetails_religionid_religionmaster" FOREIGN KEY ("ReligionID") REFERENCES "ReligionMaster"("ReligionID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_complainantdetails_casteid_castemaster') THEN
    ALTER TABLE "ComplainantDetails" ADD CONSTRAINT "fk_complainantdetails_casteid_castemaster" FOREIGN KEY ("CasteID") REFERENCES "CasteMaster"("caste_master_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_actsectionassociation_actid_act') THEN
    ALTER TABLE "ActSectionAssociation" ADD CONSTRAINT "fk_actsectionassociation_actid_act" FOREIGN KEY ("ActID") REFERENCES "Act"("ActCode");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_actsectionassociation_sectionid_section') THEN
    ALTER TABLE "ActSectionAssociation" ADD CONSTRAINT "fk_actsectionassociation_sectionid_section" FOREIGN KEY ("SectionID") REFERENCES "Section"("SectionCode");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crimesubhead_crimeheadid_crimehead') THEN
    ALTER TABLE "CrimeSubHead" ADD CONSTRAINT "fk_crimesubhead_crimeheadid_crimehead" FOREIGN KEY ("CrimeHeadID") REFERENCES "CrimeHead"("CrimeHeadID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crimeheadactsection_crimeheadid_crimehead') THEN
    ALTER TABLE "CrimeHeadActSection" ADD CONSTRAINT "fk_crimeheadactsection_crimeheadid_crimehead" FOREIGN KEY ("CrimeHeadID") REFERENCES "CrimeHead"("CrimeHeadID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crimeheadactsection_actcode_act') THEN
    ALTER TABLE "CrimeHeadActSection" ADD CONSTRAINT "fk_crimeheadactsection_actcode_act" FOREIGN KEY ("ActCode") REFERENCES "Act"("ActCode");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_section_actcode_act') THEN
    ALTER TABLE "Section" ADD CONSTRAINT "fk_section_actcode_act" FOREIGN KEY ("ActCode") REFERENCES "Act"("ActCode");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_court_districtid_district') THEN
    ALTER TABLE "Court" ADD CONSTRAINT "fk_court_districtid_district" FOREIGN KEY ("DistrictID") REFERENCES "District"("DistrictID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_district_stateid_state') THEN
    ALTER TABLE "District" ADD CONSTRAINT "fk_district_stateid_state" FOREIGN KEY ("StateID") REFERENCES "State"("StateID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unit_typeid_unittype') THEN
    ALTER TABLE "Unit" ADD CONSTRAINT "fk_unit_typeid_unittype" FOREIGN KEY ("TypeID") REFERENCES "UnitType"("UnitTypeID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unit_stateid_state') THEN
    ALTER TABLE "Unit" ADD CONSTRAINT "fk_unit_stateid_state" FOREIGN KEY ("StateID") REFERENCES "State"("StateID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_unit_districtid_district') THEN
    ALTER TABLE "Unit" ADD CONSTRAINT "fk_unit_districtid_district" FOREIGN KEY ("DistrictID") REFERENCES "District"("DistrictID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_districtid_district') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "fk_employee_districtid_district" FOREIGN KEY ("DistrictID") REFERENCES "District"("DistrictID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_unitid_unit') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "fk_employee_unitid_unit" FOREIGN KEY ("UnitID") REFERENCES "Unit"("UnitID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_rankid_rank') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "fk_employee_rankid_rank" FOREIGN KEY ("RankID") REFERENCES "Rank"("RankID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_designationid_designation') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "fk_employee_designationid_designation" FOREIGN KEY ("DesignationID") REFERENCES "Designation"("DesignationID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_policestationid_unit') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_policestationid_unit" FOREIGN KEY ("PoliceStationID") REFERENCES "Unit"("UnitID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_arrestsurrender_accusedmasterid_accused') THEN
    ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "fk_arrestsurrender_accusedmasterid_accused" FOREIGN KEY ("AccusedMasterID") REFERENCES "Accused"("AccusedMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_casemaster_policestationid_unit') THEN
    ALTER TABLE "CaseMaster" ADD CONSTRAINT "fk_casemaster_policestationid_unit" FOREIGN KEY ("PoliceStationID") REFERENCES "Unit"("UnitID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chargesheetdetails_casemasterid_casemaster') THEN
    ALTER TABLE "ChargesheetDetails" ADD CONSTRAINT "fk_chargesheetdetails_casemasterid_casemaster" FOREIGN KEY ("CaseMasterID") REFERENCES "CaseMaster"("CaseMasterID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chargesheetdetails_policepersonid_employee') THEN
    ALTER TABLE "ChargesheetDetails" ADD CONSTRAINT "fk_chargesheetdetails_policepersonid_employee" FOREIGN KEY ("PolicePersonID") REFERENCES "Employee"("EmployeeID");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_court_stateid_state') THEN
    ALTER TABLE "Court" ADD CONSTRAINT "fk_court_stateid_state" FOREIGN KEY ("StateID") REFERENCES "State"("StateID");
  END IF;
END $$;

