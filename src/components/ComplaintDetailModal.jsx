// ============================================================
// ComplaintDetailModal — Read-only view of a full FIR complaint
// Opens when a user clicks a row in the complaints table
// ============================================================

import { useState } from 'react';
import { useLookupData } from '../hooks/useLookupData';

function Field({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className={`detail-value${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
}

function PhotoField({ label, url, onClick }) {
  if (!url) return null;
  return (
    <div className="detail-photo-field">
      <span className="detail-label">{label}</span>
      <img src={url} alt={label} className="detail-photo" onClick={() => onClick(url)} style={{ cursor: 'zoom-in' }} title="Click to enlarge" />
    </div>
  );
}

function Section({ number, title, children, icon, iconColor }) {
  return (
    <div className="detail-section">
      <div className="detail-section-badge" style={iconColor ? { background: iconColor + '22', color: iconColor, borderColor: iconColor + '44' } : {}}>
        {icon ? <span className="material-icons" style={{ fontSize: 13 }}>{icon}</span> : number}
      </div>
      {title && <div className="detail-section-title">{title}</div>}
      <div className="detail-section-content">{children}</div>
    </div>
  );
}

export default function ComplaintDetailModal({ open, onClose, row, onEdit }) {
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const {
    getDistrictName, getCrimeTypeName, getStatusName, getGravityName,
    getUnitName, getCategoryName, getOccupationName, getActName,
    getStateName, getCourtName, getEmployeeName,
  } = useLookupData();

  if (!open || !row) return null;

  const cd = row.complaint_data || {};
  // Use relational data first, fall back to complaint_data
  const comp = row._complainant || {};
  const compCd = cd.complainant || {};
  const complainant = {
    name: comp.ComplainantName || compCd.name || '',
    father_husband_name: compCd.father_husband_name || '',
    dob: compCd.dob || '',
    nationality: compCd.nationality || '',
    occupation: comp.OccupationID ? getOccupationName(comp.OccupationID) : compCd.occupation || '',
    passport_no: compCd.passport_no || '',
    passport_date_of_issue: compCd.passport_date_of_issue || '',
    passport_place_of_issue: compCd.passport_place_of_issue || '',
    address: compCd.address || '',
  };

  const accRow = row._accused || {};
  const offCd = cd.offender || {};
  const offender = {
    name: accRow.AccusedName || offCd.name || '',
    gender: accRow.GenderID === 1 ? 'Male' : accRow.GenderID === 2 ? 'Female' : accRow.GenderID === 3 ? 'Other' : offCd.gender || '',
    age: accRow.AgeYear || offCd.age || '',
  };

  const vicRow = row._victim || {};
  const vicCd = cd.victim || {};
  const victim = {
    name: vicRow.VictimName || vicCd.name || '',
    age: vicRow.AgeYear || vicCd.age || '',
    gender: vicRow.GenderID === 1 ? 'Male' : vicRow.GenderID === 2 ? 'Female' : vicRow.GenderID === 3 ? 'Other' : vicCd.gender || '',
    occupation: vicCd.occupation || '',
  };

  // Acts from relational table or complaint_data
  const acts = row._actSections && row._actSections.length > 0
    ? row._actSections.map(a => ({ act: getActName(a.ActID), sections: a.SectionID || '' }))
    : (cd.acts || []);

  // Resolved names
  const districtName = getDistrictName(row.DistrictID);
  const crimeTypeName = getCrimeTypeName(row.CrimeMajorHeadID);
  const statusName = getStatusName(row.CaseStatusID);
  const gravityName = getGravityName(row.GravityOffenceID);
  const stationName = getUnitName(row.PoliceStationID);
  const categoryName = row.CaseCategoryID ? getCategoryName(row.CaseCategoryID) : '';
  const statusClass = row.CaseStatusID === 1 ? 'open' : row.CaseStatusID === 4 ? 'closed' : 'under';

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-detail">
        {/* ── Header ── */}
        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-fir-badge">
              <span className="material-icons">description</span>
              <span className="mono">{row.CrimeNo}</span>
            </div>
            <div className="detail-meta-row">
              <span className={`badge badge-${statusClass}`}>
                {statusName}
              </span>
              <span className="detail-meta-sep">·</span>
              <span className="detail-meta">{crimeTypeName}</span>
              <span className="detail-meta-sep">·</span>
              <span className="detail-meta">{districtName}</span>
              <span className="detail-meta-sep">·</span>
              <span className="detail-meta">Severity {row.GravityOffenceID}/5 ({gravityName})</span>
              {categoryName && <>
                <span className="detail-meta-sep">·</span>
                <span className="detail-meta">{categoryName}</span>
              </>}
              {(cd.officer_name || row.PolicePersonID) && <>
                <span className="detail-meta-sep">·</span>
                <span className="detail-meta"><span className="material-icons" style={{fontSize:13, verticalAlign: 'text-bottom', marginRight: 2}}>person</span>Created by: {cd.officer_name || getEmployeeName(row.PolicePersonID)}</span>
              </>}
            </div>
          </div>
          <div className="detail-header-actions">
            {onEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => { onClose(); onEdit(row); }}>
                <span className="material-icons">edit</span> Edit
              </button>
            )}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className="detail-body">
          {/* ── Section 1: Header Info ── */}
          <Section number="1" title="FIR Details">
            <div className="detail-grid detail-grid-4">
              <Field label="District" value={districtName} />
              <Field label="Police Station" value={stationName} />
              <Field label="Year" value={cd.year} />
              <Field label="FIR Date" value={cd.fir_date} />
            </div>
          </Section>

          {/* ── Section 2: Acts & Sections ── */}
          {acts.some(a => a.act) && (
            <Section number="2" title="Acts & Sections">
              <div className="detail-acts-table">
                {acts.filter(a => a.act).map((a, i) => (
                  <div key={i} className="detail-act-row">
                    <span className="detail-act-num">({['i', 'ii', 'iii'][i]})</span>
                    <span className="detail-act-name">{a.act}</span>
                    <span className="detail-act-arrow">→</span>
                    <span className="detail-act-sections mono">{a.sections}</span>
                  </div>
                ))}
              </div>
              {cd.other_acts_sections && <Field label="Other Acts & Sections" value={cd.other_acts_sections} />}
            </Section>
          )}

          {/* ── Section 3: Occurrence ── */}
          <Section number="3" title="Occurrence Details">
            <div className="detail-grid detail-grid-3">
              <Field label="Day" value={cd.occurrence_day} />
              <Field label="Date" value={cd.occurrence_date} mono />
              <Field label="Time" value={cd.occurrence_time} mono />
            </div>
            {(cd.info_received_date || cd.gd_ref_entry_no) && (
              <div className="detail-grid detail-grid-4" style={{ marginTop: 8 }}>
                <Field label="Info received Date" value={cd.info_received_date} mono />
                <Field label="Info received Time" value={cd.info_received_time} mono />
                <Field label="GD Ref Entry No." value={cd.gd_ref_entry_no} />
                <Field label="GD Ref Time" value={cd.gd_ref_time} mono />
              </div>
            )}
          </Section>

          {/* ── Section 4: Type of Information ── */}
          <Section number="4">
            <Field label="Type of Information" value={cd.type_of_information} />
          </Section>

          {/* ── Section 5: Place ── */}
          <Section number="5" title="Place of Occurrence">
            <div className="detail-grid detail-grid-2">
              <Field label="Direction & Distance" value={cd.place_direction} />
              <Field label="Beat No." value={cd.beat_no} />
            </div>
            <Field label="Address" value={cd.place_address} />
            {(cd.outside_ps_name) && (
              <div className="detail-grid detail-grid-2" style={{ marginTop: 8 }}>
                <Field label="Outside PS Name" value={cd.outside_ps_name} />
                <Field label="District" value={cd.outside_ps_district} />
              </div>
            )}
          </Section>

          {/* ── Section 6: Complainant ── */}
          {(complainant.name || cd.complainant_photo_url) && (
            <Section number="6" title="Complainant / Informant">
              <div className="detail-person-row">
                <div className="detail-person-fields">
                  <div className="detail-grid detail-grid-2">
                    <Field label="Name" value={complainant.name} />
                    <Field label="Father's / Husband's Name" value={complainant.father_husband_name} />
                  </div>
                  <div className="detail-grid detail-grid-3">
                    <Field label="DOB" value={complainant.dob} mono />
                    <Field label="Nationality" value={complainant.nationality} />
                    <Field label="Occupation" value={complainant.occupation} />
                  </div>
                  {complainant.passport_no && (
                    <div className="detail-grid detail-grid-3">
                      <Field label="Passport No." value={complainant.passport_no} mono />
                      <Field label="Issue Date" value={complainant.passport_date_of_issue} mono />
                      <Field label="Issue Place" value={complainant.passport_place_of_issue} />
                    </div>
                  )}
                  <Field label="Address" value={complainant.address} />
                </div>
                <PhotoField label="Photo" url={cd.complainant_photo_url} onClick={setFullscreenPhoto} />
              </div>
            </Section>
          )}

          {/* ── Section 7: Accused / Offender (Multiple) ── */}
          {((row._accusedAll && row._accusedAll.length > 0) || offender.name || cd.accused_details || cd.offender_photo_url) && (
            <Section number="7" title="Accused / Offender">
              {cd.accused_details && <div className="detail-text-block">{cd.accused_details}</div>}
              {(row._accusedAll && row._accusedAll.length > 0 ? row._accusedAll : (offender.name ? [{ _single: true }] : [])).map((accItem, idx) => {
                const acc = accItem._single ? offender : {
                  name: accItem.AccusedName || '',
                  gender: accItem.GenderID === 1 ? 'Male' : accItem.GenderID === 2 ? 'Female' : accItem.GenderID === 3 ? 'Other' : '',
                  age: accItem.AgeYear || '',
                };
                const photoUrl = cd.offender_photo_urls?.[idx] || (idx === 0 ? cd.offender_photo_url : null);
                return (
                  <div key={idx} className="detail-person-row" style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' } : {}}>
                    <div className="detail-person-fields">
                      {(row._accusedAll?.length > 1 || idx > 0) && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Accused {idx + 1}</div>
                      )}
                      <div className="detail-grid detail-grid-3">
                        <Field label="Name" value={acc.name} />
                        <Field label="Gender" value={acc.gender} />
                        <Field label="Age" value={acc.age} />
                      </div>
                    </div>
                    {photoUrl && <PhotoField label="Photo" url={photoUrl} onClick={setFullscreenPhoto} />}
                  </div>
                );
              })}
            </Section>
          )}

          {/* ── Victims (Multiple) ── */}
          {((row._victims && row._victims.length > 0) || victim.name || cd.victim_photo_url) && (
            <Section number="V" title="Victim Information" icon="person" iconColor="#66bb6a">
              {(row._victims && row._victims.length > 0 ? row._victims : (victim.name ? [{ _single: true }] : [])).map((vicItem, idx) => {
                const vic = vicItem._single ? victim : {
                  name: vicItem.VictimName || '',
                  age: vicItem.AgeYear || '',
                  gender: vicItem.GenderID === 1 ? 'Male' : vicItem.GenderID === 2 ? 'Female' : vicItem.GenderID === 3 ? 'Other' : '',
                  occupation: vicItem.OccupationName || '',
                };
                const photoUrl = cd.victim_photo_urls?.[idx] || (idx === 0 ? cd.victim_photo_url : null);
                return (
                  <div key={idx} className="detail-person-row" style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' } : {}}>
                    <div className="detail-person-fields">
                      {(row._victims?.length > 1 || idx > 0) && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#66bb6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Victim {idx + 1}</div>
                      )}
                      <div className="detail-grid detail-grid-4">
                        <Field label="Name" value={vic.name} />
                        <Field label="Age" value={vic.age} />
                        <Field label="Gender" value={vic.gender} />
                        <Field label="Occupation" value={vic.occupation} />
                      </div>
                    </div>
                    {photoUrl && <PhotoField label="Photo" url={photoUrl} onClick={setFullscreenPhoto} />}
                  </div>
                );
              })}
            </Section>
          )}

          {/* ── Arrests (Multiple) ── */}
          {row._arrests && row._arrests.length > 0 && (
            <Section number="A" title="Arrests / Surrenders" icon="gavel" iconColor="#1976d2">
              {row._arrests.map((arr, idx) => (
                <div key={idx} className="detail-person-row" style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' } : {}}>
                  <div className="detail-grid detail-grid-4">
                    <Field label="Type" value={arr.ArrestSurrenderTypeID === 1 ? 'Arrest' : arr.ArrestSurrenderTypeID === 2 ? 'Surrender' : 'Unknown'} />
                    <Field label="Date" value={arr.ArrestSurrenderDate} mono />
                    <Field label="State" value={getStateName(arr.ArrestSurrenderStateId)} />
                    <Field label="District" value={getDistrictName(arr.ArrestSurrenderDistrictId)} />
                  </div>
                  <div className="detail-grid detail-grid-3" style={{ marginTop: 8 }}>
                    <Field label="Police Station" value={getUnitName(arr.PoliceStationID)} />
                    <Field label="Investigating Officer" value={getEmployeeName(arr.IOID)} />
                    <Field label="Court" value={getCourtName(arr.CourtID)} />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* ── Chargesheets (Multiple) ── */}
          {row._chargesheets && row._chargesheets.length > 0 && (
            <Section number="C" title="Chargesheets" icon="assignment" iconColor="#1976d2">
              {row._chargesheets.map((cs, idx) => (
                <div key={idx} className="detail-person-row" style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' } : {}}>
                  <div className="detail-grid detail-grid-3">
                    <Field label="Date" value={cs.csdate} mono />
                    <Field label="Type" value={cs.cstype === 'A' ? 'A - Chargesheet' : cs.cstype === 'B' ? 'B - False Case' : cs.cstype === 'C' ? 'C - Undetected' : cs.cstype} />
                    <Field label="Officer" value={getEmployeeName(cs.PolicePersonID)} />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* ── Section 8-11: Text fields ── */}
          {cd.delay_reason && <Section number="8"><Field label="Reason for delay" value={cd.delay_reason} /></Section>}
          {cd.properties_stolen && (
            <Section number="9" title="Properties Stolen / Involved">
              <div className="detail-text-block">{cd.properties_stolen}</div>
            </Section>
          )}
          {cd.total_value_stolen && <Section number="10"><Field label="Total Value (₹)" value={`₹ ${cd.total_value_stolen}`} /></Section>}
          {cd.inquest_report && <Section number="11"><Field label="Inquest Report / UD Case No." value={cd.inquest_report} /></Section>}

          {/* ── Section 12: FIR Contents ── */}
          {cd.fir_contents && (
            <Section number="12" title="FIR Contents">
              <div className="detail-text-block detail-fir-content">{cd.fir_contents}</div>
            </Section>
          )}

          {/* ── Section 13: Action Taken ── */}
          {(cd.action_taken || cd.officer_name) && (
            <Section number="13" title="Action Taken">
              {cd.action_taken && <div className="detail-text-block">{cd.action_taken}</div>}
              <div className="detail-officer-block" style={{ marginTop: 8 }}>
                {cd.officer_photo_url && (
                  <img src={cd.officer_photo_url} alt="Officer" className="detail-officer-photo" />
                )}
                <div className="detail-grid detail-grid-3" style={{ flex: 1 }}>
                  <Field label="Officer Name" value={cd.officer_name} />
                  <Field label="Rank" value={cd.officer_rank} />
                  <Field label="No. (KGID)" value={cd.officer_no} mono />
                  {cd.officer_unit && <Field label="Police Station" value={cd.officer_unit} />}
                </div>
              </div>
            </Section>
          )}

          {/* ── Section 14-15 ── */}
          {cd.complainant_signature && <Section number="14"><Field label="Complainant Signature" value={cd.complainant_signature} /></Section>}
          {(cd.despatch_date_1 || cd.despatch_date_2) && (
            <Section number="15" title="Despatch to Court">
              <div className="detail-grid detail-grid-2">
                <Field label="Despatch (1)" value={cd.despatch_date_1} mono />
                <Field label="Despatch (2)" value={cd.despatch_date_2} mono />
              </div>
            </Section>
          )}

          {/* ── System info ── */}
          <div className="detail-system-info">
            <span className="material-icons" style={{ fontSize: 12 }}>info</span>
            <span>Lat: {row.latitude}, Lng: {row.longitude}</span>
            <span className="detail-meta-sep">·</span>
            <span>Created: {new Date(row.IncidentFromDate).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
    {fullscreenPhoto && (
      <div className="modal-overlay" onClick={() => setFullscreenPhoto(null)} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
        <img src={fullscreenPhoto} alt="Fullscreen" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
        <button className="btn btn-ghost btn-icon" style={{ position: 'absolute', top: 20, right: 20, color: 'white', background: 'rgba(0,0,0,0.5)' }} onClick={() => setFullscreenPhoto(null)}>
          <span className="material-icons">close</span>
        </button>
      </div>
    )}
    </>
  );
}
