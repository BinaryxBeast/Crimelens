import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrimeData } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import FilterPanel from '../components/FilterPanel';
import CrimeHeatmap from '../components/CrimeHeatmap';
import DataLayersPanel, { TIME_SLOTS } from '../components/DataLayersPanel';

export default function MapPage() {
  const { incidents, loading, stats, byDistrict } = useCrimeData();
  const { getDistrictName, getCrimeTypeName, getStatusName, getUnitName } = useLookupData();
  const navigate = useNavigate();

  // ── Data Layers state ──────────────────────────────────────
  const [vizMode, setVizMode] = useState('markers');   // 'markers' | 'heatmap' | 'severity'
  const [overlays, setOverlays] = useState({
    districts: true,
    openOnly: false,
    crimeType: false,
    timeFilter: false,
  });
  const [timeSlot, setTimeSlot] = useState(null); // null | 'night' | 'morning' | 'afternoon' | 'evening'

  const toggleOverlay = (id) => {
    setOverlays(prev => {
      const next = { ...prev, [id]: !prev[id] };
      // If turning off timeFilter, reset the time slot
      if (id === 'timeFilter' && prev.timeFilter) {
        setTimeSlot(null);
      }
      return next;
    });
  };

  // Convert timeSlot ID to a range for CrimeHeatmap
  const timeFilterRange = useMemo(() => {
    if (!overlays.timeFilter || !timeSlot) return null;
    const slot = TIME_SLOTS.find(s => s.id === timeSlot);
    return slot ? { range: slot.range } : null;
  }, [overlays.timeFilter, timeSlot]);

  // District drill-down state
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Selected incident state
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Compute drill-down stats for selected district
  const drillDownStats = useMemo(() => {
    if (!selectedDistrict) return null;

    const districtIncidents = incidents.filter(i => i.DistrictID === selectedDistrict);
    const total = districtIncidents.length;
    const distName = typeof selectedDistrict === 'number' ? getDistrictName(selectedDistrict) : String(selectedDistrict);
    if (total === 0) return { name: distName, total: 0, byType: {}, openRate: 0, topStations: [] };

    const byType = {};
    const byStation = {};
    let openCount = 0;

    districtIncidents.forEach(i => {
      const typeName = getCrimeTypeName(i.CrimeMajorHeadID);
      byType[typeName] = (byType[typeName] || 0) + 1;
      const stationName = getUnitName(i.PoliceStationID);
      byStation[stationName] = (byStation[stationName] || 0) + 1;
      if (i.CaseStatusID === 1) openCount++;
    });

    const openRate = Math.round((openCount / total) * 100);
    const topStations = Object.entries(byStation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sortedTypes = Object.entries(byType)
      .sort((a, b) => b[1] - a[1]);

    return { name: distName, total, byType: sortedTypes, openRate, topStations };
  }, [selectedDistrict, incidents]);

  const topDistricts = Object.entries(byDistrict)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statPills = [
    { label: 'Plotted Points',  value: incidents.length,                               color: 'var(--text-primary)' },
    { label: 'Districts Active', value: Object.keys(byDistrict).length,                color: 'var(--text-secondary)' },
    { label: 'Critical (Sev 5)', value: incidents.filter(i => i.GravityOffenceID === 5).length, color: 'var(--brand-danger)' },
    { label: 'Open Cases',       value: stats.open,                                     color: 'var(--brand-warning)' },
  ];

  // Color ramp for hotspot bars
  const barColors = ['#ef5350', '#ff7043', '#ff9800', '#ffd54f', '#90a4ae'];
  // Type colors
  const typeColors = ['#ef5350', '#ff7043', '#ff9800', '#ffd54f', '#66bb6a', '#42a5f5', '#ab47bc', '#78909c'];

  const handleDistrictSelect = (districtName) => {
    setSelectedDistrict(prev => prev === districtName ? null : districtName);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', paddingBottom: 0 }}>
      <FilterPanel />

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {statPills.map(s => (
          <div key={s.label} className="map-stat-pill">
            <span style={{ color: s.color, fontWeight: 800 }}>{s.value}</span>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Map + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'stretch', flex: 1, minHeight: 0, paddingBottom: 24 }}>
        <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', minHeight: 0 }}>
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <span>Loading geospatial data…</span>
            </div>
          ) : (
            <>
              <CrimeHeatmap
                incidents={incidents}
                showDistricts={overlays.districts}
                onDistrictSelect={handleDistrictSelect}
                selectedDistrict={selectedDistrict}
                vizMode={vizMode}
                showOpenOnly={overlays.openOnly}
                showCrimeTypeColoring={overlays.crimeType}
                timeFilter={timeFilterRange}
                onIncidentClick={setSelectedIncident}
              />
              {/* Data Layers Panel — floats over the map */}
              <DataLayersPanel
                vizMode={vizMode}
                onVizModeChange={setVizMode}
                overlays={overlays}
                onOverlayToggle={toggleOverlay}
                timeSlot={timeSlot}
                onTimeSlotChange={setTimeSlot}
              />
            </>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto', paddingRight: 4 }}>

          {/* ── Incident Detail Panel (overrides drill-down) ── */}
          {selectedIncident ? (
            <div className="chart-card incident-detail-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header section with Crime Type and Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-icons" style={{ fontSize: 24, color: 'var(--brand-danger)' }}>warning</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {getCrimeTypeName(selectedIncident.CrimeMajorHeadID) || 'Unknown Type'}
                  </div>
                </div>
                <button
                  className="drill-close-btn"
                  onClick={() => setSelectedIncident(null)}
                  title="Close details"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginTop: 2 }}
                >
                  <span className="material-icons" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              {/* Status and FIR */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 14, color: selectedIncident.CaseStatusID === 1 ? 'var(--brand-danger)' : selectedIncident.CaseStatusID === 4 ? 'var(--brand-success)' : 'var(--brand-warning)' }}>circle</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{getStatusName(selectedIncident.CaseStatusID)}</span>
                </div>
                {selectedIncident.CrimeNo && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    FIR {selectedIncident.CrimeNo}
                  </div>
                )}
              </div>

              {/* Location and Time */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>location_on</span>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedIncident.location || getUnitName(selectedIncident.PoliceStationID)?.replace(' PS', '') || 'Unknown Location'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getDistrictName(selectedIncident.DistrictID)}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>schedule</span>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                      {selectedIncident.IncidentFromDate ? new Date(selectedIncident.IncidentFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown Date'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {selectedIncident.IncidentFromDate ? new Date(selectedIncident.IncidentFromDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Unknown Time'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* People & Property Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>person</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Victim</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedIncident._victim?.VictimName || selectedIncident.complaint_data?.victim?.name || 'Not specified'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>local_police</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Officer</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedIncident.complaint_data?.investigating_officer?.name || selectedIncident.complaint_data?.investigating_officer || 'Unassigned'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>directions_car</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Property</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedIncident.complaint_data?.property?.details || 'Not applicable'}</div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* Description */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 2 }}>description</span>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedIncident.BriefFacts || 'No description provided.'}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* Action Button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 0', marginTop: 4 }}
                onClick={() => navigate('/reports', { state: { viewIncidentId: selectedIncident.CaseMasterID } })}
              >
                <span className="material-icons">visibility</span>
                View Full Case
              </button>
            </div>
          ) : selectedDistrict && drillDownStats ? (
            <div className="chart-card district-drill-panel">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="chart-card-title" style={{ margin: 0 }}>
                  <span className="material-icons-outlined" style={{ fontSize: 18 }}>location_city</span>
                  {drillDownStats.name.split(' ').slice(0, 2).join(' ')}
                </div>
                <button
                  className="drill-close-btn"
                  onClick={() => setSelectedDistrict(null)}
                  title="Close drill-down"
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>close</span>
                </button>
              </div>

              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div className="drill-stat-chip">
                  <span className="drill-stat-value">{drillDownStats.total}</span>
                  <span className="drill-stat-label">Total</span>
                </div>
                <div className="drill-stat-chip">
                  <span className="drill-stat-value" style={{ color: 'var(--brand-warning)' }}>{drillDownStats.openRate}%</span>
                  <span className="drill-stat-label">Open Rate</span>
                </div>
              </div>

              {/* Crimes by type */}
              {drillDownStats.byType.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
                    By Crime Type
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {drillDownStats.byType.map(([type, count], i) => {
                      const pct = Math.round((count / drillDownStats.total) * 100);
                      return (
                        <div key={type}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {type}
                            </span>
                            <span style={{ fontSize: 10, color: typeColors[i % typeColors.length], fontWeight: 700 }}>{count}</span>
                          </div>
                          <div style={{ height: 2.5, background: 'var(--border-subtle)', borderRadius: 4 }}>
                            <div style={{
                              width: `${pct}%`, height: '100%',
                              background: typeColors[i % typeColors.length], borderRadius: 4,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top police stations */}
              {drillDownStats.topStations.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
                    Top Police Stations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {drillDownStats.topStations.map(([station, count], i) => (
                      <div key={station} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>{i + 1}.</span>
                          {station.replace(' PS', '')}
                        </span>
                        <span className="drill-station-badge">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drillDownStats.total === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '16px 0' }}>
                  No incidents recorded in this district
                </div>
              )}
            </div>
          ) : (
            /* ── Default Crime Hotspots card ── */
            <div className="chart-card">
              <div className="chart-card-header" style={{ marginBottom: 14 }}>
                <div className="chart-card-title">
                  <span className="material-icons-outlined">whatshot</span>
                  Crime Hotspots
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topDistricts.map(([districtId, count], i) => {
                  const pct = Math.round((count / (incidents.length || 1)) * 100);
                  const distName = getDistrictName(parseInt(districtId));
                  return (
                    <div
                      key={districtId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleDistrictSelect(parseInt(districtId) || districtId)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>
                          {i + 1}. {distName.split(' ').slice(0, 2).join(' ')}
                        </span>
                        <span style={{ fontSize: 11, color: barColors[i], fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 4 }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: barColors[i], borderRadius: 4,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {overlays.districts && (
                <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Click a district on the map or above to drill down
                </div>
              )}
            </div>
          )}

          {/* Time patterns */}
          <div className="chart-card">
            <div className="chart-card-title" style={{ marginBottom: 14 }}>
              <span className="material-icons-outlined">schedule</span>
              Time Patterns
            </div>
            {(() => {
              const slots = [
                { label: 'Night (0–6h)',      range: [0,  6]  },
                { label: 'Morning (6–12h)',   range: [6,  12] },
                { label: 'Afternoon (12–18h)', range: [12, 18] },
                { label: 'Evening (18–24h)',  range: [18, 24] },
              ];
              return slots.map(slot => {
                const cnt = incidents.filter(i => {
                  const h = new Date(i.IncidentFromDate).getHours();
                  return h >= slot.range[0] && h < slot.range[1];
                }).length;
                const pct = Math.round((cnt / (incidents.length || 1)) * 100);
                return (
                  <div key={slot.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{slot.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 4 }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'rgba(255,255,255,0.25)', borderRadius: 4,
                      }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Map legend */}
          <div className="chart-card">
            <div className="chart-card-title" style={{ marginBottom: 12 }}>
              <span className="material-icons-outlined">legend_toggle</span>
              Map Legend
            </div>

            {/* Dynamic legend based on vizMode */}
            {vizMode === 'markers' && !overlays.crimeType && (
              <>
                {[
                  { color: '#ef5350', label: 'Open Cases' },
                  { color: '#ff9800', label: 'Under Investigation' },
                  { color: '#66bb6a', label: 'Closed' },
                ].map(l => (
                  <div key={l.label} className="legend-item">
                    <div className="legend-dot" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </>
            )}

            {vizMode === 'markers' && overlays.crimeType && (
              <>
                {[
                  { color: '#ef5350', label: 'Chain Snatching' },
                  { color: '#42a5f5', label: 'Cyber Crime' },
                  { color: '#ab47bc', label: 'Drug Trafficking' },
                  { color: '#ff7043', label: 'Burglary' },
                  { color: '#ffd54f', label: 'Financial Fraud' },
                  { color: '#78909c', label: 'Other Types' },
                ].map(l => (
                  <div key={l.label} className="legend-item">
                    <div className="legend-dot" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </>
            )}

            {vizMode === 'heatmap' && (
              <div className="legend-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Density gradient weighted by severity</span>
                <div style={{
                  width: '100%', height: 6, borderRadius: 3,
                  background: 'linear-gradient(90deg, rgba(66,165,245,0.4), rgba(255,213,79,0.6), rgba(239,83,80,0.9), rgba(229,57,53,1))',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 9, color: 'var(--text-muted)' }}>
                  <span>Low</span><span>High</span>
                </div>
              </div>
            )}

            {vizMode === 'severity' && (
              <>
                {[1, 2, 3, 4, 5].map(sev => {
                  const colors = ['#66bb6a', '#ffd54f', '#ff9800', '#ff5722', '#e53935'];
                  const labels = ['Minor', 'Low', 'Medium', 'High', 'Critical'];
                  return (
                    <div key={sev} className="legend-item">
                      <div className="legend-dot" style={{
                        background: colors[sev - 1],
                        width: 4 + sev * 2,
                        height: 4 + sev * 2,
                      }} />
                      Sev {sev} — {labels[sev - 1]}
                    </div>
                  );
                })}
              </>
            )}

            {overlays.districts && (
              <div className="legend-item" style={{ marginTop: 6 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }} />
                District Boundary
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
