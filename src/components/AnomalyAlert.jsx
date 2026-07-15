export default function AnomalyAlert({ anomaly, type = 'critical' }) {
  const iconMap = {
    critical: 'gpp_bad',
    warning:  'warning_amber',
    info:     'info_outline',
  };

  return (
    <div className={`alert-card ${type}`}>
      <div className={`alert-icon ${type}`}>
        <span className="material-icons">{iconMap[type]}</span>
      </div>
      <div className="alert-body">
        <div className="alert-title">
          {anomaly.type === 'district_spike'    && `District Spike — ${anomaly.district}`}
          {anomaly.type === 'type_spike'        && `Crime Type Spike — ${anomaly.crimeType}`}
          {anomaly.type === 'severity_outlier'  && 'Critical Incident Flagged'}
        </div>
        <div className="alert-message">{anomaly.message}</div>
        <div className="alert-meta">
          {anomaly.zScore && `Z-Score: ${anomaly.zScore}σ above mean`}
          {anomaly.incident && `FIR: ${anomaly.incident.CrimeNo} · ${anomaly.incident.DistrictID}`}
        </div>
      </div>
    </div>
  );
}
