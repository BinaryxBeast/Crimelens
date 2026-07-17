import { useState, useRef, useMemo, useEffect } from 'react';
import { DAYS_OF_WEEK, EMPTY_COMPLAINT } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import { useAuthStore } from '../store/authStore';
import LocationPickerMap from './LocationPickerMap';

// ── Step configuration ──────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Incident Info', icon: 'description' },
  { id: 2, label: 'Location', icon: 'place' },
  { id: 3, label: 'Parties', icon: 'groups' },
  { id: 4, label: 'Property', icon: 'inventory_2' },
  { id: 5, label: 'Post-Incident', icon: 'gavel' },
  { id: 6, label: 'Review', icon: 'fact_check' },
];

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

// ── Collapsible Section ─────────────────────────────────────────
function CollapsibleSection({ number, title, children, defaultOpen = false, filled = false, numberStyle }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`fir-section fir-section-collapsible${isOpen ? ' is-open' : ''}${filled ? ' is-filled' : ''}`}>
      <div className="fir-section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="fir-section-header-left">
          <div className="fir-section-number" style={numberStyle}>{number}</div>
          {title && <div className="fir-section-title">{title}</div>}
          {filled && !isOpen && <span className="fir-filled-dot" title="Has data" />}
        </div>
        <span className={`material-icons fir-collapse-icon${isOpen ? ' is-open' : ''}`}>expand_more</span>
      </div>
      <div className={`fir-section-body${isOpen ? ' is-open' : ''}`}>
        <div className="fir-section-body-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Reconstruct form data from a DB row for editing ─────────────
function rowToFormData(row) {
  const cd = row.complaint_data || {};
  const comp = row._complainant || {};

  // Build victims array from relational data or complaint_data
  const vicRows = row._victims && row._victims.length > 0 ? row._victims : [];
  const cdVictims = cd.victims || (cd.victim ? [cd.victim] : []);
  let victims;
  if (vicRows.length > 0) {
    victims = vicRows.map(vic => ({
      name: vic.VictimName || '',
      age: vic.AgeYear || '',
      gender: vic.GenderID === 1 ? 'Male' : vic.GenderID === 2 ? 'Female' : vic.GenderID === 3 ? 'Other' : '',
      occupation: vic.OccupationName || '',
    }));
  } else if (cdVictims.length > 0) {
    victims = cdVictims;
  } else {
    victims = [{ name: '', age: '', gender: '', occupation: '' }];
  }

  // Build offenders array from relational data or complaint_data
  const accRows = row._accusedAll && row._accusedAll.length > 0 ? row._accusedAll : [];
  const cdOffenders = cd.offenders || (cd.offender ? [cd.offender] : []);
  let offenders;
  if (accRows.length > 0) {
    offenders = accRows.map(acc => ({
      name: acc.AccusedName || '',
      age: acc.AgeYear || '',
      gender: acc.GenderID === 1 ? 'Male' : acc.GenderID === 2 ? 'Female' : acc.GenderID === 3 ? 'Other' : 'Male',
      district: '',
      address: '',
      modus_operandi: '',
      criminal_history: 0,
      risk_score: 0,
    }));
  } else if (cdOffenders.length > 0) {
    offenders = cdOffenders;
  } else {
    offenders = [{ name: '', age: '', gender: 'Male', district: '', address: '', modus_operandi: '', criminal_history: 0, risk_score: 0 }];
  }

  // Photo URLs — support both old single and new array format
  const offenderPhotos = cd.offender_photo_urls || (cd.offender_photo_url ? [cd.offender_photo_url] : offenders.map(() => null));
  const victimPhotos = cd.victim_photo_urls || (cd.victim_photo_url ? [cd.victim_photo_url] : victims.map(() => null));

  return {
    ...EMPTY_COMPLAINT,
    ...cd,
    // Table-level columns
    fir_number: row.CrimeNo || '',
    crime_type: row.CrimeMajorHeadID || '',
    district: row.DistrictID || '',
    police_station: row.PoliceStationID || '',
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
      religion_id: comp.ReligionID || cd.complainant?.religion_id || '',
      caste_id: comp.CasteID || cd.complainant?.caste_id || '',
    },
    // Multiple victims
    victims,
    // Multiple offenders
    offenders,
    arrests: row._arrests && row._arrests.length > 0 ? row._arrests.map(a => ({ date: a.ArrestSurrenderDate || '', type: a.ArrestSurrenderTypeID || '', state: a.ArrestSurrenderStateId || '', district: a.ArrestSurrenderDistrictId || '', ps: a.PoliceStationID || '', io: a.IOID || '', court: a.CourtID || '' })) : cd.arrests || [],
    chargesheets: row._chargesheets && row._chargesheets.length > 0 ? row._chargesheets.map(c => ({ date: c.csdate || '', type: c.cstype || '', io: c.PolicePersonID || '' })) : cd.chargesheets || [],
    // Acts from relational table
    acts: row._actSections && row._actSections.length > 0
      ? row._actSections.map(a => ({ act: a.ActID || 'IPC', sections: parseInt(a.SectionID) || '' }))
      : cd.acts || [{ act: 'IPC', sections: '' }],
    // Photos
    complainant_photo: cd.complainant_photo_url || null,
    offender_photos: offenderPhotos,
    victim_photos: victimPhotos,
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
  const [visitedSteps, setVisitedSteps] = useState(new Set([1]));
  const totalSteps = 6;

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
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      setTimeout(() => document.querySelector('.fir-form-body')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      setTimeout(() => document.querySelector('.fir-form-body')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  const handleStepClick = (stepId) => {
    // Allow clicking on visited steps or steps before current
    if (visitedSteps.has(stepId) || stepId <= currentStep) {
      setCurrentStep(stepId);
      setTimeout(() => document.querySelector('.fir-form-body')?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  // Officer profile from auth store
  const { profile: officerProfile } = useAuthStore();

  // Lookup data from DB
  const {
    districts, crimeHeads, statuses, gravityLevels,
    acts, sections, occupations, units,
    religions, castes, states, unitTypes, courts, employees, designations, ranks,
    getUnitsByDistrict, getSectionsByAct,
    getDistrictCoords,
  } = useLookupData();

  // Derived lists based on current form selections
  const filteredUnits = useMemo(
    () => form.district ? getUnitsByDistrict(parseInt(form.district)) : units,
    [form.district, getUnitsByDistrict, units]
  );

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
        if (initialForm.crime_type && !isNaN(initialForm.crime_type)) {
          initialForm.crime_type = crimeHeads.find(c => c.CrimeHeadID === parseInt(initialForm.crime_type))?.CrimeGroupName || initialForm.crime_type;
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
      setCurrentStep(1);
      setVisitedSteps(new Set([1]));

      // Auto-fill officer details from profile store
      if (officerProfile && !isEdit) {
        setForm(prev => ({
          ...prev,
          officer_name: officerProfile.officer_name || '',
          officer_rank: officerProfile.rank?.RankName || '',
          officer_no: officerProfile.kgid || '',
          officer_unit: officerProfile.unit?.UnitName || '',
          officer_photo_url: officerProfile.photo_url || '',
        }));
      }
    }
  }, [open, editRow, isEdit, officerProfile]);

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

  // ── Array helpers for victims/offenders ──
  const setArrayItem = (arrayName, index, field, value) =>
    setForm(prev => {
      const arr = [...prev[arrayName]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [arrayName]: arr };
    });

  const addArrayItem = (arrayName, template) =>
    setForm(prev => {
      if (prev[arrayName].length >= 10) return prev;
      const photosKey = arrayName === 'victims' ? 'victim_photos' : arrayName === 'offenders' ? 'offender_photos' : null;
      const updates = { [arrayName]: [...prev[arrayName], { ...template }] };
      if (photosKey) updates[photosKey] = [...(prev[photosKey] || []), null];
      return { ...prev, ...updates };
    });

  const removeArrayItem = (arrayName, index) =>
    setForm(prev => {
      if (prev[arrayName].length <= 1) return prev;
      const photosKey = arrayName === 'victims' ? 'victim_photos' : arrayName === 'offenders' ? 'offender_photos' : null;
      const updates = { [arrayName]: prev[arrayName].filter((_, i) => i !== index) };
      if (photosKey) updates[photosKey] = (prev[photosKey] || []).filter((_, i) => i !== index);
      return { ...prev, ...updates };
    });

  const setArrayPhoto = (photosKey, index, value) =>
    setForm(prev => {
      const photos = [...(prev[photosKey] || [])];
      photos[index] = value;
      return { ...prev, [photosKey]: photos };
    });

  const handleSaveDraft = () => {
    try {
      const draftForm = { ...form };
      if (draftForm.complainant_photo instanceof File) draftForm.complainant_photo = null;
      draftForm.offender_photos = (draftForm.offender_photos || []).map(p => p instanceof File ? null : p);
      draftForm.victim_photos = (draftForm.victim_photos || []).map(p => p instanceof File ? null : p);

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
      offender_photos: (form.offender_photos || []).map(p => p instanceof File ? p : null),
      victim_photos: (form.victim_photos || []).map(p => p instanceof File ? p : null),
    };

    const payload = { ...form };
    const typeMatch = crimeHeads.find(c => c.CrimeGroupName === form.crime_type);
    if (typeMatch) payload.crime_type = typeMatch.CrimeHeadID;

    onSave(payload, isEdit, photoFiles);
  };

  const displayError = formError || localError;

  // Empty templates for adding new items
  const emptyVictim = { name: '', age: '', gender: '', occupation: '' };
  const emptyOffender = { name: '', age: '', gender: 'Male', district: '', address: '', modus_operandi: '', criminal_history: 0, risk_score: 0 };

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
          {/* ── Visual Stepper ── */}
          <div className="stepper-visual">
            {STEPS.map((step, idx) => {
              const isCompleted = visitedSteps.has(step.id) && step.id < currentStep;
              const isActive = step.id === currentStep;
              const isClickable = visitedSteps.has(step.id) || step.id <= currentStep;
              return (
                <div key={step.id} className="stepper-step-wrapper">
                  <div
                    className={`stepper-step${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}${isClickable ? ' clickable' : ''}`}
                    onClick={() => isClickable && handleStepClick(step.id)}
                    title={step.label}
                  >
                    <div className="stepper-circle">
                      {isCompleted ? (
                        <span className="material-icons stepper-check">check</span>
                      ) : (
                        <span className="material-icons stepper-icon">{step.icon}</span>
                      )}
                    </div>
                    <span className="stepper-label">{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`stepper-connector${isCompleted ? ' completed' : ''}`} />
                  )}
                </div>
              );
            })}
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
            <CollapsibleSection number="1" title="FIR Registration Details" defaultOpen={true} filled={!!(form.district && form.fir_number)}>
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
                  <input className="form-input fir-input" required value={form.fir_number} onChange={e => set('fir_number', e.target.value)} placeholder="KSP/BLR/2025/XXX" />
                </div>
                <div className="fir-field">
                  <label className="fir-label required">Date</label>
                  <input className="form-input fir-input" type="date" required value={form.fir_date} onChange={e => set('fir_date', e.target.value)} />
                </div>
              </div>
            </CollapsibleSection>

            {/* ── Section 2: Acts & Sections ── */}
            <CollapsibleSection number="2" title="Acts & Sections" filled={!!(form.acts[0]?.sections)}>
              <div className="fir-acts-grid">
                {form.acts.map((act, i) => (
                  <div key={i} className="fir-row fir-row-acts" style={{ position: 'relative' }}>
                    <span className="fir-row-label">({i + 1})</span>
                    <div className="fir-field">
                      <label className="fir-label">{i === 0 ? <span className="required">Act</span> : 'Act'}</label>
                      <select className="form-select fir-input" required={i === 0} value={act.act || 'IPC'} onChange={e => { setAct(i, 'act', e.target.value); setAct(i, 'sections', ''); }}>
                        <option value="">— Select —</option>
                        {!acts.some(a => a.ActCode === 'IPC') && <option value="IPC">IPC</option>}
                        {acts.map(a => <option key={a.ActCode} value={a.ActCode}>{a.ShortName}</option>)}
                      </select>
                    </div>
                    <div className="fir-field" style={{ position: 'relative' }}>
                      <label className="fir-label">{i === 0 ? <span className="required">Sections</span> : 'Sections'}</label>
                      <input className="form-input fir-input" type="number" required={i === 0} value={act.sections || ''} onChange={e => setAct(i, 'sections', e.target.value ? parseInt(e.target.value) : '')} placeholder="e.g. 302" style={{ paddingRight: form.acts.length > 1 ? '40px' : '12px' }} />
                      {form.acts.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeArrayItem('acts', i)} title="Remove" style={{ position: 'absolute', right: '4px', top: '24px', color: 'var(--text-muted)' }}>
                          <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.acts.length < 10 && (
                  <div className="fir-row">
                    <button type="button" className="btn btn-secondary btn-sm fir-add-person" onClick={() => addArrayItem('acts', { act: 'IPC', sections: '' })} style={{ marginTop: '4px', marginBottom: '12px' }}>
                      <span className="material-icons">add</span> Add Another Act & Section
                    </button>
                  </div>
                )}
                <div className="fir-row">
                  <span className="fir-row-label">({form.acts.length + 1})</span>
                  <div className="fir-field fir-field-full">
                    <label className="fir-label">Other Acts & Sections</label>
                    <input className="form-input fir-input" value={form.other_acts_sections} onChange={e => set('other_acts_sections', e.target.value)} placeholder="Other applicable acts and sections" />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── Section 3: Occurrence & Time ── */}
            <CollapsibleSection number="3" title="Occurrence & Time" filled={!!(form.occurrence_date)}>
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
            </CollapsibleSection>

            {/* ── Section 4: Type of Information ── */}
            <CollapsibleSection number="4" title="Type of Information" filled={!!form.type_of_information}>
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
            </CollapsibleSection>

            {/* ── Section 8: Delay Reason ── */}
            <CollapsibleSection number="8" title="Delay in Reporting" filled={!!form.delay_reason}>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Reasons for delay in reporting</label>
                <input className="form-input fir-input" value={form.delay_reason} onChange={e => set('delay_reason', e.target.value)} placeholder="Reason for delay, if any" />
              </div>
            </CollapsibleSection>
            </div>

            {/* ── STEP 2: Location Details ── */}
            <div data-step="2" style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            {/* ── Section 5: Place of Occurrence ── */}
            <CollapsibleSection number="5" title="Place of Occurrence" defaultOpen={true} filled={!!form.place_address}>
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
            </CollapsibleSection>

            </div>

            {/* ── STEP 3: Parties Involved ── */}
            <div data-step="3" style={{ display: currentStep === 3 ? 'block' : 'none' }}>
            {/* ── Section 6: Complainant / Informant ── */}
            <CollapsibleSection number="6" title="Complainant / Informant Information" defaultOpen={true} filled={!!form.complainant.name}>
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
            </CollapsibleSection>

            {/* ── Section 7: Accused / Offender (Multiple) ── */}
            <CollapsibleSection number="7" title="Details of Accused / Offender" filled={form.offenders.some(o => o.name)}>
              <div className="fir-field fir-field-full" style={{ marginBottom: 16 }}>
                <label className="fir-label">General Description</label>
                <textarea className="form-textarea fir-textarea" value={form.accused_details} onChange={e => set('accused_details', e.target.value)} placeholder="Attach separate sheet if necessary. Provide full description of the accused..." rows={3} />
              </div>

              <div className="fir-multi-persons">
                {form.offenders.map((off, idx) => (
                  <div key={idx} className="fir-person-card">
                    <div className="fir-person-card-header">
                      <span className="fir-person-badge">
                        <span className="material-icons" style={{ fontSize: 14 }}>person</span>
                        Accused {idx + 1}
                      </span>
                      {form.offenders.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-icon btn-sm fir-remove-person" onClick={() => removeArrayItem('offenders', idx)} title="Remove">
                          <span className="material-icons">close</span>
                        </button>
                      )}
                    </div>
                    <div className="fir-person-card-body">
                      <div className="fir-row fir-row-photo">
                        <div className="fir-fields-col" style={{ flex: 1 }}>
                          <div className="fir-row fir-row-3">
                            <div className="fir-field">
                              <label className="fir-label">Name</label>
                              <input className="form-input fir-input" value={off.name} onChange={e => setArrayItem('offenders', idx, 'name', e.target.value)} placeholder="Name or Unknown" />
                            </div>
                            <div className="fir-field fir-field-sm">
                              <label className="fir-label">Gender</label>
                              <select className="form-select fir-input" value={off.gender} onChange={e => setArrayItem('offenders', idx, 'gender', e.target.value)}>
                                <option>Male</option><option>Female</option><option>Other</option>
                              </select>
                            </div>
                            <div className="fir-field fir-field-sm">
                              <label className="fir-label">Age</label>
                              <input className="form-input fir-input" type="number" min="0" value={off.age} onChange={e => setArrayItem('offenders', idx, 'age', e.target.value)} placeholder="Age" />
                            </div>
                          </div>
                        </div>
                        <PhotoUpload label="Photo" value={(form.offender_photos || [])[idx]} onChange={v => setArrayPhoto('offender_photos', idx, v)} id={`offender-photo-${idx}`} />
                      </div>
                    </div>
                  </div>
                ))}
                {form.offenders.length < 10 && (
                  <button type="button" className="btn btn-secondary btn-sm fir-add-person" onClick={() => addArrayItem('offenders', emptyOffender)}>
                    <span className="material-icons">add</span> Add Another Accused
                  </button>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Victim Section (Multiple) ── */}
            <CollapsibleSection number="V" title="Victim Information" filled={form.victims.some(v => v.name)} numberStyle={{ background: 'rgba(102,187,106,0.15)', color: '#66bb6a' }}>
              <div className="fir-multi-persons">
                {form.victims.map((vic, idx) => (
                  <div key={idx} className="fir-person-card fir-person-card-victim">
                    <div className="fir-person-card-header">
                      <span className="fir-person-badge fir-person-badge-victim">
                        <span className="material-icons" style={{ fontSize: 14 }}>person</span>
                        Victim {idx + 1}
                      </span>
                      {form.victims.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-icon btn-sm fir-remove-person" onClick={() => removeArrayItem('victims', idx)} title="Remove">
                          <span className="material-icons">close</span>
                        </button>
                      )}
                    </div>
                    <div className="fir-person-card-body">
                      <div className="fir-row fir-row-photo">
                        <div className="fir-fields-col" style={{ flex: 1 }}>
                          <div className="fir-row fir-row-4">
                            <div className="fir-field">
                              <label className="fir-label">Name</label>
                              <input className="form-input fir-input" value={vic.name} onChange={e => setArrayItem('victims', idx, 'name', e.target.value)} placeholder="Victim name" />
                            </div>
                            <div className="fir-field fir-field-sm">
                              <label className="fir-label">Age</label>
                              <input className="form-input fir-input" type="number" min="0" value={vic.age} onChange={e => setArrayItem('victims', idx, 'age', e.target.value)} />
                            </div>
                            <div className="fir-field fir-field-sm">
                              <label className="fir-label">Gender</label>
                              <select className="form-select fir-input" value={vic.gender} onChange={e => setArrayItem('victims', idx, 'gender', e.target.value)}>
                                <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                              </select>
                            </div>
                            <div className="fir-field">
                              <label className="fir-label">Occupation</label>
                              <input className="form-input fir-input" list="occupation-list" value={vic.occupation} onChange={e => setArrayItem('victims', idx, 'occupation', e.target.value)} placeholder="Start typing..." />
                            </div>
                          </div>
                        </div>
                        <PhotoUpload label="Photo" value={(form.victim_photos || [])[idx]} onChange={v => setArrayPhoto('victim_photos', idx, v)} id={`victim-photo-${idx}`} />
                      </div>
                    </div>
                  </div>
                ))}
                {form.victims.length < 10 && (
                  <button type="button" className="btn btn-secondary btn-sm fir-add-person" onClick={() => addArrayItem('victims', emptyVictim)}>
                    <span className="material-icons">add</span> Add Another Victim
                  </button>
                )}
              </div>
            </CollapsibleSection>


            </div>

            {/* ── STEP 4: Stolen Property & Inquest ── */}
            <div data-step="4" style={{ display: currentStep === 4 ? 'block' : 'none' }}>
            {/* ── Section 9: Properties Stolen ── */}
            <CollapsibleSection number="9" title="Properties Stolen / Involved" defaultOpen={true} filled={!!form.properties_stolen}>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Particulars of properties stolen / involved</label>
                <textarea className="form-textarea fir-textarea" value={form.properties_stolen} onChange={e => set('properties_stolen', e.target.value)} placeholder="List of stolen/involved properties..." rows={3} />
              </div>
            </CollapsibleSection>

            {/* ── Section 10: Total Value ── */}
            <CollapsibleSection number="10" title="Total Value" filled={!!form.total_value_stolen}>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Total value of the properties stolen / involved (₹)</label>
                <input className="form-input fir-input" value={form.total_value_stolen} onChange={e => set('total_value_stolen', e.target.value)} placeholder="e.g. 3,50,000" />
              </div>
            </CollapsibleSection>

            {/* ── Section 11: Inquest Report ── */}
            <CollapsibleSection number="11" title="Inquest Report" filled={!!form.inquest_report}>
              <div className="fir-field fir-field-full">
                <label className="fir-label required">Inquest Report / U.D. Case No.</label>
                <input className="form-input fir-input" required value={form.inquest_report} onChange={e => set('inquest_report', e.target.value)} placeholder="UD case number or N/A" />
              </div>
            </CollapsibleSection>

            </div>

            {/* ── STEP 5: Post-Incident Actions ── */}
            <div data-step="5" style={{ display: currentStep === 5 ? 'block' : 'none' }}>
              <CollapsibleSection number="P1" title="Arrest / Surrender Details" filled={form.arrests.length > 0} numberStyle={{ background: 'rgba(25,118,210,0.15)', color: '#1976d2' }}>
                <div className="fir-multi-persons">
                  {form.arrests.map((arr, idx) => (
                    <div key={idx} className="fir-person-card">
                      <div className="fir-person-card-header">
                        <span className="fir-person-badge" style={{ background: '#e3f2fd', color: '#1976d2' }}>Event {idx + 1}</span>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm fir-remove-person" onClick={() => removeArrayItem('arrests', idx)} title="Remove"><span className="material-icons">close</span></button>
                      </div>
                      <div className="fir-person-card-body">
                        <div className="fir-row fir-row-4">
                          <div className="fir-field">
                            <label className="fir-label required">Type</label>
                            <select className="form-select fir-input" required value={arr.type} onChange={e => setArrayItem('arrests', idx, 'type', e.target.value)}>
                              <option value="">— Select —</option>
                              <option value="1">Arrest</option>
                              <option value="2">Surrender</option>
                            </select>
                          </div>
                          <div className="fir-field">
                            <label className="fir-label required">Date</label>
                            <input className="form-input fir-input" type="date" required value={arr.date} onChange={e => setArrayItem('arrests', idx, 'date', e.target.value)} />
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">State</label>
                            <select className="form-select fir-input" value={arr.state} onChange={e => setArrayItem('arrests', idx, 'state', e.target.value)}>
                              <option value="">— Select —</option>
                              {states.map(s => <option key={s.StateID} value={s.StateID}>{s.StateName}</option>)}
                            </select>
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">District</label>
                            <select className="form-select fir-input" value={arr.district} onChange={e => setArrayItem('arrests', idx, 'district', e.target.value)}>
                              <option value="">— Select —</option>
                              {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="fir-row fir-row-3">
                          <div className="fir-field">
                            <label className="fir-label">Police Station</label>
                            <select className="form-select fir-input" value={arr.ps} onChange={e => setArrayItem('arrests', idx, 'ps', e.target.value)}>
                              <option value="">— Select —</option>
                              {units.map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
                            </select>
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">Investigating Officer (IO)</label>
                            <select className="form-select fir-input" value={arr.io} onChange={e => setArrayItem('arrests', idx, 'io', e.target.value)}>
                              <option value="">— Select —</option>
                              {employees.map(e => <option key={e.EmployeeID} value={e.EmployeeID}>{e.FirstName}</option>)}
                            </select>
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">Court</label>
                            <select className="form-select fir-input" value={arr.court} onChange={e => setArrayItem('arrests', idx, 'court', e.target.value)}>
                              <option value="">— Select —</option>
                              {courts.map(c => <option key={c.CourtID} value={c.CourtID}>{c.CourtName}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm fir-add-person" onClick={() => addArrayItem('arrests', { date: '', type: '', state: '', district: '', ps: '', io: '', court: '' })}>
                    <span className="material-icons">add</span> Add Arrest/Surrender
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection number="P2" title="Chargesheet Details" filled={form.chargesheets.length > 0} numberStyle={{ background: 'rgba(25,118,210,0.15)', color: '#1976d2' }}>
                <div className="fir-multi-persons">
                  {form.chargesheets.map((cs, idx) => (
                    <div key={idx} className="fir-person-card">
                      <div className="fir-person-card-header">
                        <span className="fir-person-badge" style={{ background: '#e3f2fd', color: '#1976d2' }}>Chargesheet {idx + 1}</span>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm fir-remove-person" onClick={() => removeArrayItem('chargesheets', idx)} title="Remove"><span className="material-icons">close</span></button>
                      </div>
                      <div className="fir-person-card-body">
                        <div className="fir-row fir-row-3">
                          <div className="fir-field">
                            <label className="fir-label required">Date</label>
                            <input className="form-input fir-input" type="date" required value={cs.date} onChange={e => setArrayItem('chargesheets', idx, 'date', e.target.value)} />
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">Type</label>
                            <select className="form-select fir-input" value={cs.type} onChange={e => setArrayItem('chargesheets', idx, 'type', e.target.value)}>
                              <option value="">— Select —</option>
                              <option value="A">A - Chargesheet</option>
                              <option value="B">B - False Case</option>
                              <option value="C">C - Undetected</option>
                            </select>
                          </div>
                          <div className="fir-field">
                            <label className="fir-label">Officer</label>
                            <select className="form-select fir-input" value={cs.io} onChange={e => setArrayItem('chargesheets', idx, 'io', e.target.value)}>
                              <option value="">— Select —</option>
                              {employees.map(e => <option key={e.EmployeeID} value={e.EmployeeID}>{e.FirstName}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm fir-add-person" onClick={() => addArrayItem('chargesheets', { date: '', type: '', io: '' })}>
                    <span className="material-icons">add</span> Add Chargesheet
                  </button>
                </div>
              </CollapsibleSection>
            </div>

            {/* ── STEP 6: Review & Submit ── */}
            <div data-step="6" style={{ display: currentStep === 6 ? 'block' : 'none' }}>
            {/* ── Section 12: FIR Contents ── */}
            <CollapsibleSection number="12" title="F.I.R. Contents" defaultOpen={true} filled={!!form.fir_contents}>
              <div className="fir-field fir-field-full">
                <label className="fir-label">F.I.R. Contents</label>
                <textarea className="form-textarea fir-textarea fir-textarea-lg" value={form.fir_contents} onChange={e => set('fir_contents', e.target.value)} placeholder="Detailed description of the incident..." rows={8} />
              </div>
            </CollapsibleSection>

            {/* ── Section 13: Action Taken ── */}
            <CollapsibleSection number="13" title="Action Taken" filled={!!form.action_taken}>
              <div className="fir-field fir-field-full">
                <label className="fir-label">Action taken</label>
                <p className="fir-action-text">Since the above report reveals commission of offence(s) u/s as mentioned at Item No. 2, registered the case and took up the investigation / direction:</p>
                <textarea className="form-textarea fir-textarea" value={form.action_taken} onChange={e => set('action_taken', e.target.value)} placeholder="Action taken details..." rows={3} />
              </div>
              <div className="fir-signature-block">
                <div className="fir-signature-title">Officer-in-charge, Police Station</div>
                {officerProfile ? (
                  <div className="fir-officer-card">
                    <div className="fir-officer-card-photo">
                      {officerProfile.photo_url ? (
                        <img src={officerProfile.photo_url} alt={officerProfile.officer_name} className="fir-officer-photo-img" />
                      ) : (
                        <div className="fir-officer-photo-placeholder">
                          <span className="material-icons">person</span>
                        </div>
                      )}
                    </div>
                    <div className="fir-officer-card-details">
                      <div className="fir-row fir-row-3">
                        <div className="fir-field">
                          <label className="fir-label">Name</label>
                          <input className="form-input fir-input fir-input-autofilled" value={form.officer_name} readOnly disabled title="Auto-filled from your profile" />
                        </div>
                        <div className="fir-field">
                          <label className="fir-label">Rank</label>
                          <input className="form-input fir-input fir-input-autofilled" value={form.officer_rank} readOnly disabled title="Auto-filled from your profile" />
                        </div>
                        <div className="fir-field">
                          <label className="fir-label">No. (KGID)</label>
                          <input className="form-input fir-input fir-input-autofilled" value={form.officer_no} readOnly disabled title="Auto-filled from your profile" />
                        </div>
                      </div>
                      {form.officer_unit && (
                        <div className="fir-row" style={{ marginTop: 8 }}>
                          <div className="fir-field fir-field-full">
                            <label className="fir-label">Police Station / Unit</label>
                            <input className="form-input fir-input fir-input-autofilled" value={form.officer_unit} readOnly disabled title="Auto-filled from your profile" />
                          </div>
                        </div>
                      )}
                      <div className="fir-autofill-badge">
                        <span className="material-icons">auto_awesome</span>
                        <span>Auto-filled from your profile</span>
                        <a href="/profile" target="_blank" rel="noopener noreferrer" className="fir-autofill-link">Edit Profile</a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="fir-officer-no-profile">
                    <span className="material-icons">warning</span>
                    <div>
                      <strong>Profile not set up</strong>
                      <p>Your officer details will appear here once you set up your profile.</p>
                    </div>
                    <a href="/profile" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>Set Up Profile</a>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Section 14: Complainant Signature ── */}
            <CollapsibleSection number="14" title="Complainant Signature">
              <div className="fir-row fir-row-2">
                <div className="fir-field">
                  <label className="fir-label">Signature / Thumb-impression of complainant</label>
                  <input className="form-input fir-input" value={form.complainant_signature} onChange={e => set('complainant_signature', e.target.value)} placeholder="Name (signed digitally)" />
                </div>
                <div className="fir-field">
                  <div className="fir-signature-pad"><span className="material-icons">edit</span><span>Signature</span></div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── Section 15: Despatch to Court ── */}
            <CollapsibleSection number="15" title="Despatch to Court">
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
            </CollapsibleSection>

            {/* ── System Fields ── */}
            <CollapsibleSection number={<span className="material-icons" style={{ fontSize: 14 }}>settings</span>} title="System Fields (Data Layers)" numberStyle={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
              <div className="fir-row fir-row-3">
                <div className="fir-field">
                  <label className="fir-label">Crime Type</label>
                  <input list="crime-types-list" className="form-input fir-input" value={form.crime_type} onChange={e => set('crime_type', e.target.value)} placeholder="Type crime type..." />
                  <datalist id="crime-types-list">
                    {crimeHeads.map(c => <option key={c.CrimeHeadID} value={c.CrimeGroupName} />)}
                  </datalist>
                </div>
                <div className="fir-field fir-field-sm">
                  <label className="fir-label">Severity</label>
                  <select className="form-select fir-input" value={form.severity} onChange={e => set('severity', e.target.value)}>
                    {gravityLevels.map(g => (
                      <option key={g.GravityOffenceID} value={g.GravityOffenceID}>
                        {g.GravityOffenceID} {g.LookupValue ? `— ${g.LookupValue}` : ''}
                      </option>
                    ))}
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
            </CollapsibleSection>

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
                <button key="next-btn" type="button" className="btn btn-primary" onClick={(e) => { e.preventDefault(); handleNext(); }}>
                  Next <span className="material-icons">chevron_right</span>
                </button>
              ) : (
                <button key="submit-btn" type="submit" className="btn btn-primary" disabled={saving}>
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
