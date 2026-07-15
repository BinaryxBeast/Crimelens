export default function KPICard({ label, value, icon, iconBg, accentColor, trend, trendLabel, footer }) {
  return (
    <div className="kpi-card" style={{ '--card-accent': accentColor || 'rgba(255,255,255,0.15)' }}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ '--icon-bg': iconBg || 'var(--elevation-4)' }}>
          <span className="material-icons-outlined" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>
            {icon}
          </span>
        </div>
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      {(trend !== undefined || footer) && (
        <div className="kpi-footer">
          {trend !== undefined && (
            <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
              <span className="material-icons">
                {trend >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span>{trendLabel}</span>}
          {footer && <span>{footer}</span>}
        </div>
      )}
    </div>
  );
}
