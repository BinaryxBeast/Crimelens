import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCrimeData, getSearchableText } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import FilterPanel from '../components/FilterPanel';
import ComplaintFormModal from '../components/ComplaintFormModal';
import ComplaintDetailModal from '../components/ComplaintDetailModal';

function StatusBadge({ statusId, getStatusName }) {
  const name = getStatusName(statusId);
  const cls = statusId === 1 ? 'open' : statusId === 4 ? 'closed' : statusId === 2 ? 'under' : '';
  return <span className={`badge badge-${cls}`}>{name}</span>;
}

function severityDots(n) {
  return (
    <div className="sev-dots">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`sev-dot${i <= n ? ' filled' : ''}`} style={i <= n ? { background: n >= 4 ? '#ff4444' : n >= 3 ? '#ff8800' : '#66bb6a' } : {}} />
      ))}
      <span className="sev-num" style={{ color: n >= 4 ? '#ff4444' : n >= 3 ? '#ff8800' : '#66bb6a' }}>{n}</span>
    </div>
  );
}

export default function ReportsPage() {
  const {
    incidents, allIncidents, loading, error,
    addIncident, updateIncident, deleteIncident,
  } = useCrimeData();

  const {
    getDistrictName, getCrimeTypeName, getStatusName, getUnitName,
  } = useLookupData();

  const [modalOpen, setModalOpen]       = useState(false);
  const [detailRow, setDetailRow]       = useState(null);
  const [editRow, setEditRow]           = useState(null);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');
  const [search, setSearch]             = useState('');
  const [sortField, setSortField]       = useState('IncidentFromDate');
  const [sortDir, setSortDir]           = useState('desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Check if we navigated here with a specific incident to view
  useEffect(() => {
    if (location.state?.viewIncidentId && incidents.length > 0) {
      const incidentToView = incidents.find(i => i.CaseMasterID === location.state.viewIncidentId);
      if (incidentToView) {
        setDetailRow(incidentToView);
        // Clear the state so it doesn't re-open on refresh
        const newState = { ...location.state };
        delete newState.viewIncidentId;
        navigate(location.pathname, { replace: true, state: newState });
      }
    }
  }, [location, incidents, navigate]);

  const openAdd = () => { setEditRow(null); setFormError(''); setModalOpen(true); };
  const openEdit = (row) => { setEditRow(row); setFormError(''); setModalOpen(true); };
  const openDetail = (row) => setDetailRow(row);

  const handleSave = async (formData, isEdit, photoFiles) => {
    setSaving(true);
    setFormError('');
    try {
      if (isEdit) {
        await updateIncident(editRow.CaseMasterID, formData, photoFiles);
      } else {
        await addIncident(formData, photoFiles);
        localStorage.removeItem('crimelens_fir_draft');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try { await deleteIncident(id); setDeleteConfirm(null); }
    catch (err) { alert(err.message); }
  };

  const exportCSV = () => {
    const headers = ['FIR Number', 'Crime Type', 'District', 'Police Station', 'Complainant', 'Offender', 'Victim', 'Status', 'Severity', 'Occurred At'];
    const rows = filtered.map(i => {
      const comp = i._complainant || i.complaint_data?.complainant || {};
      const off = i._accused || i.complaint_data?.offender || {};
      const vic = i._victim || i.complaint_data?.victim || {};
      return [
        i.CrimeNo, getCrimeTypeName(i.CrimeMajorHeadID), getDistrictName(i.DistrictID), getUnitName(i.PoliceStationID),
        comp.ComplainantName || comp.name || '', off.AccusedName || off.name || '', vic.VictimName || vic.name || '',
        getStatusName(i.CaseStatusID), i.GravityOffenceID, new Date(i.IncidentFromDate).toLocaleString('en-IN'),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `crimelens_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── Enhanced Search: across all fields ──
  const filtered = incidents
    .filter(i => {
      if (!search) return true;
      // Also search resolved names
      const extra = [
        getDistrictName(i.DistrictID),
        getCrimeTypeName(i.CrimeMajorHeadID),
        getStatusName(i.CaseStatusID),
        getUnitName(i.PoliceStationID),
      ].join(' ').toLowerCase();
      return getSearchableText(i).includes(search.toLowerCase()) || extra.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      let va, vb;
      if (sortField === 'complainant') {
        va = a._complainant?.ComplainantName || a.complaint_data?.complainant?.name || '';
        vb = b._complainant?.ComplainantName || b.complaint_data?.complainant?.name || '';
      } else {
        va = a[sortField] ?? '';
        vb = b[sortField] ?? '';
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const renderSortArrow = (field) => (
    <span className={`sort-arrow${sortField === field ? ' active' : ''}`}>
      <span className="material-icons">
        {sortField === field ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </span>
  );

  return (
    <div className="page-container">
      <FilterPanel />

      {/* Toolbar */}
      <div className="complaints-toolbar">
        <div className="search-input-wrapper search-wide">
          <span className="material-icons">search</span>
          <input
            className="form-input"
            placeholder="Search by FIR, victim, offender, complainant, district, crime type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        <span className="toolbar-count">
          {filtered.length} of {incidents.length} records
        </span>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <span className="material-icons">download</span> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" id="add-complaint-btn" onClick={openAdd}>
            <span className="material-icons">add</span> Add Complaint
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading records…</span></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table complaints-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('CrimeNo')} style={{ cursor: 'pointer' }}>
                  FIR No. {renderSortArrow('CrimeNo')}
                </th>
                <th onClick={() => toggleSort('CrimeMajorHeadID')} style={{ cursor: 'pointer' }}>
                  Crime Type {renderSortArrow('CrimeMajorHeadID')}
                </th>
                <th onClick={() => toggleSort('DistrictID')} style={{ cursor: 'pointer' }}>
                  District {renderSortArrow('DistrictID')}
                </th>
                <th>P.S.</th>
                <th onClick={() => toggleSort('complainant')} style={{ cursor: 'pointer' }}>
                  Complainant {renderSortArrow('complainant')}
                </th>
                <th onClick={() => toggleSort('IncidentFromDate')} style={{ cursor: 'pointer' }}>
                  Date {renderSortArrow('IncidentFromDate')}
                </th>
                <th onClick={() => toggleSort('CaseStatusID')} style={{ cursor: 'pointer' }}>
                  Status {renderSortArrow('CaseStatusID')}
                </th>
                <th onClick={() => toggleSort('GravityOffenceID')} style={{ cursor: 'pointer' }}>
                  Sev. {renderSortArrow('GravityOffenceID')}
                </th>
                <th style={{ width: 76 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">
                  <span className="material-icons" style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>inbox</span>
                  <div>{search ? `No results for "${search}"` : 'No complaints registered yet'}</div>
                  {!search && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openAdd}>
                    <span className="material-icons">add</span> Register First Complaint
                  </button>}
                </td></tr>
              ) : filtered.map(inc => {
                const compName = inc._complainant?.ComplainantName || inc.complaint_data?.complainant?.name || '';
                return (
                  <tr key={inc.CaseMasterID} className="clickable-row" onClick={() => openDetail(inc)}>
                    <td><span className="mono fir-link">{inc.CrimeNo}</span></td>
                    <td><span className="crime-type-pill">{getCrimeTypeName(inc.CrimeMajorHeadID)}</span></td>
                    <td>{getDistrictName(inc.DistrictID)}</td>
                    <td className="text-muted-cell">{getUnitName(inc.PoliceStationID)}</td>
                    <td className="complainant-cell">{compName || <span className="text-muted-cell">—</span>}</td>
                    <td className="date-cell mono">
                      {new Date(inc.IncidentFromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td><StatusBadge statusId={inc.CaseStatusID} getStatusName={getStatusName} /></td>
                    <td>{severityDots(inc.GravityOffenceID)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-icon btn-sm" title="Edit" onClick={() => openEdit(inc)}>
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => setDeleteConfirm(inc.CaseMasterID)}>
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FIR Complaint Form Modal */}
      <ComplaintFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editRow={editRow}
        saving={saving}
        formError={formError}
      />

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        onEdit={openEdit}
      />

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="material-icons" style={{ color: 'var(--brand-danger)' }}>delete_forever</span>
                Confirm Delete
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteConfirm(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div style={{ padding: '18px 22px', color: 'var(--text-secondary)', fontSize: 13 }}>
              This will permanently delete the complaint from the database. This action cannot be undone.
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <span className="material-icons">delete</span> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
