export default function RiskScoreCard({ district, riskScore, riskLevel, riskColor, recentCount, avgSeverity, openRate, rank }) {
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (riskScore / 100) * circumference;

  const levelIcon = {
    Critical: 'gpp_bad',
    High:     'warning_amber',
    Medium:   'report_problem',
    Low:      'check_circle',
  }[riskLevel] || 'radio_button_unchecked';

  return (
    <div className="risk-card">
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="28" cy="28" r="24" fill="none"
            stroke={riskColor} strokeWidth="3"
            strokeDasharray={2 * Math.PI * 24}
            strokeDashoffset={(2 * Math.PI * 24) - (riskScore / 100) * (2 * Math.PI * 24)}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: riskColor, fontFamily: 'JetBrains Mono, monospace',
        }}>
          {riskScore}
        </div>
      </div>

      <div className="risk-card-info">
        <div className="flex items-center gap-8">
          {rank && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginRight: 2 }}>
              #{rank}
            </span>
          )}
          <div className="risk-district">{district}</div>
        </div>
        <div className="risk-level" style={{ color: riskColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-icons" style={{ fontSize: 13 }}>{levelIcon}</span>
          {riskLevel} Risk
        </div>
        <div className="risk-meta">
          {recentCount} recent · Avg severity {avgSeverity} · {openRate}% open
        </div>
      </div>
    </div>
  );
}
