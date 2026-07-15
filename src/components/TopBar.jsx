import { useState, useEffect } from 'react';
import { useCrimeData } from '../hooks/useCrimeData';
import RealtimeStatus from './RealtimeStatus';

const PAGE_META = {
  '/':           { title: 'Dashboard',                  subtitle: 'Overview of statewide crime intelligence' },
  '/map':        { title: 'Crime Map',                   subtitle: 'Geospatial heatmap & district drill-down' },
  '/network':    { title: 'Network Analysis',            subtitle: 'Criminal link analysis & offender profiles' },
  '/predictive': { title: 'AI Predictive Intelligence',  subtitle: 'Risk scoring, anomaly detection & trend forecasting' },
  '/reports':    { title: 'Reports & Records',           subtitle: 'Incident management & data entry' },
  '/offenders':  { title: 'Offender Registry',           subtitle: 'Manage and monitor registered offenders' },
};

export default function TopBar({ currentPath }) {
  const { stats } = useCrimeData();
  const [time, setTime] = useState('');
  const meta = PAGE_META[currentPath] || PAGE_META['/'];

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        timeZone: 'Asia/Kolkata',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-subtitle">{meta.subtitle}</div>
      </div>
      <div className="topbar-right">
        {/* Live connection indicator */}
        <RealtimeStatus />

        {stats?.highSeverity > 0 && (
          <div className="topbar-stat" style={{ borderColor: 'rgba(239,83,80,0.2)' }}>
            <span className="alert-dot" />
            <span className="topbar-stat-value" style={{ color: 'var(--brand-danger)' }}>
              {stats.highSeverity}
            </span>
            <span className="topbar-stat-label">High Severity</span>
          </div>
        )}
        <div className="topbar-stat">
          <span className="material-icons" style={{ fontSize: 13, color: 'var(--text-muted)' }}>folder_open</span>
          <span className="topbar-stat-value">{stats?.total ?? '—'}</span>
          <span className="topbar-stat-label">Total Incidents</span>
        </div>
        <div className="topbar-stat">
          <span className="material-icons" style={{ fontSize: 13, color: 'var(--brand-success)' }}>check_circle</span>
          <span className="topbar-stat-value" style={{ color: 'var(--brand-success)' }}>
            {stats?.closedRate ?? 0}%
          </span>
          <span className="topbar-stat-label">Closed Rate</span>
        </div>
        <div className="time-display">IST {time}</div>
      </div>
    </header>
  );
}
