// ============================================================
// CrimeLens — Static Complaints Data
// Two complaints: one fully filled, one mandatory-only
// Structured for data layers (map, heatmap, network, charts)
// ============================================================

import { getDefaultAvatar } from '../assets/defaultAvatars';

// ─── Complaint 1: Fully Filled ─────────────────────────────────
const complaint1 = {
  id: 'c0000001-0000-0000-0000-000000000001',
  // Section 1: Header
  district: 'Bengaluru Urban',
  police_station: 'Koramangala PS',
  year: '2025',
  fir_number: 'KSP/BLR/2025/001',
  fir_date: '2025-06-15',

  // Section 2: Acts & Sections
  acts: [
    { act: 'IPC', sections: '379, 392' },
    { act: 'IT Act', sections: '66C, 66D' },
    { act: 'Arms Act', sections: '25' },
  ],
  other_acts_sections: 'Karnataka Police Act Section 96',

  // Section 3: Occurrence & Time
  occurrence_day: 'Saturday',
  occurrence_date: '2025-06-14',
  occurrence_time: '22:30',
  info_received_date: '2025-06-15',
  info_received_time: '08:00',
  gd_ref_entry_no: '145',
  gd_ref_time: '08:15',

  // Section 4: Type of Information
  type_of_information: 'Written',

  // Section 5: Place of Occurrence
  place_direction: 'South, 2.5km from P.S.',
  beat_no: '12',
  place_address: '42, MG Road, near Brigade Gateway, Koramangala, Bengaluru - 560095',
  outside_ps_name: '',
  outside_ps_district: '',

  // Section 6: Complainant / Informant
  complainant: {
    name: 'Rajesh Kumar',
    father_husband_name: 'Suresh Kumar',
    dob: '1985-03-12',
    nationality: 'Indian',
    passport_no: 'J1234567',
    passport_date_of_issue: '2018-07-20',
    passport_place_of_issue: 'Bengaluru',
    occupation: 'Software Engineer',
    address: '42, MG Road, Koramangala, Bengaluru Urban, Karnataka - 560095',
    photo: null, // base64 or null
  },

  // Section 7: Accused / Offender Details
  accused_details: 'Vikram Singh, approximately 28 years old, medium build, fair complexion. Known to frequent cyber cafes in Koramangala area. Previously involved in 2 cyber fraud cases. Operates under alias "TechVik". Last seen wearing black hoodie and blue jeans.',
  offender: {
    id: 'off-001',
    name: 'Vikram Singh',
    age: 28,
    gender: 'Male',
    district: 'Bengaluru Urban',
    address: 'Koramangala 4th Block, Bengaluru',
    modus_operandi: 'Cyber phishing attacks targeting corporate employees, UPI fraud via cloned apps',
    criminal_history: 2,
    risk_score: 75.0,
    photo: null, // Will use default male avatar
  },

  // Victim (added between accused and delay reason)
  victim: {
    name: 'Meena Sharma',
    age: 58,
    gender: 'Female',
    occupation: 'Retired School Teacher',
    photo: null,
  },

  // Section 8: Delay Reason
  delay_reason: 'Victim was in a state of shock after discovering the fraud. Reported the next morning after consulting with family members.',

  // Section 9: Properties Stolen / Involved
  properties_stolen: 'Gold chain (22 karat, 30 grams) worth ₹1,80,000\nMobile phone - iPhone 15 Pro Max (256GB) worth ₹1,59,000\nCash ₹11,000 from wallet\nDebit card (SBI) and Credit card (HDFC) — subsequently blocked',

  // Section 10: Total Value
  total_value_stolen: '3,50,000',

  // Section 11: Inquest Report / UD Case No
  inquest_report: 'N/A',

  // Section 12: FIR Contents
  fir_contents: `On 14th June 2025 at approximately 10:30 PM, the complainant Rajesh Kumar was returning home from his office located at Brigade Gateway, MG Road, Koramangala. While passing through the dimly lit stretch near the 4th Block junction, two unknown persons on a black motorcycle (without number plate) approached him from behind.

The pillion rider snatched the complainant's gold chain from his neck and simultaneously the rider grabbed his mobile phone from his hand. During the scuffle, the complainant fell down and sustained minor injuries on his left elbow and knee.

The complainant also reported that on the same day, unauthorized transactions worth ₹11,000 were made from his UPI-linked bank account, suspected to be done through a cloned UPI app installed on his stolen phone before he could block the accounts.

Investigation reveals that the accused Vikram Singh, a known cyber offender from the Koramangala area, was seen in the vicinity at the time of the incident as captured by nearby CCTV cameras. His modus operandi matches previous chain snatching cum cyber fraud cases registered in the jurisdiction.

Evidence collected includes CCTV footage from 3 cameras, victim's medical report, bank transaction records, and mobile tower dump data.`,

  // Section 13: Action Taken
  action_taken: 'Since the above report reveals commission of offence(s) u/s 379, 392 IPC and 66C, 66D IT Act as mentioned at Item No. 2, registered the case and took up the investigation.',
  officer_name: 'Ramesh Chandra',
  officer_rank: 'Inspector',
  officer_no: 'KPS-4521',

  // Section 14: Complainant Signature
  complainant_signature: 'Rajesh Kumar (signed digitally)',

  // Section 15: Despatch to Court
  despatch_date_1: '2025-06-16T10:00',
  despatch_date_2: '2025-06-16T14:00',

  // ── System fields (for data layers) ──
  crime_type: 'Robbery',
  latitude: 12.9352,
  longitude: 77.6245,
  occurred_at: '2025-06-14T22:30:00+05:30',
  reported_at: '2025-06-15T08:00:00+05:30',
  status: 'Under Investigation',
  severity: 4,
  description: 'Chain snatching cum cyber fraud near MG Road, Koramangala — ₹3.5L loss',
  created_at: '2025-06-15T08:30:00+05:30',
};

// ─── Complaint 2: Only Mandatory Fields ────────────────────────
const complaint2 = {
  id: 'c0000001-0000-0000-0000-000000000002',
  // Section 1: Header (all mandatory)
  district: 'Mysuru',
  police_station: 'Saraswathipuram PS',
  year: '2025',
  fir_number: 'KSP/MYS/2025/001',
  fir_date: '2025-06-20',

  // Section 2: Acts & Sections (row i mandatory)
  acts: [
    { act: 'IPC', sections: '302' },
    { act: '', sections: '' },
    { act: '', sections: '' },
  ],
  other_acts_sections: '',

  // Section 3: Occurrence (mandatory only)
  occurrence_day: 'Thursday',
  occurrence_date: '2025-06-19',
  occurrence_time: '14:00',
  info_received_date: '',
  info_received_time: '',
  gd_ref_entry_no: '',
  gd_ref_time: '',

  // Section 4: Type of Information (mandatory)
  type_of_information: 'Oral',

  // Section 5: Place of Occurrence (address mandatory)
  place_direction: '',
  beat_no: '',
  place_address: 'Vijayanagara, 2nd Main Road, Mysuru - 570032',
  outside_ps_name: '',
  outside_ps_district: '',

  // Section 6: Complainant — empty (not mandatory)
  complainant: {
    name: '',
    father_husband_name: '',
    dob: '',
    nationality: '',
    passport_no: '',
    passport_date_of_issue: '',
    passport_place_of_issue: '',
    occupation: '',
    address: '',
    photo: null,
  },

  // Section 7: Accused — minimal
  accused_details: 'Unknown male, approximately 35-40 years of age.',
  offender: {
    id: 'off-002',
    name: 'Unknown Male',
    age: null,
    gender: 'Male',
    district: 'Mysuru',
    address: '',
    modus_operandi: 'Unknown',
    criminal_history: 0,
    risk_score: 0,
    photo: null, // Uses default male avatar
  },

  // Victim — empty (not mandatory)
  victim: {
    name: '',
    age: null,
    gender: '',
    occupation: '',
    photo: null,
  },

  // Section 8: Delay Reason — empty
  delay_reason: '',

  // Section 9: Properties — empty
  properties_stolen: '',

  // Section 10: Total Value (mandatory)
  total_value_stolen: '0',

  // Section 11: Inquest Report (mandatory)
  inquest_report: 'UD/MYS/2025/089',

  // Section 12: FIR Contents — empty
  fir_contents: '',

  // Section 13: Action Taken — empty
  action_taken: '',
  officer_name: '',
  officer_rank: '',
  officer_no: '',

  // Section 14: Complainant Signature — empty
  complainant_signature: '',

  // Section 15: Despatch — empty
  despatch_date_1: '',
  despatch_date_2: '',

  // ── System fields (for data layers) ──
  crime_type: 'Assault',
  latitude: 12.2958,
  longitude: 76.6394,
  occurred_at: '2025-06-19T14:00:00+05:30',
  reported_at: '2025-06-20T09:00:00+05:30',
  status: 'Open',
  severity: 5,
  description: 'Suspected homicide reported in Vijayanagara, Mysuru',
  created_at: '2025-06-20T09:30:00+05:30',
};

// ── Exported data ──────────────────────────────────────────────

export const COMPLAINTS = [complaint1, complaint2];

// Incidents format (compatible with existing useCrimeData consumers)
export function getIncidents(complaints) {
  return complaints.map(c => ({
    id: c.id,
    fir_number: c.fir_number,
    crime_type: c.crime_type,
    district: c.district,
    police_station: c.police_station,
    latitude: c.latitude,
    longitude: c.longitude,
    occurred_at: c.occurred_at,
    reported_at: c.reported_at,
    status: c.status,
    severity: c.severity,
    description: c.description,
    created_at: c.created_at,
  }));
}

// Offenders format (compatible with existing useOffendersData consumers)
export function getOffenders(complaints) {
  return complaints
    .filter(c => c.offender && c.offender.name)
    .map(c => ({
      id: c.offender.id,
      name: c.offender.name,
      age: c.offender.age,
      gender: c.offender.gender,
      district: c.offender.district,
      address: c.offender.address,
      modus_operandi: c.offender.modus_operandi,
      criminal_history: c.offender.criminal_history,
      risk_score: c.offender.risk_score,
      photo: c.offender.photo || getDefaultAvatar(c.offender.gender),
      created_at: c.created_at,
    }));
}

// Victims format
export function getVictims(complaints) {
  return complaints
    .filter(c => c.victim && c.victim.name)
    .map(c => ({
      id: `victim-${c.id}`,
      incident_id: c.id,
      name: c.victim.name,
      age: c.victim.age,
      gender: c.victim.gender,
      occupation: c.victim.occupation,
      photo: c.victim.photo,
      created_at: c.created_at,
    }));
}

// Incident-offender junction (for network graph)
export function getIncidentOffenders(complaints) {
  return complaints
    .filter(c => c.offender && c.offender.id)
    .map(c => ({
      incident_id: c.id,
      offender_id: c.offender.id,
      role: 'Primary',
    }));
}

// Districts (static list — same as Supabase)
export const DISTRICTS = [
  { id: 'd001', name: 'Bengaluru Urban', latitude: 12.9716, longitude: 77.5946 },
  { id: 'd002', name: 'Mysuru', latitude: 12.2958, longitude: 76.6394 },
  { id: 'd003', name: 'Dakshina Kannada', latitude: 12.8438, longitude: 75.2479 },
  { id: 'd004', name: 'Belagavi', latitude: 15.8497, longitude: 74.4977 },
  { id: 'd005', name: 'Kalaburagi', latitude: 17.3297, longitude: 76.8343 },
  { id: 'd006', name: 'Dharwad', latitude: 15.4589, longitude: 75.0078 },
  { id: 'd007', name: 'Tumakuru', latitude: 13.3379, longitude: 77.1173 },
  { id: 'd008', name: 'Shivamogga', latitude: 13.9299, longitude: 75.5681 },
  { id: 'd009', name: 'Ballari', latitude: 15.1394, longitude: 76.9214 },
  { id: 'd010', name: 'Hassan', latitude: 13.0033, longitude: 76.0998 },
  { id: 'd011', name: 'Vijayapura', latitude: 16.8302, longitude: 75.7100 },
  { id: 'd012', name: 'Raichur', latitude: 16.2120, longitude: 77.3439 },
  { id: 'd013', name: 'Chikkamagaluru', latitude: 13.3161, longitude: 75.7720 },
  { id: 'd014', name: 'Uttara Kannada', latitude: 14.7958, longitude: 74.6963 },
  { id: 'd015', name: 'Mandya', latitude: 12.5218, longitude: 76.8951 },
  { id: 'd016', name: 'Udupi', latitude: 13.3409, longitude: 74.7421 },
  { id: 'd017', name: 'Chitradurga', latitude: 14.2226, longitude: 76.3989 },
  { id: 'd018', name: 'Gadag', latitude: 15.4298, longitude: 75.6256 },
  { id: 'd019', name: 'Koppal', latitude: 15.3520, longitude: 76.1547 },
  { id: 'd020', name: 'Yadgir', latitude: 16.7713, longitude: 77.1383 },
  { id: 'd021', name: 'Chamarajanagara', latitude: 11.9261, longitude: 76.9434 },
  { id: 'd022', name: 'Bagalkot', latitude: 16.1826, longitude: 75.6960 },
  { id: 'd023', name: 'Bidar', latitude: 17.9104, longitude: 77.5199 },
  { id: 'd024', name: 'Kodagu', latitude: 12.4215, longitude: 75.7418 },
  { id: 'd025', name: 'Haveri', latitude: 14.7954, longitude: 75.4005 },
  { id: 'd026', name: 'Davangere', latitude: 14.4644, longitude: 75.9218 },
  { id: 'd027', name: 'Bengaluru Rural', latitude: 13.2257, longitude: 77.5733 },
  { id: 'd028', name: 'Ramanagara', latitude: 12.7162, longitude: 77.2820 },
  { id: 'd029', name: 'Chikkaballapura', latitude: 13.4355, longitude: 77.7315 },
  { id: 'd030', name: 'Kolar', latitude: 13.1362, longitude: 78.1293 },
];

// Empty complaint template for new form
export const EMPTY_COMPLAINT = {
  id: '',
  district: '',
  police_station: '',
  year: new Date().getFullYear().toString(),
  fir_number: '',
  fir_date: '',
  acts: [
    { act: '', sections: '' },
    { act: '', sections: '' },
    { act: '', sections: '' },
  ],
  other_acts_sections: '',
  occurrence_day: '',
  occurrence_date: '',
  occurrence_time: '',
  info_received_date: '',
  info_received_time: '',
  gd_ref_entry_no: '',
  gd_ref_time: '',
  type_of_information: 'Written',
  place_direction: '',
  beat_no: '',
  place_address: '',
  outside_ps_name: '',
  outside_ps_district: '',
  complainant: {
    name: '',
    father_husband_name: '',
    dob: '',
    nationality: '',
    passport_no: '',
    passport_date_of_issue: '',
    passport_place_of_issue: '',
    occupation: '',
    address: '',
    photo: null,
  },
  accused_details: '',
  offender: {
    id: '',
    name: '',
    age: '',
    gender: 'Male',
    district: '',
    address: '',
    modus_operandi: '',
    criminal_history: 0,
    risk_score: 0,
    photo: null,
  },
  victim: {
    name: '',
    age: '',
    gender: '',
    occupation: '',
    photo: null,
  },
  delay_reason: '',
  properties_stolen: '',
  total_value_stolen: '',
  inquest_report: '',
  fir_contents: '',
  action_taken: '',
  officer_name: '',
  officer_rank: '',
  officer_no: '',
  complainant_signature: '',
  despatch_date_1: '',
  despatch_date_2: '',
  crime_type: 'Theft',
  latitude: '',
  longitude: '',
  occurred_at: '',
  reported_at: '',
  status: 'Open',
  severity: 3,
  description: '',
};

// Crime types list
export const CRIME_TYPES = [
  'Chain Snatching', 'Cyber Crime', 'Drug Trafficking', 'Burglary',
  'Financial Fraud', 'Theft', 'Assault', 'Robbery', 'Domestic Violence',
  'Extortion', 'Smuggling', 'Murder', 'Kidnapping',
];

// Days of the week
export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
