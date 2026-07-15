import { useFiltersStore } from '../store/filtersStore';
import { useLookupData } from '../hooks/useLookupData';

export default function FilterPanel({ hideDates, hideSeverity, hideCrimeType }) {
  const {
    selectedDistrict, selectedCrimeType, dateRange, severityRange,
    setDistrict, setCrimeType, setDateRange, setSeverityRange, resetFilters,
  } = useFiltersStore();

  const { districts, crimeHeads, gravityLevels } = useLookupData();

  return (
    <div className="filter-panel">
      {/* District */}
      <div className="form-group">
        <label className="form-label">District</label>
        <select
          className="form-select"
          value={selectedDistrict}
          onChange={e => setDistrict(e.target.value)}
        >
          <option value="All">All</option>
          {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
        </select>
      </div>

      {/* Crime Type */}
      {!hideCrimeType && (
        <div className="form-group">
          <label className="form-label">Crime Type</label>
          <select
            className="form-select"
            value={selectedCrimeType}
            onChange={e => setCrimeType(e.target.value)}
          >
            <option value="All">All</option>
            {crimeHeads.map(c => <option key={c.CrimeHeadID} value={c.CrimeHeadID}>{c.CrimeGroupName}</option>)}
          </select>
        </div>
      )}

      {/* Date range */}
      {!hideDates && (
        <>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange?.start || ''}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange?.end || ''}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Min severity */}
      {!hideSeverity && (
        <div className="form-group">
          <label className="form-label">Min Severity</label>
          <select
            className="form-select"
            value={severityRange[0]}
            onChange={e => setSeverityRange([+e.target.value, severityRange[1]])}
          >
            {gravityLevels.map(g => <option key={g.GravityOffenceID} value={g.GravityOffenceID}>{g.GravityOffenceID} — {g.LookupValue}</option>)}
            {gravityLevels.length === 0 && [1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
      )}

      {/* Reset */}
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
          <span className="material-icons" style={{ fontSize: 15 }}>restart_alt</span>
          Reset
        </button>
      </div>
    </div>
  );
}
