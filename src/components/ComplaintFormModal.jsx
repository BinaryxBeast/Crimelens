import { useState, useRef, useMemo, useEffect } from 'react';
import { DAYS_OF_WEEK, EMPTY_COMPLAINT } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import LocationPickerMap from './LocationPickerMap';
import { supabase } from '../supabaseClient';

// ── Photo Upload Helper ─────────────────────────────────────────
function PhotoUpload({ label, value, onChange, id }) {
  const inputRef = useRef(null);

  // value can be: File object, URL string, or null
  const previewSrc = useMemo(() => {
    if (!value) return null;
    if (value instanceof File) return URL.createObjectURL(value);
    if (typeof value === 'string') return value;
    return null;
  }, [value]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file); // Store the File object, NOT base64
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="fir-photo-upload">
      <label className="fir-label">{label}</label>
      <div
        className={`photo-dropzone${previewSrc ? ' has-photo' : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        {previewSrc ? (
          <div className="photo-preview-container">
            <img src={previewSrc} alt="Preview" className="photo-preview-img" />
            <button type="button" className="photo-remove-btn" onClick={handleRemove} title="Remove photo">
              <span className="material-icons">close</span>
            </button>
          </div>
        ) : (
          <div className="photo-placeholder">
            <span className="material-icons">add_a_photo</span>
            <span>Upload Photo</span>
          </div>
        )}
        <input ref={inputRef} id={id} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

// ── Reconstruct form data from a DB row for editing ─────────────
function rowToFormData(row) {
  const cd = row.complaint_data || {};
  const comp = row._complainant || {};
  const vic = row._victim || {};
  const acc = row._accused || {};
  return {
    ...EMPTY_COMPLAINT,
    ...cd,
    // Table-level columns
    fir_number: row.CrimeNo || '',
    crime_type: row.CrimeMajorHeadID || '',
    crime_sub_head: row.CrimeMinorHeadID || '',
    district: row.DistrictID || '',
    police_station: row.PoliceStationID || '',
    case_category: row.CaseCategoryID || '',
    latitude: row.latitude || '',
    longitude: row.longitude || '',
    status: row.CaseStatusID || '',
    severity: row.GravityOffenceID || 3,
    description: row.BriefFacts || '',
    occurred_at: row.IncidentFromDate || '',
    reported_at: row.InfoReceivedPSDate || '',
    // Complainant from relational table
    complainant: {
      name: comp.ComplainantName || cd.complainant?.name || '',
      father_husband_name: cd.complainant?.father_husband_name || '',
      dob: cd.complainant?.dob || '',
      nationality: cd.complainant?.nationality || '',
      passport_no: cd.complainant?.passport_no || '',
      passport_date_of_issue: cd.complainant?.passport_date_of_issue || '',
      passport_place_of_issue: cd.complainant?.passport_place_of_issue || '',
      occupation: comp.OccupationName || cd.complainant?.occupation || '',
      address: cd.complainant?.address || '',
    },
    // Victim from relational table
    victim: {
      name: vic.VictimName || cd.victim?.name || '',
      age: vic.AgeYear || cd.victim?.age || '',
      gender: vic.GenderID === 1 ? 'Male' : vic.GenderID === 2 ? 'Female' : vic.GenderID === 3 ? 'Other' : cd.victim?.gender || '',
      occupation: vic.OccupationName || cd.victim?.occupation || '',
    },
    // Accused from relational table
    offender: {
      name: acc.AccusedName || cd.offender?.name || '',
      age: acc.AgeYear || cd.offender?.age || '',
      gender: acc.GenderID === 1 ? 'Male' : acc.GenderID === 2 ? 'Female' : acc.GenderID === 3 ? 'Other' : cd.offender?.gender || 'Male',
      district: cd.offender?.district || '',
      address: cd.offender?.address || '',
      modus_operandi: cd.offender?.modus_operandi || '',
      criminal_history: cd.offender?.criminal_history || 0,
      risk_score: cd.offender?.risk_score || 0,
    },
    // Acts from relational table
    acts: row._actSections && row._actSections.length > 0
      ? [
          ...row._actSections.map(a => ({ act: a.ActID || 'IPC', sections: parseInt(a.SectionID) || '' })),
          ...Array(Math.max(0, 3 - row._actSections.length)).fill({ act: 'IPC', sections: '' }),
        ].slice(0, 3)
      : cd.acts || [{ act: 'IPC', sections: '' }, { act: 'IPC', sections: '' }, { act: 'IPC', sections: '' }],
    // Photos: use existing URLs from complaint_data
    complainant_photo: cd.complainant_photo_url || null,
    offender_photo: cd.offender_photo_url || null,
    victim_photo: cd.victim_photo_url || null,
    // Keep reference to existing complaint_data for update
    _existingComplaintData: cd,
    _id: row.CaseMasterID,
  };
}

// ── Main Component ──────────────────────────────────────────────
export default function ComplaintFormModal({
  open, onClose, onSave, editRow = null, saving = false, formError = '',
}) {
  const isEdit = !!editRow;
  const initial = isEdit ? rowToFormData(editRow) : JSON.parse(JSON.stringify(EMPTY_COMPLAINT));

  const [form, setForm] = useState(initial);
  const [localError, setLocalError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [draftExists, setDraftExists] = useState(false);
  const totalSteps = 5;

  const handleNext = () => {
    const formEl = document.getElementById('complaint-form');
    if (formEl) {
      const invalidElements = formEl.querySelectorAll(':invalid');
      const visibleInvalid = Array.from(invalidElements).find(el => el.offsetParent !== null);
      if (visibleInvalid) {
        formEl.reportValidity();
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(s => s + 1);
      setTimeout(() => document.querySelector('.fir-form-body')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      setTimeout(() => document.querySelector('.fir-form-body')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  // Lookup data from DB
  const {
    districts, crimeHeads, crimeSubHeads, statuses, gravityLevels,
    caseCategories, acts, sections, occupations, units,
    getUnitsByDistrict, getSubHeadsByCrimeHead, getSectionsByAct,
    getDistrictCoords,
  } = useLookupData();

  // Derived lists based on current form selections
  const filteredUnits = useMemo(
    () => form.district ? getUnitsByDistrict(parseInt(form.district)) : units,
    [form.district, getUnitsByDistrict, units]
  );
  const filteredSubHeads = useMemo(() => {
    let typeId = parseInt(form.crime_type);
    if (isNaN(typeId)) {
      typeId = crimeHeads.find(c => c.CrimeGroupName === form.crime_type)?.CrimeHeadID;
    }
    return typeId ? getSubHeadsByCrimeHead(typeId) : [];
  }, [form.crime_type, crimeHeads, getSubHeadsByCrimeHead]);
  const filteredSections0 = useMemo(
    () => form.acts[0]?.act ? getSectionsByAct(form.acts[0].act) : [],
    [form.acts, getSectionsByAct]
  );
  const filteredSections1 = useMemo(
    () => form.acts[1]?.act ? getSectionsByAct(form.acts[1].act) : [],
    [form.acts, getSectionsByAct]
  );
  const filteredSections2 = useMemo(
    () => form.acts[2]?.act ? getSectionsByAct(form.acts[2].act) : [],
    [form.acts, getSectionsByAct]
  );
  const sectionsByIndex = [filteredSections0, filteredSections1, filteredSections2];

  // Reset form when editRow changes
  useEffect(() => {
    if (open) {
      let initialForm = isEdit ? rowToFormData(editRow) : JSON.parse(JSON.stringify(EMPTY_COMPLAINT));

      if (isEdit) {
        if (initialForm.case_category && !isNaN(initialForm.case_category)) {
          initialForm.case_category = caseCategories.find(c => c.CaseCategoryID === parseInt(initialForm.case_category))?.LookupValue || initialForm.case_category;
        }
        if (initialForm.crime_type && !isNaN(initialForm.crime_type)) {
          initialForm.crime_type = crimeHeads.find(c => c.CrimeHeadID === parseInt(initialForm.crime_type))?.CrimeGroupName || initialForm.crime_type;
        }
        if (initialForm.crime_sub_head && !isNaN(initialForm.crime_sub_head)) {
          initialForm.crime_sub_head = crimeSubHeads.find(c => c.CrimeSubHeadID === parseInt(initialForm.crime_sub_head))?.CrimeHeadName || initialForm.crime_sub_head;
        }
      }

      if (!isEdit) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const currentDateStr = `${yyyy}-${mm}-${dd}`;
        
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${hh}:${min}`;
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayStr = days[now.getDay()];

        initialForm = {
          ...initialForm,
          year: yyyy.toString(),
          fir_date: currentDateStr,
          occurrence_date: currentDateStr,
          occurrence_time: currentTimeStr,
          occurrence_day: currentDayStr,
          info_received_date: currentDateStr,
          info_received_time: currentTimeStr,
          gd_ref_time: currentTimeStr,
        };

        const draft = localStorage.getItem('crimelens_fir_draft');
        setDraftExists(!!draft);
      } else {
        setDraftExists(false);
      }

      setForm(initialForm);
      setLocalError('');

      // Fetch police profile for auto-filling and read-only display
      const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('Employee')
            .select('FirstName, RankID, DesignationID, KGID')
            .eq('id', user.id)
            .single();
          
          if (data && !isEdit) {
            setForm(prev => ({
              ...prev,
              officer_name: data.FirstName || '',
              officer_rank: data.RankID ? String(data.RankID) : '',
              officer_no: data.KGID || '',
            }));
          }
        }
      };
      
      fetchProfile();
    }
  }, [open, editRow, isEdit]);

  if (!open) return null;

  // ── Helpers ──
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setNested = (parent, field, value) =>
    setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const setAct = (index, field, value) =>
    setForm(prev => {
      const acts = [...prev.acts];
      acts[index] = { ...acts[index], [field]: value };
      return { ...prev, acts };
    });

  const handleSaveDraft = () => {
    try {
      const draftForm = { ...form };
      if (draftForm.complainant_photo instanceof File) draftForm.complainant_photo = null;
      if (draftForm.offender_photo instanceof File) draftForm.offender_photo = null;
      if (draftForm.victim_photo instanceof File) draftForm.victim_photo = null;

      localStorage.setItem('crimelens_fir_draft', JSON.stringify(draftForm));
      alert('Draft saved successfully!');
    } catch (e) {
      console.error('Failed to save draft:', e);
      setLocalError('Failed to save draft.');
    }
  };

  const handleLoadDraft = () => {
    try {
      const draftStr = localStorage.getItem('crimelens_fir_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setForm(draft);
        setDraftExists(false);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
      setLocalError('Failed to load draft.');
    }
  };

  // ── Submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formEl = document.getElementById('complaint-form');
    if (formEl) {
      const invalidElements = formEl.querySelectorAll(':invalid');
      if (invalidElements.length > 0) {
        const firstInvalid = invalidElements[0];
        const stepDiv = firstInvalid.closest('[data-step]');
        if (stepDiv) {
          setCurrentStep(parseInt(stepDiv.getAttribute('data-step')));
          setTimeout(() => formEl.reportValidity(), 100);
          return;
        }
      }
    }
    
    setLocalError('');

    // Collect File objects separately from form data
    const photoFiles = {
      complainant_photo: form.complainant_photo instanceof File ? form.complainant_photo : null,
      offender_photo: form.offender_photo instanceof File ? form.offender_photo : null,
      victim_photo: form.victim_photo instanceof File ? form.victim_photo : null,
    };

    const payload = { ...form };
    const catMatch = caseCategories.find(c => c.LookupValue === form.case_category);
    if (catMatch) payload.case_category = catMatch.CaseCategoryID;
    
    const typeMatch = crimeHeads.find(c => c.CrimeGroupName === form.crime_type);
    if (typeMatch) payload.crime_type = typeMatch.CrimeHeadID;
    
    const subMatch = filteredSubHeads.find(s => s.CrimeHeadName === form.crime_sub_head);
    if (subMatch) payload.crime_sub_head = subMatch.CrimeSubHeadID;

    onSave(payload, isEdit, photoFiles);
  };

  const displayError = formError || localError;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-fir">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-icons">{isEdit ? 'edit' : 'add_circle'}</span>
            {isEdit ? 'Edit Complaint' : 'First Information Report (FIR)'}
          </div>
          <div className="fir-header-subtitle">Under Section 154 Cr.P.C</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} id="complaint-form">
          <div className="stepper-progress">
            <div className="stepper-text">Step {currentStep} of {totalSteps}</div>
            <div className="stepper-bar-bg">
              <div className="stepper-bar-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
            </div>
          </div>
          <div className="fir-form-body">
            {draftExists && (
              <div className="fir-draft-banner" style={{
                background: 'rgba(255, 152, 0, 0.1)',
                border: '1px dashed #ff9800',
                padding: '10px 15px',
                borderRadius: '6px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ff9800'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons">assignment_turned_in</span>
                  <span>You have a saved draft from a previous session.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-sm btn-primary" style={{ background: '#ff9800', borderColor: '#ff9800' }} onClick={handleLoadDraft}>Load Draft</button>
                  <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--text-muted)' }} onClick={() => { localStorage.removeItem('crimelens_fir_draft'); setDraftExists(false); }}>Dismiss</button>
                </div>
              </div>
            )}

            {/* ── STEP 1: Incident Details ── */}
            <div data-step="1" style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            {/* ── Section 1: District, PS, Year, FIR No, Date ── */}
            <div className="fir-section">
              <div className="fir-section-number">1</div>
              <div className="fir-row fir-row-5">
                <div className="fir-field">
                  <label className="fir-label required">Dist.</label>
                  <select className="form-select fir-input" required value={form.district} onChange={e => {
                    const distId = parseInt(e.target.value);
                    const coords = getDistrictCoords(distId);
                    setForm(prev => {
                      const updates = { district: e.target.value, police_station: '' };
                      if (coords) {
                        const jitterLat = (Math.random() - 0.5) * 0.05;
                        const jitterLng = (Math.random() - 0.5) * 0.05;
                        updates.latitude = (coords.latitude + jitterLat).toFixed(4);
                        updates.longitude = (coords.longitude + jitterLng).toFixed(4);
                      }
                      return { ...prev, ...updates };
                    });
                  }}>
                    <option value="">— Select —</option>
                    {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                  </select>
                </div>
                <div className="fir-field">
                  <label className="fir-label required">P.S.</label>
                  <select className="form-select fir-input" required value={form.police_station} onChange={e => set('police_station', e.target.value)}>
                    <option value="">— Select —</option>
                    {filteredUnits.map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
                  </select>
                </div>
                <div className="fir-field fir-field-sm">
                  <label className="fir-label required">Year</label>
                  <input className="form-input fir-input" required value={form.year} onChange={e => set('year', e.target.value)} placeholder="2025" />
                </div>
                <div className="fir-field">
                  <label className="fir-label required">F.I.R. No.</label>
                  <input className="form-input fir-input" required value={form.fir_number} onChange={e => set('fir_number', e.target.value)} placeholder="KSP/BLR/2025/XXX" disabled={isEdit} />
                </div>
                <div className="fir-field">
                  <label className="fir-label required">Date</label>
                  <input className="form-input fir-input" type="date" required value={form.fir_date} onChange={e => set('fir_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Section 2: Acts & Sections ── */}
            <div className="fir-section">
              <div className="fir-section-number">2</div>
              <div className="fir-acts-grid">
                {[0, 1, 2].map(i => (
                  <div key={i} className="fir-row fir-row-acts">
                    <span className="fir-row-label">({['i', 'ii', 'iii'][i]})</span>
                    <div className="fir-field">
                      <label className="fir-label">{i === 0 ? <span className="required">Act</span> : 'Act'}</label>
                      <select className="form-select fir-input" required={i === 0} value={form.acts[i]?.act || 'IPC'} onChange={e => { setAct(i, 'act', e.target.value); setAct(i, 'sections', ''); }}>
                        <option value="">— Select —</option>
                        {!acts.some(a => a.ActCode === 'IPC') && <option value="IPC">IPC</option>}
                        {acts.map(a => <option key={a.ActCode} value={a.ActCode}>{a.ShortName}</option>)}
                      </select>
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">{i === 0 ? <span className="required">Sections</span> : 'Sections'}</label>
                      <input className="form-input fir-input" type="number" required={i === 0} value={form.acts[i]?.sections || ''} onChange={e => setAct(i, 'sections', e.target.value ? parseInt(e.target.value) : '')} placeholder="e.g. 302" />
                    </div>
                  </div>
                ))}
                <div className="fir-row">
                  <span className="fir-row-label">(iv)</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label">Other Acts & Sections</label>
                    <input className="form-input fir-input" value={form.other_acts_sections} onChange={e => set('other_acts_sections', e.target.value)} placeholder="Other applicable acts and sections" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Occurrence & Time ── */}
            <div className="fir-section">
              <div className="fir-section-number">3</div>
              <div className="fir-subsections">
                <div className="fir-subsection">
                  <span className="fir-row-label">(a)</span>
                  <div className="fir-row fir-row-4">
                    <div className="fir-field">
                      <label className="fir-label required">Occurrence Day</label>
                      <select className="form-select fir-input" required value={form.occurrence_day} onChange={e => set('occurrence_day', e.target.value)}>
                        <option value="">— Select —</option>
                        {DAYS_OF_WEEK.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="fir-field">
                      <label className="fir-label required">Date</label>
                      <input className="form-input fir-input" type="date" required value={form.occurrence_date} onChange={e => {
                        const val = e.target.value;
                        setForm(prev => {
                          const updates = { occurrence_date: val };
                          if (val) {
                            const d = new Date(val);
                            if (!isNaN(d)) {
                              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                              updates.occurrence_day = days[d.getDay()];
                            }
                          }
                          return { ...prev, ...updates };
                        });
                      }} />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label required">Time</label>
                      <input className="form-input fir-input" type="time" required value={form.occurrence_time} onChange={e => set('occurrence_time', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(b)</span>
                  <div className="fir-row fir-row-2">
                    <div className="fir-field">
                      <label className="fir-label">Info received at P.S. Date</label>
                      <input className="form-input fir-input" type="date" value={form.info_received_date} onChange={e => set('info_received_date', e.target.value)} />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">Time</label>
                      <input className="form-input fir-input" type="time" value={form.info_received_time} onChange={e => set('info_received_time', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(c)</span>
                  <div className="fir-row fir-row-2">
                    <div className="fir-field">
                      <label className="fir-label">GD Ref Entry No(s)</label>
                      <input className="form-input fir-input" value={form.gd_ref_entry_no} onChange={e => set('gd_ref_entry_no', e.target.value)} placeholder="Entry number" />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">Time</label>
                      <input className="form-input fir-input" type="time" value={form.gd_ref_time} onChange={e => set('gd_ref_time', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 4: Type of Information ── */}
            <div className="fir-section">
              <div className="fir-section-number">4</div>
              <div className="fir-row">
                <div className="fir-field">
                  <label className="fir-label required">Type of Information</label>
                  <div className="fir-radio-group">
                    {['Written', 'Oral'].map(t => (
                      <label key={t} className={`fir-radio-option${form.type_of_information === t ? ' active' : ''}`}>
                        <input type="radio" name="type_of_information" value={t} checked={form.type_of_information === t} onChange={e => set('type_of_information', e.target.value)} />
                        <span className="fir-radio-dot" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 8: Delay Reason ── */}
            <div className="fir-section">
              <div className="fir-section-number">8</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Reasons for delay in reporting</label>
                <input className="form-input fir-input" value={form.delay_reason} onChange={e => set('delay_reason', e.target.value)} placeholder="Reason for delay, if any" />
              </div>
            </div>
            </div>

            {/* ── STEP 2: Location Details ── */}
            <div data-step="2" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            {/* ── Section 5: Place of Occurrence ── */}
            <div className="fir-section">
              <div className="fir-section-number">5</div>
              <div className="fir-subsections">
                <div className="fir-subsection">
                  <span className="fir-row-label">(a)</span>
                  <div className="fir-row fir-row-2">
                    <div className="fir-field">
                      <label className="fir-label">Direction & Distance from P.S.</label>
                      <input className="form-input fir-input" value={form.place_direction} onChange={e => set('place_direction', e.target.value)} placeholder="e.g. South, 2.5km" />
                    </div>
                    <div className="fir-field fir-field-sm">
                      <label className="fir-label">Beat No.</label>
                      <input className="form-input fir-input" value={form.beat_no} onChange={e => set('beat_no', e.target.value)} placeholder="12" />
                    </div>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(b)</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label required">Address</label>
                    <input className="form-input fir-input" required value={form.place_address} onChange={e => set('place_address', e.target.value)} placeholder="Full address of the place of occurrence" />
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(c)</span>
                  <div className="fir-row fir-row-2">
                    <div className="fir-field">
                      <label className="fir-label">Outside limit P.S. name</label>
                      <input className="form-input fir-input" value={form.outside_ps_name} onChange={e => set('outside_ps_name', e.target.value)} />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">District</label>
                      <input className="form-input fir-input" value={form.outside_ps_district} onChange={e => set('outside_ps_district', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(d)</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label">Pin Location on Map (updates Latitude/Longitude below)</label>
                    <LocationPickerMap lat={form.latitude} lng={form.longitude} onChange={(lat, lng) => {
                      setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    }} />
                  </div>
                </div>
              </div>
            </div>

            </div>

            {/* ── STEP 3: Parties Involved ── */}
            <div data-step="3" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
            {/* ── Section 6: Complainant / Informant ── */}
            <div className="fir-section">
              <div className="fir-section-number">6</div>
              <div className="fir-section-title">Complainant / Informant Information</div>
              <div className="fir-subsections">
                <div className="fir-row fir-row-photo">
                  <div className="fir-fields-col">
                    <div className="fir-subsection">
                      <span className="fir-row-label">(a)</span>
                      <div className="fir-field fir-field-full">
                        <label className="fir-label">Name</label>
                        <input className="form-input fir-input" value={form.complainant.name} onChange={e => setNested('complainant', 'name', e.target.value)} placeholder="Full name" />
                      </div>
                    </div>
                    <div className="fir-subsection">
                      <span className="fir-row-label">(b)</span>
                      <div className="fir-field fir-field-full">
                        <label className="fir-label">Father's / Husband's Name</label>
                        <input className="form-input fir-input" value={form.complainant.father_husband_name} onChange={e => setNested('complainant', 'father_husband_name', e.target.value)} />
                      </div>
                    </div>
                    <div className="fir-row fir-row-2">
                      <div className="fir-subsection">
                        <span className="fir-row-label">(c)</span>
                        <div className="fir-field">
                          <label className="fir-label">Date / Year of Birth</label>
                          <input className="form-input fir-input" type="date" value={form.complainant.dob} onChange={e => setNested('complainant', 'dob', e.target.value)} />
                        </div>
                      </div>
                      <div className="fir-subsection">
                        <span className="fir-row-label">(d)</span>
                        <div className="fir-field">
                          <label className="fir-label">Nationality</label>
                          <input className="form-input fir-input" value={form.complainant.nationality} onChange={e => setNested('complainant', 'nationality', e.target.value)} placeholder="Indian" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <PhotoUpload label="Complainant Photo" value={form.complainant_photo} onChange={v => set('complainant_photo', v)} id="complainant-photo" />
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(e)</span>
                  <div className="fir-row fir-row-3">
                    <div className="fir-field">
                      <label className="fir-label">Passport No.</label>
                      <input className="form-input fir-input" value={form.complainant.passport_no} onChange={e => setNested('complainant', 'passport_no', e.target.value)} />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">Date of Issue</label>
                      <input className="form-input fir-input" type="date" value={form.complainant.passport_date_of_issue} onChange={e => setNested('complainant', 'passport_date_of_issue', e.target.value)} />
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">Place of Issue</label>
                      <input className="form-input fir-input" value={form.complainant.passport_place_of_issue} onChange={e => setNested('complainant', 'passport_place_of_issue', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(f)</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label">Occupation</label>
                    <input className="form-input fir-input" list="occupation-list" value={form.complainant.occupation} onChange={e => setNested('complainant', 'occupation', e.target.value)} placeholder="Start typing..." />
                    <datalist id="occupation-list">
                      {occupations.map(o => <option key={o.OccupationID} value={o.OccupationName} />)}
                    </datalist>
                  </div>
                </div>
                <div className="fir-subsection">
                  <span className="fir-row-label">(g)</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label">Address</label>
                    <input className="form-input fir-input" value={form.complainant.address} onChange={e => setNested('complainant', 'address', e.target.value)} placeholder="Full residential address" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 7: Accused / Offender ── */}
            <div className="fir-section">
              <div className="fir-section-number">7</div>
              <div className="fir-section-title">Details of known / suspected / unknown / accused</div>
              <div className="fir-row fir-row-photo">
                <div className="fir-fields-col" style={{ flex: 1 }}>
                  <textarea className="form-textarea fir-textarea" value={form.accused_details} onChange={e => set('accused_details', e.target.value)} placeholder="Attach separate sheet if necessary. Provide full description of the accused..." rows={4} />
                  <div className="fir-row fir-row-3" style={{ marginTop: 10 }}>
                    <div className="fir-field">
                      <label className="fir-label">Offender Name</label>
                      <input className="form-input fir-input" value={form.offender.name} onChange={e => setNested('offender', 'name', e.target.value)} placeholder="Name or Unknown" />
                    </div>
                    <div className="fir-field fir-field-sm">
                      <label className="fir-label">Gender</label>
                      <select className="form-select fir-input" value={form.offender.gender} onChange={e => setNested('offender', 'gender', e.target.value)}>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="fir-field fir-field-sm">
                      <label className="fir-label">Age</label>
                      <input className="form-input fir-input" type="number" min="0" value={form.offender.age} onChange={e => setNested('offender', 'age', e.target.value)} placeholder="Age" />
                    </div>
                  </div>
                </div>
                <PhotoUpload label="Offender Photo" value={form.offender_photo} onChange={v => set('offender_photo', v)} id="offender-photo" />
              </div>
            </div>

            {/* ── Victim Section ── */}
            <div className="fir-section">
              <div className="fir-section-number" style={{ background: 'rgba(102,187,106,0.15)', color: '#66bb6a' }}>V</div>
              <div className="fir-section-title">Victim Information</div>
              <div className="fir-row fir-row-photo">
                <div className="fir-fields-col" style={{ flex: 1 }}>
                  <div className="fir-row fir-row-4">
                    <div className="fir-field">
                      <label className="fir-label">Name</label>
                      <input className="form-input fir-input" value={form.victim.name} onChange={e => setNested('victim', 'name', e.target.value)} placeholder="Victim name" />
                    </div>
                    <div className="fir-field fir-field-sm">
                      <label className="fir-label">Age</label>
                      <input className="form-input fir-input" type="number" min="0" value={form.victim.age} onChange={e => setNested('victim', 'age', e.target.value)} />
                    </div>
                    <div className="fir-field fir-field-sm">
                      <label className="fir-label">Gender</label>
                      <select className="form-select fir-input" value={form.victim.gender} onChange={e => setNested('victim', 'gender', e.target.value)}>
                        <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="fir-field">
                      <label className="fir-label">Occupation</label>
                      <input className="form-input fir-input" list="occupation-list" value={form.victim.occupation} onChange={e => setNested('victim', 'occupation', e.target.value)} placeholder="Start typing..." />
                    </div>
                  </div>
                </div>
                <PhotoUpload label="Victim Photo" value={form.victim_photo} onChange={v => set('victim_photo', v)} id="victim-photo" />
              </div>
            </div>


            </div>

            {/* ── STEP 4: Stolen Property & Inquest ── */}
            <div data-step="4" style={{ display: currentStep === 4 ? 'block' : 'none' }}>
            {/* ── Section 9: Properties Stolen ── */}
            <div className="fir-section">
              <div className="fir-section-number">9</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Particulars of properties stolen / involved</label>
                <textarea className="form-textarea fir-textarea" value={form.properties_stolen} onChange={e => set('properties_stolen', e.target.value)} placeholder="List of stolen/involved properties..." rows={3} />
              </div>
            </div>

            {/* ── Section 10: Total Value ── */}
            <div className="fir-section">
              <div className="fir-section-number">10</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Total value of the properties stolen / involved (₹)</label>
                <input className="form-input fir-input" value={form.total_value_stolen} onChange={e => set('total_value_stolen', e.target.value)} placeholder="e.g. 3,50,000" />
              </div>
            </div>

            {/* ── Section 11: Inquest Report ── */}
            <div className="fir-section">
              <div className="fir-section-number">11</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label required">Inquest Report / U.D. Case No.</label>
                <input className="form-input fir-input" required value={form.inquest_report} onChange={e => set('inquest_report', e.target.value)} placeholder="UD case number or N/A" />
              </div>
            </div>

            </div>

            {/* ── STEP 5: Review & Submit ── */}
            <div data-step="5" style={{ display: currentStep === 5 ? 'block' : 'none' }}>
            {/* ── Section 12: FIR Contents ── */}
            <div className="fir-section">
              <div className="fir-section-number">12</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label">F.I.R. Contents</label>
                <textarea className="form-textarea fir-textarea fir-textarea-lg" value={form.fir_contents} onChange={e => set('fir_contents', e.target.value)} placeholder="Detailed description of the incident..." rows={8} />
              </div>
            </div>

            {/* ── Section 13: Action Taken ── */}
            <div className="fir-section">
              <div className="fir-section-number">13</div>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Action taken</label>
                <p className="fir-action-text">Since the above report reveals commission of offence(s) u/s as mentioned at Item No. 2, registered the case and took up the investigation / direction:</p>
                <textarea className="form-textarea fir-textarea" value={form.action_taken} onChange={e => set('action_taken', e.target.value)} placeholder="Action taken details..." rows={3} />
              </div>
              <div className="fir-signature-block">
                <div className="fir-signature-title">Officer-in-charge, Police Station</div>
                <div className="fir-row fir-row-3">
                  <div className="fir-field">
                    <label className="fir-label">Name</label>
                    <input className="form-input fir-input" value={form.officer_name} onChange={e => set('officer_name', e.target.value)} placeholder="Auto-filled" disabled title="Auto-filled from your profile" />
                  </div>
                  <div className="fir-field">
                    <label className="fir-label">Rank</label>
                    <input className="form-input fir-input" value={form.officer_rank} onChange={e => set('officer_rank', e.target.value)} placeholder="Auto-filled" disabled title="Auto-filled from your profile" />
                  </div>
                  <div className="fir-field">
                    <label className="fir-label">No.</label>
                    <input className="form-input fir-input" value={form.officer_no} onChange={e => set('officer_no', e.target.value)} placeholder="Auto-filled" disabled title="Auto-filled from your profile" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 14: Complainant Signature ── */}
            <div className="fir-section">
              <div className="fir-section-number">14</div>
              <div className="fir-row fir-row-2">
                <div className="fir-field">
                  <label className="fir-label">Signature / Thumb-impression of complainant</label>
                  <input className="form-input fir-input" value={form.complainant_signature} onChange={e => set('complainant_signature', e.target.value)} placeholder="Name (signed digitally)" />
                </div>
                <div className="fir-field">
                  <div className="fir-signature-pad"><span className="material-icons">edit</span><span>Signature</span></div>
                </div>
              </div>
            </div>

            {/* ── Section 15: Despatch to Court ── */}
            <div className="fir-section">
              <div className="fir-section-number">15</div>
              <div className="fir-row fir-row-2">
                <div className="fir-field">
                  <label className="fir-label">Despatch to court (1)</label>
                  <input className="form-input fir-input" type="datetime-local" value={form.despatch_date_1} onChange={e => set('despatch_date_1', e.target.value)} />
                </div>
                <div className="fir-field">
                  <label className="fir-label">Despatch to court (2)</label>
                  <input className="form-input fir-input" type="datetime-local" value={form.despatch_date_2} onChange={e => set('despatch_date_2', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── System Fields ── */}
            <div className="fir-section fir-section-system">
              <div className="fir-section-number" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                <span className="material-icons" style={{ fontSize: 14 }}>settings</span>
              </div>
              <div className="fir-section-title">System Fields (Data Layers)</div>
              <div className="fir-row fir-row-5">
                <div className="fir-field">
                  <label className="fir-label">Case Category</label>
                  <input list="case-categories-list" className="form-input fir-input" value={form.case_category} onChange={e => set('case_category', e.target.value)} placeholder="Type category..." />
                  <datalist id="case-categories-list">
                    {caseCategories.map(c => <option key={c.CaseCategoryID} value={c.LookupValue} />)}
                  </datalist>
                </div>
                <div className="fir-field">
                  <label className="fir-label">Crime Type</label>
                  <input list="crime-types-list" className="form-input fir-input" value={form.crime_type} onChange={e => { set('crime_type', e.target.value); set('crime_sub_head', ''); }} placeholder="Type crime type..." />
                  <datalist id="crime-types-list">
                    {crimeHeads.map(c => <option key={c.CrimeHeadID} value={c.CrimeGroupName} />)}
                  </datalist>
                </div>
                <div className="fir-field">
                  <label className="fir-label">Sub Head</label>
                  <input list="sub-heads-list" className="form-input fir-input" value={form.crime_sub_head} onChange={e => set('crime_sub_head', e.target.value)} placeholder="Type sub head..." />
                  <datalist id="sub-heads-list">
                    {filteredSubHeads.map(s => <option key={s.CrimeSubHeadID} value={s.CrimeHeadName} />)}
                  </datalist>
                </div>
                <div className="fir-field fir-field-sm">
                  <label className="fir-label">Severity</label>
                  <select className="form-select fir-input" value={form.severity} onChange={e => set('severity', e.target.value)}>
                    {gravityLevels.map(g => <option key={g.GravityOffenceID} value={g.GravityOffenceID}>{g.GravityOffenceID} — {g.LookupValue}</option>)}
                  </select>
                </div>
                <div className="fir-field">
                  <label className="fir-label">Status</label>
                  <select className="form-select fir-input" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="">— Select —</option>
                    {statuses.map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
                  </select>
                </div>
              </div>
              <div className="fir-row fir-row-3" style={{ marginTop: 8 }}>
                <div className="fir-field fir-field-sm">
                  <label className="fir-label">Latitude</label>
                  <input className="form-input fir-input" type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="12.9716" />
                </div>
                <div className="fir-field fir-field-sm">
                  <label className="fir-label">Longitude</label>
                  <input className="form-input fir-input" type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="77.5946" />
                </div>
                <div className="fir-field">
                  <label className="fir-label">Description (brief)</label>
                  <input className="form-input fir-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief summary" />
                </div>
              </div>
            </div>

            </div>

            {displayError && <div className="error-msg fir-error">{displayError}</div>}
          </div>

          <div className="modal-footer fir-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            {!isEdit && (
              <button type="button" className="btn btn-secondary" style={{ marginRight: 'auto' }} onClick={handleSaveDraft}>
                <span className="material-icons" style={{ fontSize: 16, marginRight: 4 }}>save</span> Save Draft
              </button>
            )}
            <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
              {currentStep > 1 && (
                <button type="button" className="btn btn-secondary" onClick={handleBack}>Back</button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Next <span className="material-icons">chevron_right</span>
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</>
                  ) : (
                    <><span className="material-icons">check</span> {isEdit ? 'Update Complaint' : 'Register Complaint'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
