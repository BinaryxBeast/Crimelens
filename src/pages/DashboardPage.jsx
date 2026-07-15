import { useCrimeData } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import KPICard from '../components/KPICard';
import FilterPanel from '../components/FilterPanel';
import AnomalyAlert from '../components/AnomalyAlert';
import {
  MonthlyTrendChart,
  CrimeTypePieChart,
  DistrictBarChart,
  StatusTrendChart,
} from '../components/TrendChart';

export default function DashboardPage() {
  const { incidents, loading, stats, byType, byDistrict, monthlyTrend } = useCrimeData();
  const { districts, getCrimeTypeName, getDistrictName } = useLookupData();
  const { anomalies } = useAnomalyDetection(incidents, districts);

  const kpiCards = [
    {
      label: 'Total Incidents',
      value: stats.total,
      icon: 'folder_open',
      accentColor: 'rgba(255,255,255,0.2)',
      footer: 'All time, current filters',
    },
    {
      label: 'Open Cases',
      value: stats.open,
      icon: 'lock_open',
      accentColor: 'rgba(239,83,80,0.5)',
      footer: 'Require investigation',
    },
    {
      label: 'Under Investigation',
      value: stats.underInvestigation,
      icon: 'manage_search',
      accentColor: 'rgba(255,152,0,0.5)',
      footer: 'Active investigations',
    },
    {
      label: 'Closed Rate',
      value: `${stats.closedRate}%`,
      icon: 'check_circle',
      accentColor: 'rgba(102,187,106,0.5)',
      footer: `${stats.closed} resolved`,
    },
    {
      label: 'High Severity',
      value: stats.highSeverity,
      icon: 'crisis_alert',
      accentColor: 'rgba(239,83,80,0.6)',
      footer: 'Severity 4–5 incidents',
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading intelligence data…</span>
        </div>
      </div>
    );
  }

  const allAlertsFlat = [
    ...(anomalies?.flaggedDistricts || []).map(a => ({ ...a, alertType: 'critical' })),
    ...(anomalies?.flaggedTypes || []).map(a => ({ ...a, alertType: 'warning' })),
    ...(anomalies?.highSeverityOutliers || []).map(a => ({ ...a, alertType: 'critical' })),
  ].slice(0, 5);

  // Resolve IDs to names for insights
  const mostActiveDistrictId = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostActiveDistrict = mostActiveDistrictId ? getDistrictName(parseInt(mostActiveDistrictId)) : '—';
  
  const topCrimeCategoryId = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCrimeCategory = topCrimeCategoryId ? getCrimeTypeName(parseInt(topCrimeCategoryId)) : '—';
  
  const openByType = incidents
    .filter(i => i.CaseStatusID === 1)
    .reduce((a, i) => { a[i.CrimeMajorHeadID] = (a[i.CrimeMajorHeadID] || 0) + 1; return a; }, {});
  const highestOpenRateCrimeId = Object.entries(openByType).sort((a, b) => b[1] - a[1])[0]?.[0];
  const highestOpenRateCrime = highestOpenRateCrimeId ? getCrimeTypeName(parseInt(highestOpenRateCrimeId)) : '—';
  
  const districtsMonitored = Object.keys(byDistrict).length;

  // Build chart data with resolved names
  const byTypeNamed = {};
  Object.entries(byType).forEach(([id, count]) => {
    byTypeNamed[getCrimeTypeName(parseInt(id))] = count;
  });

  const byDistrictNamed = {};
  Object.entries(byDistrict).forEach(([id, count]) => {
    byDistrictNamed[getDistrictName(parseInt(id))] = count;
  });

  const insights = [
    { label: 'Most Active District', value: mostActiveDistrict, icon: 'location_on' },
    { label: 'Top Crime Category', value: topCrimeCategory, icon: 'bar_chart' },
    { label: 'Highest Open Rate Crime', value: highestOpenRateCrime, icon: 'report_problem' },
    { label: 'Districts Monitored', value: districtsMonitored, icon: 'map' },
  ];

  return (
    <div className="page-container">
      <FilterPanel />

      {/* KPI Row */}
      <div className="kpi-grid">
        {kpiCards.map(card => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* Emerging Alerts */}
      {allAlertsFlat.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                <span className="material-icons" style={{ color: 'var(--brand-danger)', fontSize: 16 }}>
                  crisis_alert
                </span>
                Emerging Threat Alerts
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--brand-danger)',
                  animation: 'pulse-dot 2s infinite',
                  display: 'inline-block', marginLeft: 2,
                }} />
              </div>
              <div className="chart-card-subtitle">Statistical anomalies and crime spikes detected</div>
            </div>
            <span style={{
              background: 'rgba(239,83,80,0.1)', color: 'var(--brand-danger)',
              border: '1px solid rgba(239,83,80,0.2)',
              borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700,
            }}>
              {allAlertsFlat.length} ALERTS
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allAlertsFlat.map((alert, i) => (
              <AnomalyAlert key={i} anomaly={alert} type={alert.alertType || 'critical'} />
            ))}
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="chart-grid chart-grid-3" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                <span className="material-icons-outlined">show_chart</span>
                Monthly Incident Trend
              </div>
              <div className="chart-card-subtitle">Last 12 months — all crime types</div>
            </div>
          </div>
          <MonthlyTrendChart data={monthlyTrend} />
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                <span className="material-icons-outlined">donut_large</span>
                Crime Type Breakdown
              </div>
              <div className="chart-card-subtitle">Distribution by category</div>
            </div>
          </div>
          <CrimeTypePieChart data={byTypeNamed} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                <span className="material-icons-outlined">location_city</span>
                Top Districts by Incident Count
              </div>
              <div className="chart-card-subtitle">Highest crime volume areas</div>
            </div>
          </div>
          <DistrictBarChart data={byDistrictNamed} />
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                <span className="material-icons-outlined">stacked_bar_chart</span>
                Case Status Trend (6 Months)
              </div>
              <div className="chart-card-subtitle">Open vs. under investigation vs. closed</div>
            </div>
          </div>
          <StatusTrendChart incidents={incidents} />
        </div>
      </div>

      {/* Quick Intelligence Snapshot */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <span className="material-icons-outlined">lightbulb</span>
            Quick Intelligence Snapshot
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {insights.map(item => (
            <div key={item.label} className="insight-card">
              <div className="insight-icon">
                <span className="material-icons-outlined">{item.icon}</span>
              </div>
              <div>
                <div className="insight-label">{item.label}</div>
                <div className="insight-value">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
