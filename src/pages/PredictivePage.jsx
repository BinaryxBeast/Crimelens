import { useMemo } from 'react';
import { useCrimeData } from '../hooks/useCrimeData';
import { useLookupData } from '../hooks/useLookupData';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import { useCaseLinkage } from '../hooks/useCaseLinkage';
import RiskScoreCard from '../components/RiskScoreCard';
import AnomalyAlert from '../components/AnomalyAlert';
import CaseLinkagePanel from '../components/CaseLinkagePanel';
import { RiskTrendLine } from '../components/TrendChart';

export default function PredictivePage() {
  const { incidents, loading } = useCrimeData();
  const { districts, getDistrictName, getCrimeTypeName } = useLookupData();
  const { anomalies, riskScores } = useAnomalyDetection(incidents, districts);

  // Memoize resolvers object to avoid unnecessary re-renders
  const resolvers = useMemo(() => ({
    getDistrictName,
    getCrimeTypeName,
  }), [getDistrictName, getCrimeTypeName]);

  // AI Case Linkage (Gemini 3.5 Flash-Lite)
  const {
    linkages, patterns, alerts: geminiAlerts, summary,
    loading: linkageLoading, error: linkageError,
    hasApiKey, lastAnalyzed, analyze,
  } = useCaseLinkage(incidents, resolvers);

  const topRisk     = riskScores.slice(0, 8);
  const allAlerts   = [
    ...(anomalies?.flaggedDistricts || []).map(a => ({ ...a, alertType: 'critical' })),
    ...(anomalies?.flaggedTypes || []).map(a => ({ ...a, alertType: 'warning' })),
    ...(anomalies?.highSeverityOutliers || []).map(a => ({ ...a, alertType: 'critical' })),
  ];

  const riskTrendData = topRisk.slice(0, 8).map(d => ({
    name: d.name?.split(' ')[0] || '?',
    riskScore: d.riskScore,
  }));

  const criticalZones = topRisk.filter(d => d.riskLevel === 'Critical');
  const highZones     = topRisk.filter(d => d.riskLevel === 'High');

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <span>Running AI risk models…</span>
        </div>
      </div>
    );
  }

  const bannerStats = [
    { value: criticalZones.length, label: 'Critical Zones',    icon: 'gpp_bad',        color: 'var(--brand-danger)' },
    { value: highZones.length,     label: 'High-Risk Zones',   icon: 'warning_amber',  color: 'var(--brand-warning)' },
    { value: allAlerts.length,     label: 'Anomalies Flagged', icon: 'notifications',  color: 'var(--text-secondary)' },
    { value: patterns.length,      label: 'AI Patterns',       icon: 'pattern',        color: '#4dd0e1' },
    { value: linkages.length,      label: 'Case Linkages',     icon: 'hub',            color: '#ce93d8' },
  ];

  return (
    <div className="page-container">
      {/* Header banner */}
      <div className="predictive-banner">
        <div className="predictive-banner-icon">
          <span className="material-icons">psychology</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3, letterSpacing: '-0.2px' }}>
            AI-Driven Predictive Intelligence Engine
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Statistical anomaly detection (Z-Score / IQR) + Gemini 3.5 Flash-Lite AI case linkage & pattern recognition
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {bannerStats.map(s => (
            <div key={s.label} className="predictive-banner-stat">
              <div className="predictive-banner-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="predictive-banner-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Case Linkage Panel (Gemini 3.5 Flash-Lite) ── */}
      <CaseLinkagePanel
        linkages={linkages}
        patterns={patterns}
        alerts={geminiAlerts}
        summary={summary}
        loading={linkageLoading}
        error={linkageError}
        hasApiKey={hasApiKey}
        lastAnalyzed={lastAnalyzed}
        onAnalyze={analyze}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* Left: Risk scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">
                  <span className="material-icons-outlined">my_location</span>
                  District Risk Score Rankings
                </div>
                <div className="chart-card-subtitle">
                  Composite score: recent incidents · avg severity · open case rate · urbanisation index
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topRisk.map((d, i) => (
                <RiskScoreCard
                  key={d.id || d.name}
                  rank={i + 1}
                  district={d.name}
                  riskScore={d.riskScore}
                  riskLevel={d.riskLevel}
                  riskColor={d.riskColor}
                  recentCount={d.recentCount}
                  avgSeverity={d.avgSeverity}
                  openRate={d.openRate}
                />
              ))}
              {topRisk.length === 0 && (
                <div className="loading-container" style={{ minHeight: 120 }}>
                  <span>No district risk data available. Ensure districts are seeded.</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk trend chart */}
          {riskTrendData.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-header">
                <div className="chart-card-title">
                  <span className="material-icons-outlined">bar_chart</span>
                  Risk Score Distribution
                </div>
              </div>
              <RiskTrendLine data={riskTrendData} />
            </div>
          )}
        </div>

        {/* Right: Anomalies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">
                  <span className="material-icons-outlined">radar</span>
                  Anomaly Detection
                </div>
                <div className="chart-card-subtitle">Statistical outliers — Z-Score analysis</div>
              </div>
              {allAlerts.length > 0 && (
                <span style={{
                  background: 'rgba(239,83,80,0.1)', color: 'var(--brand-danger)',
                  border: '1px solid rgba(239,83,80,0.2)',
                  borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                }}>
                  {allAlerts.length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allAlerts.length > 0
                ? allAlerts.map((a, i) => (
                    <AnomalyAlert key={i} anomaly={a} type={a.alertType} />
                  ))
                : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ fontSize: 28, color: 'var(--brand-success)' }}>check_circle</span>
                    No anomalies detected in current dataset
                  </div>
                )
              }
            </div>
          </div>

          {/* Socio-economic panel */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">
                <span className="material-icons-outlined">location_city</span>
                Socio-Economic Overlay
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              Urbanisation index vs. incident rate (top 6 districts)
            </div>
            {topRisk.slice(0, 6).map(d => (
              <div key={d.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {(d.name || '').split(' ').slice(0, 2).join(' ')}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Urban {d.urban_pct?.toFixed(0) ?? 0}%
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--border-subtle)', borderRadius: 4, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${d.urban_pct ?? 0}%`, height: '100%',
                    background: 'rgba(255,255,255,0.15)', borderRadius: 4,
                  }} />
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${d.riskScore}%`, height: '100%',
                    background: d.riskColor + '99', borderRadius: 4,
                    mixBlendMode: 'screen',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Urbanisation</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--brand-danger)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Risk Score</span>
              </div>
            </div>
          </div>

          {/* Methodology card */}
          <div className="chart-card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--text-muted)' }}>functions</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Risk Score Formula</span>
            </div>
            <pre style={{
              fontSize: 10, color: 'var(--text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
              background: 'var(--elevation-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '10px 12px',
            }}>
{`Risk = (recent_incidents × 3)
      + (avg_severity × 10)
      + (open_rate × 20)
      + (urban_pct × 0.2)

Z-Score = (x - μ) / σ
Flag if |Z| > 1.8σ`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
