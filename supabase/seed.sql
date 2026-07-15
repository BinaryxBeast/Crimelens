-- ============================================================
-- CrimeLens — Seed Data (Clean State)
-- All data cleared. Complaints added via the app UI.
-- Table names follow database_rules conventions
-- ============================================================

-- Clear all existing data
TRUNCATE TABLE "CaseMasterAccused" CASCADE;
TRUNCATE TABLE "Victim" CASCADE;
TRUNCATE TABLE "CaseMaster" CASCADE;
TRUNCATE TABLE "Accused" CASCADE;

-- Districts (keep as reference data)
INSERT INTO "District" ("DistrictName", latitude, longitude, population, area_km2, urban_pct) VALUES
('Bengaluru Urban',  12.9716,  77.5946, 13608000, 2190,  91.0),
('Mysuru',           12.2958,  76.6394,  3001127, 6854,  51.2),
('Dakshina Kannada', 12.8438,  75.2479,  2089649, 4560,  47.3),
('Belagavi',         15.8497,  74.4977,  4779661, 13415, 31.0),
('Kalaburagi',       17.3297,  76.8343,  2564892, 16024, 28.5),
('Dharwad',          15.4589,  75.0078,  1846993, 4263,  56.8),
('Tumakuru',         13.3379,  77.1173,  2678980, 10597, 32.1),
('Shivamogga',       13.9299,  75.5681,  1755396, 8477,  38.7),
('Ballari',          15.1394,  76.9214,  2532383, 8447,  33.4),
('Hassan',           13.0033,  76.0998,  1776221, 6826,  26.9),
('Vijayapura',       16.8302,  75.7100,  2177331, 10541, 30.2),
('Raichur',          16.2120,  77.3439,  1924773, 6827,  23.8),
('Chikkamagaluru',   13.3161,  75.7720,  1137948, 7201,  24.1),
('Uttara Kannada',   14.7958,  74.6963,  1437169, 10291, 23.5),
('Mandya',           12.5218,  76.8951,  1805769, 4961,  24.7),
('Udupi',            13.3409,  74.7421,  1177361, 3880,  41.2),
('Chitradurga',      14.2226,  76.3989,  1660378, 8388,  27.3),
('Gadag',            15.4298,  75.6256,  1065235, 4656,  34.4),
('Koppal',           15.3520,  76.1547,  1391187, 5824,  22.1),
('Yadgir',           16.7713,  77.1383,  1172985, 5238,  20.4),
('Chamarajanagara',  11.9261,  76.9434,   1023962, 5101,  19.8),
('Bagalkot',         16.1826,  75.6960,  1889753, 6596,  30.5),
('Bidar',            17.9104,  77.5199,  1700018, 5448,  32.7),
('Kodagu',           12.4215,  75.7418,   554762, 4102,  18.3),
('Haveri',           14.7954,  75.4005,  1598506, 4848,  26.7),
('Davangere',        14.4644,  75.9218,  1946905, 5926,  43.2),
('Bengaluru Rural',  13.2257,  77.5733,   990923, 2259,  27.4),
('Ramanagara',       12.7162,  77.2820,  1082739, 3556,  27.0),
('Chikkaballapura',  13.4355,  77.7315,  1254783, 4218,  23.6),
('Kolar',            13.1362,  78.1293,  1539462, 3969,  30.1)
ON CONFLICT ("DistrictName") DO NOTHING;
