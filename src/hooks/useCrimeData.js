import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useFiltersStore } from '../store/filtersStore';

// ── Image Upload Utility ────────────────────────────────────────
export async function uploadComplaintImage(file, complaintId, field) {
  const ext = file.name.split('.').pop();
  const path = `${complaintId}/${field}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('complaint-images')
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('complaint-images')
    .getPublicUrl(path);

  return data.publicUrl;
}

// ── Constants ───────────────────────────────────────────────────
export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const EMPTY_COMPLAINT = {
  district: '',
  police_station: '',
  year: new Date().getFullYear().toString(),
  fir_number: '',
  fir_date: '',
  crime_type: '',
  acts: [
    { act: 'IPC', sections: '' },
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
    name: '', father_husband_name: '', dob: '', nationality: '',
    passport_no: '', passport_date_of_issue: '', passport_place_of_issue: '',
    occupation: '', address: '', religion_id: '', caste_id: '',
  },
  accused_details: '',
  offenders: [
    { name: '', age: '', gender: 'Male', district: '', address: '',
      modus_operandi: '', criminal_history: 0, risk_score: 0 },
  ],
  victims: [
    { name: '', age: '', gender: '', occupation: '' },
  ],
  arrests: [], // { date: '', type: '', state: '', district: '', ps: '', io: '', court: '', accused_index: '' }
  chargesheets: [], // { date: '', type: '', io: '' }
  delay_reason: '',
  properties_stolen: '',
  total_value_stolen: '',
  inquest_report: '',
  fir_contents: '',
  action_taken: '',
  officer_name: '',
  officer_rank: '',
  officer_no: '',
  officer_unit: '',
  officer_photo_url: '',
  complainant_signature: '',
  despatch_date_1: '',
  despatch_date_2: '',
  latitude: '',
  longitude: '',
  status: '',
  severity: 3,
  description: '',
  // Photo file references (File objects or URL strings)
  complainant_photo: null,
  offender_photos: [null],
  victim_photos: [null],
};

// ── Helper: build searchable text from a complaint row ──────────
export function getSearchableText(row) {
  const cd = row.complaint_data || {};
  const comp = row._complainant || cd.complainant || {};
  // Collect all accused names
  const accNames = (row._accusedAll || []).map(a => a.AccusedName).filter(Boolean);
  const offFallback = row._accused?.AccusedName || cd.offender?.name || '';
  // Collect all victim names
  const vicNames = (row._victims || []).map(v => v.VictimName).filter(Boolean);
  const vicFallback = row._victim?.VictimName || cd.victim?.name || '';
  return [
    row.CrimeNo, row._crimeTypeName, row._districtName, row._stationName,
    row.BriefFacts, row._statusName,
    comp.ComplainantName || comp.name,
    comp.address,
    ...accNames, offFallback,
    ...vicNames, vicFallback,
    cd.accused_details, cd.place_address,
    cd.fir_contents, cd.properties_stolen,
    cd.officer_name, cd.delay_reason,
  ].filter(Boolean).join(' ').toLowerCase();
}

// ── Hook ────────────────────────────────────────────────────────
export function useCrimeData() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const { selectedDistrict, selectedCrimeType, dateRange, severityRange } = useFiltersStore();

  // ── Fetch from Supabase ──
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch CaseMaster
      const { data: cases, error: fetchErr } = await supabase
        .from('CaseMaster')
        .select('*')
        .order('IncidentFromDate', { ascending: false });

      if (fetchErr) throw fetchErr;

      if (!cases || cases.length === 0) {
        setIncidents([]);
        return;
      }

      const caseIds = cases.map(c => c.CaseMasterID);

      // Fetch related data in parallel
      const [
        { data: complainants },
        { data: victims },
        { data: accused },
        { data: actSections },
        { data: arrests },
        { data: chargesheets },
      ] = await Promise.all([
        supabase.from('ComplainantDetails').select('*').in('CaseMasterID', caseIds),
        supabase.from('Victim').select('*').in('CaseMasterID', caseIds),
        supabase.from('Accused').select('*').in('CaseMasterID', caseIds),
        supabase.from('ActSectionAssociation').select('*').in('CaseMasterID', caseIds),
        supabase.from('ArrestSurrender').select('*').in('CaseMasterID', caseIds),
        supabase.from('ChargesheetDetails').select('*').in('CaseMasterID', caseIds),
      ]);

      // Build lookup maps
      const compMap = {};
      (complainants || []).forEach(c => { compMap[c.CaseMasterID] = c; });
      const vicMap = {};
      (victims || []).forEach(v => {
        if (!vicMap[v.CaseMasterID]) vicMap[v.CaseMasterID] = [];
        vicMap[v.CaseMasterID].push(v);
      });
      const accMap = {};
      (accused || []).forEach(a => {
        if (!accMap[a.CaseMasterID]) accMap[a.CaseMasterID] = [];
        accMap[a.CaseMasterID].push(a);
      });
      const actMap = {};
      (actSections || []).forEach(a => {
        if (!actMap[a.CaseMasterID]) actMap[a.CaseMasterID] = [];
        actMap[a.CaseMasterID].push(a);
      });
      const arrMap = {};
      (arrests || []).forEach(a => {
        if (!arrMap[a.CaseMasterID]) arrMap[a.CaseMasterID] = [];
        arrMap[a.CaseMasterID].push(a);
      });
      const csMap = {};
      (chargesheets || []).forEach(c => {
        if (!csMap[c.CaseMasterID]) csMap[c.CaseMasterID] = [];
        csMap[c.CaseMasterID].push(c);
      });

      // Merge related data into each case
      const enriched = cases.map(c => ({
        ...c,
        DistrictID: c.DistrictID || c.complaint_data?.district || null,
        _complainant: compMap[c.CaseMasterID] || null,
        _victims: vicMap[c.CaseMasterID] || [],
        _victim: (vicMap[c.CaseMasterID] || [])[0] || null,
        _accused: (accMap[c.CaseMasterID] || [])[0] || null,
        _accusedAll: accMap[c.CaseMasterID] || [],
        _actSections: actMap[c.CaseMasterID] || [],
        _arrests: arrMap[c.CaseMasterID] || [],
        _chargesheets: csMap[c.CaseMasterID] || [],
      }));

      setIncidents(enriched);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // ── Realtime subscription ──
  useEffect(() => {
    const channel = supabase
      .channel(`CaseMaster-realtime-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CaseMaster' }, () => fetchIncidents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchIncidents]);

  // ── Apply client-side filters ──
  const filtered = useMemo(() => {
    return incidents.filter(i => {
      if (selectedDistrict && selectedDistrict !== 'All') {
        // Support both integer ID and string name for backward compat
        const distVal = typeof selectedDistrict === 'number' ? selectedDistrict : parseInt(selectedDistrict);
        if (!isNaN(distVal) && i.DistrictID !== distVal) return false;
        if (isNaN(distVal) && i.DistrictID !== selectedDistrict) return false;
      }
      if (selectedCrimeType && selectedCrimeType !== 'All') {
        const crimeVal = typeof selectedCrimeType === 'number' ? selectedCrimeType : parseInt(selectedCrimeType);
        if (!isNaN(crimeVal) && i.CrimeMajorHeadID !== crimeVal) return false;
        if (isNaN(crimeVal) && i.CrimeMajorHeadID !== selectedCrimeType) return false;
      }
      if (dateRange?.start && new Date(i.IncidentFromDate) < new Date(dateRange.start)) return false;
      if (dateRange?.end && new Date(i.IncidentFromDate) > new Date(dateRange.end)) return false;
      if (severityRange) {
        const grav = i.GravityOffenceID || 0;
        if (grav < severityRange[0] || grav > severityRange[1]) return false;
      }
      return true;
    });
  }, [incidents, selectedDistrict, selectedCrimeType, dateRange, severityRange]);

  // ── CRUD: Add ──
  const addIncident = useCallback(async (complaintForm, photoFiles) => {
    // 1. Build timestamps
    let occurred_at = complaintForm.occurred_at;
    if (complaintForm.occurrence_date && complaintForm.occurrence_time) {
      occurred_at = `${complaintForm.occurrence_date}T${complaintForm.occurrence_time}:00+05:30`;
    } else if (complaintForm.occurrence_date) {
      occurred_at = `${complaintForm.occurrence_date}T00:00:00+05:30`;
    }

    let reported_at = complaintForm.reported_at;
    if (complaintForm.info_received_date && complaintForm.info_received_time) {
      reported_at = `${complaintForm.info_received_date}T${complaintForm.info_received_time}:00+05:30`;
    } else if (complaintForm.fir_date) {
      reported_at = `${complaintForm.fir_date}T09:00:00+05:30`;
    }

    const incidentId = Math.floor(Math.random() * 1000000000);

    // 2. Upload photos to Supabase Storage
    const photoUrls = {};
    if (photoFiles?.complainant_photo instanceof File) {
      try {
        photoUrls.complainant_photo_url = await uploadComplaintImage(photoFiles.complainant_photo, incidentId, 'complainant');
      } catch (e) { console.warn('Complainant photo upload failed:', e); }
    }
    // Upload multiple offender photos
    const offenderPhotoUrls = [];
    const offenderPhotos = photoFiles?.offender_photos || [];
    for (let i = 0; i < offenderPhotos.length; i++) {
      if (offenderPhotos[i] instanceof File) {
        try {
          offenderPhotoUrls[i] = await uploadComplaintImage(offenderPhotos[i], incidentId, `offender_${i}`);
        } catch (e) { console.warn(`Offender ${i} photo upload failed:`, e); }
      }
    }
    if (offenderPhotoUrls.length > 0) photoUrls.offender_photo_urls = offenderPhotoUrls;
    // Upload multiple victim photos
    const victimPhotoUrls = [];
    const victimPhotos = photoFiles?.victim_photos || [];
    for (let i = 0; i < victimPhotos.length; i++) {
      if (victimPhotos[i] instanceof File) {
        try {
          victimPhotoUrls[i] = await uploadComplaintImage(victimPhotos[i], incidentId, `victim_${i}`);
        } catch (e) { console.warn(`Victim ${i} photo upload failed:`, e); }
      }
    }
    if (victimPhotoUrls.length > 0) photoUrls.victim_photo_urls = victimPhotoUrls;

    // 3. Build complaint_data JSONB (non-relational fields only)
    const complaint_data = {
      year: complaintForm.year,
      fir_date: complaintForm.fir_date,
      district: parseInt(complaintForm.district) || null,
      other_acts_sections: complaintForm.other_acts_sections,
      occurrence_day: complaintForm.occurrence_day,
      occurrence_date: complaintForm.occurrence_date,
      occurrence_time: complaintForm.occurrence_time,
      info_received_date: complaintForm.info_received_date,
      info_received_time: complaintForm.info_received_time,
      gd_ref_entry_no: complaintForm.gd_ref_entry_no,
      gd_ref_time: complaintForm.gd_ref_time,
      type_of_information: complaintForm.type_of_information,
      place_direction: complaintForm.place_direction,
      beat_no: complaintForm.beat_no,
      place_address: complaintForm.place_address,
      outside_ps_name: complaintForm.outside_ps_name,
      outside_ps_district: complaintForm.outside_ps_district,
      delay_reason: complaintForm.delay_reason,
      properties_stolen: complaintForm.properties_stolen,
      total_value_stolen: complaintForm.total_value_stolen,
      inquest_report: complaintForm.inquest_report,
      fir_contents: complaintForm.fir_contents,
      action_taken: complaintForm.action_taken,
      officer_name: complaintForm.officer_name,
      officer_rank: complaintForm.officer_rank,
      officer_no: complaintForm.officer_no,
      officer_unit: complaintForm.officer_unit || '',
      officer_photo_url: complaintForm.officer_photo_url || '',
      complainant_signature: complaintForm.complainant_signature,
      despatch_date_1: complaintForm.despatch_date_1,
      despatch_date_2: complaintForm.despatch_date_2,
      accused_details: complaintForm.accused_details,
      acts: complaintForm.acts,
      victims: complaintForm.victims,
      offenders: complaintForm.offenders,
      arrests: complaintForm.arrests,
      chargesheets: complaintForm.chargesheets,
      complainant: complaintForm.complainant,
      ...photoUrls,
    };

    // 4. Insert CaseMaster
    const row = {
      CaseMasterID: incidentId,
      CrimeNo: complaintForm.fir_number,
      CrimeMajorHeadID: parseInt(complaintForm.crime_type) || null,
      PoliceStationID: parseInt(complaintForm.police_station) || null,
      latitude: parseFloat(complaintForm.latitude) || null,
      longitude: parseFloat(complaintForm.longitude) || null,
      IncidentFromDate: occurred_at || new Date().toISOString(),
      InfoReceivedPSDate: reported_at || new Date().toISOString(),
      CaseStatusID: parseInt(complaintForm.status) || null,
      GravityOffenceID: parseInt(complaintForm.severity) || 3,
      BriefFacts: complaintForm.description || '',
      complaint_data,
    };

    const { data, error: insertErr } = await supabase
      .from('CaseMaster')
      .insert(row)
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 5. Insert ComplainantDetails
    const comp = complaintForm.complainant || {};
    if (comp.name) {
      await supabase.from('ComplainantDetails').insert({
        CaseMasterID: incidentId,
        ComplainantName: comp.name,
        AgeYear: comp.dob ? (new Date().getFullYear() - new Date(comp.dob).getFullYear()) : null,
        OccupationName: comp.occupation || null,
        ReligionID: comp.religion_id ? parseInt(comp.religion_id) : null,
        CasteID: comp.caste_id ? parseInt(comp.caste_id) : null,
        GenderID: null,
      }).then(({ error }) => { if (error) console.warn('ComplainantDetails insert failed:', error); });
    }

    // 6. Insert Victims (multiple)
    const victims = complaintForm.victims || (complaintForm.victim ? [complaintForm.victim] : []);
    for (const vic of victims) {
      if (vic.name) {
        await supabase.from('Victim').insert({
          CaseMasterID: incidentId,
          VictimName: vic.name,
          AgeYear: parseInt(vic.age) || null,
          GenderID: vic.gender === 'Male' ? 1 : vic.gender === 'Female' ? 2 : vic.gender === 'Other' ? 3 : null,
          OccupationName: vic.occupation || null,
        }).then(({ error }) => { if (error) console.warn('Victim insert failed:', error); });
      }
    }

    // 7. Insert Accused (multiple)
    const offenders = complaintForm.offenders || (complaintForm.offender ? [complaintForm.offender] : []);
    for (let i = 0; i < offenders.length; i++) {
      const off = offenders[i];
      if (off.name) {
        await supabase.from('Accused').insert({
          CaseMasterID: incidentId,
          AccusedName: off.name,
          AgeYear: parseInt(off.age) || null,
          GenderID: off.gender === 'Male' ? 1 : off.gender === 'Female' ? 2 : off.gender === 'Other' ? 3 : null,
          PersonID: `A${i + 1}`,
        }).then(({ error }) => { if (error) console.warn('Accused insert failed:', error); });
      }
    }

    // 8. Insert ActSectionAssociation
    const formActs = complaintForm.acts || [];
    for (let i = 0; i < formActs.length; i++) {
      const a = formActs[i];
      if (a.act) {
        await supabase.from('ActSectionAssociation').insert({
          CaseMasterID: incidentId,
          ActID: a.act,
          SectionID: a.sections || null,
          ActOrderID: i + 1,
          SectionOrderID: 1,
        }).then(({ error }) => { if (error) console.warn('ActSectionAssociation insert failed:', error); });
      }
    }

    // 9. Insert ArrestSurrender
    const formArrests = complaintForm.arrests || [];
    for (let i = 0; i < formArrests.length; i++) {
      const a = formArrests[i];
      if (a.date && a.type) {
        await supabase.from('ArrestSurrender').insert({
          CaseMasterID: incidentId,
          ArrestSurrenderTypeID: parseInt(a.type) || null,
          ArrestSurrenderDate: a.date,
          ArrestSurrenderStateId: parseInt(a.state) || null,
          ArrestSurrenderDistrictId: parseInt(a.district) || null,
          PoliceStationID: parseInt(a.ps) || null,
          IOID: parseInt(a.io) || null,
          CourtID: parseInt(a.court) || null,
        }).then(({ error }) => { if (error) console.warn('ArrestSurrender insert failed:', error); });
      }
    }

    // 10. Insert ChargesheetDetails
    const formCS = complaintForm.chargesheets || [];
    for (let i = 0; i < formCS.length; i++) {
      const c = formCS[i];
      if (c.date) {
        await supabase.from('ChargesheetDetails').insert({
          CaseMasterID: incidentId,
          csdate: c.date,
          cstype: c.type || null,
          PolicePersonID: parseInt(c.io) || null,
        }).then(({ error }) => { if (error) console.warn('ChargesheetDetails insert failed:', error); });
      }
    }

    setIncidents(prev => [{ ...data, _complainant: null, _victims: [], _victim: null, _accused: null, _accusedAll: [], _actSections: [], _arrests: [], _chargesheets: [] }, ...prev]);
    // Trigger a full refetch to get properly merged data
    fetchIncidents();
    return data;
  }, [fetchIncidents]);

  // ── CRUD: Update ──
  const updateIncident = useCallback(async (id, complaintForm, photoFiles) => {
    // Upload new photos if provided
    const photoUrls = {};
    const existingData = complaintForm._existingComplaintData || {};

    if (photoFiles?.complainant_photo instanceof File) {
      try {
        photoUrls.complainant_photo_url = await uploadComplaintImage(photoFiles.complainant_photo, id, 'complainant');
      } catch (e) { console.warn('Complainant photo upload failed:', e); }
    } else if (existingData.complainant_photo_url) {
      photoUrls.complainant_photo_url = existingData.complainant_photo_url;
    }

    // Upload multiple offender photos
    const offenderPhotoUrls = [];
    const offenderPhotos = photoFiles?.offender_photos || [];
    for (let i = 0; i < offenderPhotos.length; i++) {
      if (offenderPhotos[i] instanceof File) {
        try {
          offenderPhotoUrls[i] = await uploadComplaintImage(offenderPhotos[i], id, `offender_${i}`);
        } catch (e) { console.warn(`Offender ${i} photo upload failed:`, e); }
      } else if (existingData.offender_photo_urls?.[i]) {
        offenderPhotoUrls[i] = existingData.offender_photo_urls[i];
      }
    }
    // Backward compat: keep old single URL if exists
    if (offenderPhotoUrls.length > 0) {
      photoUrls.offender_photo_urls = offenderPhotoUrls;
    } else if (existingData.offender_photo_url) {
      photoUrls.offender_photo_url = existingData.offender_photo_url;
    }

    // Upload multiple victim photos
    const victimPhotoUrls = [];
    const victimPhotos = photoFiles?.victim_photos || [];
    for (let i = 0; i < victimPhotos.length; i++) {
      if (victimPhotos[i] instanceof File) {
        try {
          victimPhotoUrls[i] = await uploadComplaintImage(victimPhotos[i], id, `victim_${i}`);
        } catch (e) { console.warn(`Victim ${i} photo upload failed:`, e); }
      } else if (existingData.victim_photo_urls?.[i]) {
        victimPhotoUrls[i] = existingData.victim_photo_urls[i];
      }
    }
    if (victimPhotoUrls.length > 0) {
      photoUrls.victim_photo_urls = victimPhotoUrls;
    } else if (existingData.victim_photo_url) {
      photoUrls.victim_photo_url = existingData.victim_photo_url;
    }

    let occurred_at = complaintForm.occurred_at;
    if (complaintForm.occurrence_date && complaintForm.occurrence_time) {
      occurred_at = `${complaintForm.occurrence_date}T${complaintForm.occurrence_time}:00+05:30`;
    }
    let reported_at = complaintForm.reported_at;
    if (complaintForm.info_received_date && complaintForm.info_received_time) {
      reported_at = `${complaintForm.info_received_date}T${complaintForm.info_received_time}:00+05:30`;
    }

    const complaint_data = {
      year: complaintForm.year,
      fir_date: complaintForm.fir_date,
      district: parseInt(complaintForm.district) || null,
      other_acts_sections: complaintForm.other_acts_sections,
      occurrence_day: complaintForm.occurrence_day,
      occurrence_date: complaintForm.occurrence_date,
      occurrence_time: complaintForm.occurrence_time,
      info_received_date: complaintForm.info_received_date,
      info_received_time: complaintForm.info_received_time,
      gd_ref_entry_no: complaintForm.gd_ref_entry_no,
      gd_ref_time: complaintForm.gd_ref_time,
      type_of_information: complaintForm.type_of_information,
      place_direction: complaintForm.place_direction,
      beat_no: complaintForm.beat_no,
      place_address: complaintForm.place_address,
      outside_ps_name: complaintForm.outside_ps_name,
      outside_ps_district: complaintForm.outside_ps_district,
      delay_reason: complaintForm.delay_reason,
      properties_stolen: complaintForm.properties_stolen,
      total_value_stolen: complaintForm.total_value_stolen,
      inquest_report: complaintForm.inquest_report,
      fir_contents: complaintForm.fir_contents,
      action_taken: complaintForm.action_taken,
      officer_name: complaintForm.officer_name,
      officer_rank: complaintForm.officer_rank,
      officer_no: complaintForm.officer_no,
      officer_unit: complaintForm.officer_unit || '',
      officer_photo_url: complaintForm.officer_photo_url || '',
      complainant_signature: complaintForm.complainant_signature,
      despatch_date_1: complaintForm.despatch_date_1,
      despatch_date_2: complaintForm.despatch_date_2,
      accused_details: complaintForm.accused_details,
      acts: complaintForm.acts,
      victims: complaintForm.victims,
      offenders: complaintForm.offenders,
      arrests: complaintForm.arrests,
      chargesheets: complaintForm.chargesheets,
      complainant: complaintForm.complainant,
      ...photoUrls,
    };

    const updates = {
      CrimeNo: complaintForm.fir_number,
      CrimeMajorHeadID: parseInt(complaintForm.crime_type) || null,
      PoliceStationID: parseInt(complaintForm.police_station) || null,
      latitude: parseFloat(complaintForm.latitude) || null,
      longitude: parseFloat(complaintForm.longitude) || null,
      IncidentFromDate: occurred_at || new Date().toISOString(),
      InfoReceivedPSDate: reported_at || new Date().toISOString(),
      CaseStatusID: parseInt(complaintForm.status) || null,
      GravityOffenceID: parseInt(complaintForm.severity) || 3,
      BriefFacts: complaintForm.description || '',
      complaint_data,
    };

    const { data, error: updateErr } = await supabase
      .from('CaseMaster')
      .update(updates)
      .eq('CaseMasterID', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Delete old related rows and re-insert
    await Promise.all([
      supabase.from('ComplainantDetails').delete().eq('CaseMasterID', id),
      supabase.from('Victim').delete().eq('CaseMasterID', id),
      supabase.from('Accused').delete().eq('CaseMasterID', id),
      supabase.from('ActSectionAssociation').delete().eq('CaseMasterID', id),
      supabase.from('ArrestSurrender').delete().eq('CaseMasterID', id),
      supabase.from('ChargesheetDetails').delete().eq('CaseMasterID', id),
    ]);

    // Re-insert related data
    const comp = complaintForm.complainant || {};
    if (comp.name) {
      await supabase.from('ComplainantDetails').insert({
        CaseMasterID: id,
        ComplainantName: comp.name,
        AgeYear: comp.dob ? (new Date().getFullYear() - new Date(comp.dob).getFullYear()) : null,
        OccupationName: comp.occupation || null,
        ReligionID: comp.religion_id ? parseInt(comp.religion_id) : null,
        CasteID: comp.caste_id ? parseInt(comp.caste_id) : null,
        GenderID: null,
      });
    }

    // Re-insert Victims (multiple)
    const victims = complaintForm.victims || (complaintForm.victim ? [complaintForm.victim] : []);
    for (const vic of victims) {
      if (vic.name) {
        await supabase.from('Victim').insert({
          CaseMasterID: id,
          VictimName: vic.name,
          AgeYear: parseInt(vic.age) || null,
          GenderID: vic.gender === 'Male' ? 1 : vic.gender === 'Female' ? 2 : vic.gender === 'Other' ? 3 : null,
          OccupationName: vic.occupation || null,
        });
      }
    }

    // Re-insert Accused (multiple)
    const offenders = complaintForm.offenders || (complaintForm.offender ? [complaintForm.offender] : []);
    for (let i = 0; i < offenders.length; i++) {
      const off = offenders[i];
      if (off.name) {
        await supabase.from('Accused').insert({
          CaseMasterID: id,
          AccusedName: off.name,
          AgeYear: parseInt(off.age) || null,
          GenderID: off.gender === 'Male' ? 1 : off.gender === 'Female' ? 2 : off.gender === 'Other' ? 3 : null,
          PersonID: `A${i + 1}`,
        });
      }
    }

    const formActs = complaintForm.acts || [];
    for (let i = 0; i < formActs.length; i++) {
      const a = formActs[i];
      if (a.act) {
        await supabase.from('ActSectionAssociation').insert({
          CaseMasterID: id,
          ActID: a.act,
          SectionID: a.sections || null,
          ActOrderID: i + 1,
          SectionOrderID: 1,
        });
      }
    }

    const formArrests = complaintForm.arrests || [];
    for (let i = 0; i < formArrests.length; i++) {
      const a = formArrests[i];
      if (a.date && a.type) {
        await supabase.from('ArrestSurrender').insert({
          CaseMasterID: id,
          ArrestSurrenderTypeID: parseInt(a.type) || null,
          ArrestSurrenderDate: a.date,
          ArrestSurrenderStateId: parseInt(a.state) || null,
          ArrestSurrenderDistrictId: parseInt(a.district) || null,
          PoliceStationID: parseInt(a.ps) || null,
          IOID: parseInt(a.io) || null,
          CourtID: parseInt(a.court) || null,
        });
      }
    }

    const formCS = complaintForm.chargesheets || [];
    for (let i = 0; i < formCS.length; i++) {
      const c = formCS[i];
      if (c.date) {
        await supabase.from('ChargesheetDetails').insert({
          CaseMasterID: id,
          csdate: c.date,
          cstype: c.type || null,
          PolicePersonID: parseInt(c.io) || null,
        });
      }
    }

    // Trigger full refetch
    fetchIncidents();
    return data;
  }, [fetchIncidents]);

  // ── CRUD: Delete ──
  const deleteIncident = useCallback(async (id) => {
    // Delete related rows first
    await Promise.all([
      supabase.from('ComplainantDetails').delete().eq('CaseMasterID', id),
      supabase.from('Victim').delete().eq('CaseMasterID', id),
      supabase.from('Accused').delete().eq('CaseMasterID', id),
      supabase.from('ActSectionAssociation').delete().eq('CaseMasterID', id),
      supabase.from('ArrestSurrender').delete().eq('CaseMasterID', id),
      supabase.from('ChargesheetDetails').delete().eq('CaseMasterID', id),
    ]);

    const { error: delErr } = await supabase
      .from('CaseMaster')
      .delete()
      .eq('CaseMasterID', id);
    if (delErr) throw delErr;
    setIncidents(prev => prev.filter(i => i.CaseMasterID !== id));
  }, []);

  // ── Aggregated stats ──
  const stats = useMemo(() => ({
    total: filtered.length,
    open: filtered.filter(i => i.CaseStatusID === 1).length,
    closed: filtered.filter(i => i.CaseStatusID === 4).length,
    underInvestigation: filtered.filter(i => i.CaseStatusID === 2).length,
    highSeverity: filtered.filter(i => i.GravityOffenceID >= 4).length,
    closedRate: filtered.length > 0
      ? Math.round((filtered.filter(i => i.CaseStatusID === 4).length / filtered.length) * 100)
      : 0,
  }), [filtered]);

  const byType = useMemo(() => filtered.reduce((acc, i) => {
    const key = i.CrimeMajorHeadID;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [filtered]);

  const byDistrict = useMemo(() => filtered.reduce((acc, i) => {
    const key = i.DistrictID;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [filtered]);

  const monthlyTrend = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const count = filtered.filter(inc => {
      const o = new Date(inc.IncidentFromDate);
      return o.getMonth() === d.getMonth() && o.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, count };
  }), [filtered]);

  return {
    incidents: filtered, allIncidents: incidents, loading, error,
    stats, byType, byDistrict, monthlyTrend,
    addIncident, updateIncident, deleteIncident,
    refetch: fetchIncidents,
  };
}
