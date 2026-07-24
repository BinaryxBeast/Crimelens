import { useState, useMemo } from 'react';

// ── Severity colors ──
const SEV_COLORS = {
  critical: { bg: 'rgba(239,83,80,0.08)', border: 'rgba(239,83,80,0.25)', text: '#ef5350', icon: 'gpp_bad' },
  high:     { bg: 'rgba(255,152,0,0.08)',  border: 'rgba(255,152,0,0.25)',  text: '#ff9800', icon: 'warning_amber' },
  medium:   { bg: 'rgba(255,204,0,0.08)',  border: 'rgba(255,204,0,0.25)',  text: '#ffcc00', icon: 'report_problem' },
  low:      { bg: 'rgba(102,187,106,0.08)',border: 'rgba(102,187,106,0.25)',text: '#66bb6a', icon: 'check_circle' },
};

const CONN_COLORS = {
  modus_operandi: '#e57373',
  same_accused:   '#ce93d8',
  location_cluster:'#4dd0e1',
  temporal:        '#ffb74d',
  property:        '#81c784',
};

// ── Mini Linkage Graph (SVG) ──
function LinkageGraph({ linkages, patterns }) {
  // Build nodes from linked cases
  const { nodes, edges } = useMemo(() => {
    const nodeMap = {};
    const edgeList = [];
    let nodeId = 0;

    // Add nodes from linkages
    linkages.forEach((lnk, li) => {
      const caseIds = lnk.linkedCaseIds || [];
      const firNos = lnk.linkedCaseFIRs || [];
      caseIds.forEach((cid, ci) => {
        if (!nodeMap[cid]) {
          nodeMap[cid] = {
            id: cid,
            label: firNos[ci] || cid,
            group: li,
            x: 0, y: 0,
            type: 'case',
          };
          nodeId++;
        }
      });
      // Create edges between all pairs in this linkage
      for (let i = 0; i < caseIds.length; i++) {
        for (let j = i + 1; j < caseIds.length; j++) {
          edgeList.push({
            source: caseIds[i],
            target: caseIds[j],
            color: CONN_COLORS[lnk.connectionType] || 'rgba(255,255,255,0.2)',
            linkageId: lnk.id,
            type: lnk.connectionType,
          });
        }
      }
    });

    // Add pattern hub nodes
    patterns.forEach((ptn, pi) => {
      const hubId = `hub-${ptn.id}`;
      nodeMap[hubId] = {
        id: hubId,
        label: ptn.name?.split(' ').slice(0, 3).join(' ') || ptn.id,
        group: linkages.length + pi,
        x: 0, y: 0,
        type: 'pattern',
        severity: ptn.severity,
      };
      (ptn.linkedCaseIds || []).forEach(cid => {
        if (nodeMap[cid]) {
          edgeList.push({
            source: hubId,
            target: cid,
            color: SEV_COLORS[ptn.severity]?.text || 'rgba(255,255,255,0.15)',
            type: 'pattern',
          });
        }
      });
    });

    // Lay out nodes in a circular pattern
    const nodeArr = Object.values(nodeMap);
    const cx = 200, cy = 140;
    const patternNodes = nodeArr.filter(n => n.type === 'pattern');
    const caseNodes = nodeArr.filter(n => n.type === 'case');

    // Pattern hubs go inner ring
    patternNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (patternNodes.length || 1) - Math.PI / 2;
      n.x = cx + Math.cos(angle) * 55;
      n.y = cy + Math.sin(angle) * 55;
    });

    // Case nodes go outer ring
    caseNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (caseNodes.length || 1) - Math.PI / 2;
      n.x = cx + Math.cos(angle) * 120;
      n.y = cy + Math.sin(angle) * 95;
    });

    return { nodes: nodeArr, edges: edgeList };
  }, [linkages, patterns]);

  const [hoveredNode, setHoveredNode] = useState(null);

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        <span className="material-icons" style={{ fontSize: 28, marginBottom: 8, display: 'block', opacity: 0.4 }}>hub</span>
        No linkage graph data available
      </div>
    );
  }

  return (
    <svg viewBox="0 0 400 280" className="linkage-graph-svg">
      <defs>
        <filter id="glow-node">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="node-grad" cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const sn = nodes.find(n => n.id === e.source);
        const tn = nodes.find(n => n.id === e.target);
        if (!sn || !tn) return null;
        const isHovered = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);
        return (
          <line
            key={i}
            x1={sn.x} y1={sn.y} x2={tn.x} y2={tn.y}
            stroke={e.color}
            strokeWidth={isHovered ? 2 : 1}
            strokeOpacity={isHovered ? 0.8 : 0.3}
            className="linkage-edge"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const isPattern = n.type === 'pattern';
        const isHovered = hoveredNode === n.id;
        const r = isPattern ? 18 : 10;
        const sevCol = SEV_COLORS[n.severity]?.text || '#ffffff';

        return (
          <g
            key={n.id}
            onMouseEnter={() => setHoveredNode(n.id)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Glow ring for patterns */}
            {isPattern && (
              <circle
                cx={n.x} cy={n.y} r={r + 4}
                fill="none" stroke={sevCol}
                strokeWidth="1" strokeOpacity="0.3"
                className="linkage-node-pulse"
              />
            )}
            <circle
              cx={n.x} cy={n.y} r={r}
              fill={isPattern ? `${sevCol}22` : 'url(#node-grad)'}
              stroke={isPattern ? sevCol : 'rgba(255,255,255,0.25)'}
              strokeWidth={isHovered ? 2 : 1}
              filter={isHovered ? 'url(#glow-node)' : undefined}
            />
            {/* Label */}
            <text
              x={n.x} y={n.y + (isPattern ? r + 14 : r + 12)}
              textAnchor="middle"
              fill={isHovered ? '#ffffff' : 'var(--text-muted)'}
              fontSize={isPattern ? 8 : 7}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isPattern ? 700 : 400}
            >
              {(n.label || '').slice(0, 16)}
            </text>
            {/* Inner icon for pattern nodes */}
            {isPattern && (
              <text
                x={n.x} y={n.y + 4}
                textAnchor="middle"
                fill={sevCol}
                fontSize="12"
                fontFamily="Material Icons"
              >
                hub
              </text>
            )}
            {/* Dot for case nodes */}
            {!isPattern && (
              <circle cx={n.x} cy={n.y} r={3} fill="rgba(255,255,255,0.5)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Pattern Card ──
function PatternCard({ pattern, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV_COLORS[pattern.severity] || SEV_COLORS.medium;

  return (
    <div
      className={`pattern-card ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="pattern-card-header">
        <div className="pattern-card-icon" style={{ background: sev.bg, borderColor: sev.border }}>
          <span className="material-icons" style={{ color: sev.text, fontSize: 16 }}>{sev.icon}</span>
        </div>
        <div className="pattern-card-info">
          <div className="pattern-card-name">{pattern.name || `Pattern ${index + 1}`}</div>
          <div className="pattern-card-meta">
            {pattern.crimeType && <span>{pattern.crimeType}</span>}
            {pattern.district && <span>· {pattern.district}</span>}
            {pattern.caseCount && <span>· {pattern.caseCount} cases</span>}
          </div>
        </div>
        <div className="pattern-card-severity" style={{ color: sev.text }}>
          {pattern.severity?.toUpperCase()}
        </div>
        <span className="material-icons pattern-card-chevron" style={{ fontSize: 18, color: 'var(--text-muted)' }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {expanded && (
        <div className="pattern-card-body">
          {pattern.description && (
            <div className="pattern-card-desc">{pattern.description}</div>
          )}

          {/* Linked FIRs */}
          {pattern.linkedCaseFIRs && pattern.linkedCaseFIRs.length > 0 && (
            <div className="pattern-card-firs">
              <span className="pattern-card-label">Linked FIRs</span>
              <div className="pattern-card-fir-list">
                {pattern.linkedCaseFIRs.map((fir, i) => (
                  <span key={i} className="pattern-fir-chip">{fir}</span>
                ))}
              </div>
            </div>
          )}

          {/* Frequency & timespan */}
          <div className="pattern-card-stats">
            {pattern.frequency && (
              <div className="pattern-stat">
                <span className="material-icons-outlined" style={{ fontSize: 13 }}>schedule</span>
                {pattern.frequency}
              </div>
            )}
            {pattern.timespan && (
              <div className="pattern-stat">
                <span className="material-icons-outlined" style={{ fontSize: 13 }}>date_range</span>
                {pattern.timespan}
              </div>
            )}
          </div>

          {/* Prediction */}
          {pattern.prediction && (
            <div className="pattern-card-prediction">
              <span className="material-icons" style={{ fontSize: 14, color: '#ffb74d' }}>auto_awesome</span>
              <span>{pattern.prediction}</span>
            </div>
          )}

          {/* Timeline of linked FIRs */}
          {pattern.linkedCaseFIRs && pattern.linkedCaseFIRs.length > 1 && (
            <div className="linkage-timeline">
              {pattern.linkedCaseFIRs.map((fir, i) => (
                <div key={i} className="timeline-node">
                  <div className="timeline-dot" style={{ background: sev.text }} />
                  {i < pattern.linkedCaseFIRs.length - 1 && (
                    <div className="timeline-line" style={{ background: sev.text }} />
                  )}
                  <div className="timeline-label">{fir}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Alert Card (Gemini) ──
function GeminiAlertCard({ alert }) {
  const sev = SEV_COLORS[alert.severity] || SEV_COLORS.medium;

  return (
    <div className="gemini-alert-card" style={{ borderLeftColor: sev.text }}>
      <div className="gemini-alert-header">
        <div className="gemini-alert-icon" style={{ background: sev.bg }}>
          <span className="material-icons" style={{ color: sev.text, fontSize: 16 }}>{sev.icon}</span>
        </div>
        <div className="gemini-alert-info">
          <div className="gemini-alert-title">{alert.title}</div>
          <div className="gemini-alert-sub">
            {alert.crimeType && <span>{alert.crimeType}</span>}
            {alert.district && <span> — {alert.district}</span>}
          </div>
        </div>
      </div>
      <div className="gemini-alert-message">{alert.message}</div>
      {alert.recommendation && (
        <div className="gemini-alert-rec">
          <span className="material-icons-outlined" style={{ fontSize: 13, color: '#4dd0e1' }}>tips_and_updates</span>
          <span>{alert.recommendation}</span>
        </div>
      )}
    </div>
  );
}

// ── Connection Type Legend ──
function ConnectionLegend() {
  const types = [
    { key: 'modus_operandi', label: 'Modus Operandi' },
    { key: 'same_accused', label: 'Same Accused' },
    { key: 'location_cluster', label: 'Location Cluster' },
    { key: 'temporal', label: 'Temporal Pattern' },
    { key: 'property', label: 'Property Match' },
  ];
  return (
    <div className="linkage-legend">
      {types.map(t => (
        <div key={t.key} className="linkage-legend-item">
          <div className="linkage-legend-dot" style={{ background: CONN_COLORS[t.key] }} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT: CaseLinkagePanel
// ═══════════════════════════════════════════════════════════════
export default function CaseLinkagePanel({
  linkages = [],
  patterns = [],
  alerts = [],
  summary = null,
  loading = false,
  error = null,
  hasApiKey = false,
  lastAnalyzed = null,
  onAnalyze,
}) {
  const [activeTab, setActiveTab] = useState('patterns');

  const threatColors = {
    critical: '#ef5350',
    high: '#ff9800',
    medium: '#ffcc00',
    low: '#66bb6a',
  };

  // ── API key missing state ──
  if (!hasApiKey) {
    return (
      <div className="linkage-panel">
        <div className="linkage-panel-header">
          <div className="linkage-panel-title-group">
            <div className="linkage-panel-icon">
              <span className="material-icons">auto_awesome</span>
            </div>
            <div>
              <div className="linkage-panel-title">AI Case Linkage & Pattern Detection</div>
              <div className="linkage-panel-sub">Powered by Gemini 3.5 Flash-Lite</div>
            </div>
          </div>
        </div>
        <div className="linkage-api-missing">
          <span className="material-icons" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 8 }}>key_off</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Gemini API Key Required</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
            Add your Gemini API key to the <code style={{ background: 'var(--elevation-3)', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>.env</code> file as <code style={{ background: 'var(--elevation-3)', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>VITE_GEMINI_API_KEY</code> and restart the dev server.
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="linkage-panel">
        <div className="linkage-panel-header">
          <div className="linkage-panel-title-group">
            <div className="linkage-panel-icon analyzing">
              <span className="material-icons">auto_awesome</span>
            </div>
            <div>
              <div className="linkage-panel-title">Analyzing Case Linkages…</div>
              <div className="linkage-panel-sub">Gemini is scanning {summary ? 'patterns' : 'all cases'} for connections</div>
            </div>
          </div>
        </div>
        <div className="linkage-loading">
          <div className="linkage-loading-bar">
            <div className="linkage-loading-fill" />
          </div>
          <div className="linkage-loading-steps">
            <span className="linkage-step active">Preprocessing cases</span>
            <span className="linkage-step">Analyzing patterns</span>
            <span className="linkage-step">Generating alerts</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    const isKeyMissing = error === 'GEMINI_API_KEY_MISSING';
    const isRateLimited = error === 'RATE_LIMITED';
    return (
      <div className="linkage-panel">
        <div className="linkage-panel-header">
          <div className="linkage-panel-title-group">
            <div className="linkage-panel-icon">
              <span className="material-icons">auto_awesome</span>
            </div>
            <div>
              <div className="linkage-panel-title">AI Case Linkage & Pattern Detection</div>
              <div className="linkage-panel-sub">Powered by Gemini 3.5 Flash-Lite</div>
            </div>
          </div>
        </div>
        <div className="linkage-error">
          <span className="material-icons" style={{ fontSize: 28, color: 'var(--brand-danger)', marginBottom: 6 }}>
            {isRateLimited ? 'hourglass_top' : 'error_outline'}
          </span>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {isKeyMissing ? 'API Key Missing' : isRateLimited ? 'Rate Limited' : 'Analysis Failed'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            {isKeyMissing ? 'Add VITE_GEMINI_API_KEY to your .env file.' :
             isRateLimited ? 'Too many requests. Please wait and try again.' :
             error}
          </div>
          {!isKeyMissing && (
            <button className="linkage-retry-btn" onClick={onAnalyze}>
              <span className="material-icons" style={{ fontSize: 14 }}>refresh</span>
              Retry Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasCriticalAlerts = alerts.some(a => a.severity === 'critical');
  const threatLevel = summary?.overallThreatLevel || 'low';

  return (
    <div className="linkage-panel">
      {/* ── Critical Alert Strip ── */}
      {hasCriticalAlerts && (
        <div className="linkage-alert-strip">
          <span className="material-icons" style={{ fontSize: 16 }}>notification_important</span>
          <span className="linkage-alert-strip-text">
            {alerts.filter(a => a.severity === 'critical').length} critical pattern
            {alerts.filter(a => a.severity === 'critical').length > 1 ? 's' : ''} detected — Immediate attention required
          </span>
          <div className="linkage-alert-strip-pulse" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="linkage-panel-header">
        <div className="linkage-panel-title-group">
          <div className="linkage-panel-icon">
            <span className="material-icons">auto_awesome</span>
          </div>
          <div>
            <div className="linkage-panel-title">AI Case Linkage & Pattern Detection</div>
            <div className="linkage-panel-sub">
              {summary?.keyInsight || 'Gemini-powered crime pattern intelligence'}
            </div>
          </div>
        </div>

        <div className="linkage-panel-actions">
          {/* Threat level badge */}
          <div className="linkage-threat-badge" style={{ borderColor: threatColors[threatLevel] + '55' }}>
            <div className="linkage-threat-dot" style={{ background: threatColors[threatLevel] }} />
            <span style={{ color: threatColors[threatLevel] }}>{threatLevel.toUpperCase()}</span>
          </div>

          {/* Stats */}
          <div className="linkage-stats-row">
            <div className="linkage-stat">
              <span className="linkage-stat-value">{linkages.length}</span>
              <span className="linkage-stat-label">Linkages</span>
            </div>
            <div className="linkage-stat">
              <span className="linkage-stat-value">{patterns.length}</span>
              <span className="linkage-stat-label">Patterns</span>
            </div>
            <div className="linkage-stat">
              <span className="linkage-stat-value">{alerts.length}</span>
              <span className="linkage-stat-label">Alerts</span>
            </div>
          </div>

          {/* Refresh btn */}
          <button className="linkage-refresh-btn" onClick={onAnalyze} title="Re-run AI analysis">
            <span className="material-icons" style={{ fontSize: 16 }}>refresh</span>
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="linkage-tabs">
        {[
          { key: 'patterns', label: 'Patterns', icon: 'pattern', count: patterns.length },
          { key: 'linkages', label: 'Linkages', icon: 'hub', count: linkages.length },
          { key: 'alerts', label: 'Alerts', icon: 'notifications_active', count: alerts.length },
        ].map(tab => (
          <button
            key={tab.key}
            className={`linkage-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className="linkage-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="linkage-tab-content">
        {/* Patterns tab */}
        {activeTab === 'patterns' && (
          <div className="linkage-patterns-grid">
            {patterns.length > 0 ? patterns.map((p, i) => (
              <PatternCard key={p.id || i} pattern={p} index={i} />
            )) : (
              <div className="linkage-empty">
                <span className="material-icons" style={{ fontSize: 28, opacity: 0.3 }}>pattern</span>
                <span>No crime patterns detected in current dataset</span>
              </div>
            )}
          </div>
        )}

        {/* Linkages tab */}
        {activeTab === 'linkages' && (
          <div className="linkage-graph-section">
            <div className="linkage-graph-container">
              <LinkageGraph linkages={linkages} patterns={patterns} />
              <ConnectionLegend />
            </div>
            <div className="linkage-list">
              {linkages.length > 0 ? linkages.map((lnk, i) => (
                <div key={lnk.id || i} className="linkage-item">
                  <div className="linkage-item-header">
                    <div className="linkage-item-dot" style={{ background: CONN_COLORS[lnk.connectionType] || '#666' }} />
                    <div className="linkage-item-name">{lnk.name || `Linkage ${i + 1}`}</div>
                    <div className="linkage-item-confidence">
                      {Math.round((lnk.confidence || 0) * 100)}%
                    </div>
                  </div>
                  <div className="linkage-item-reason">{lnk.reasoning}</div>
                  <div className="linkage-item-firs">
                    {(lnk.linkedCaseFIRs || []).map((fir, fi) => (
                      <span key={fi} className="pattern-fir-chip">{fir}</span>
                    ))}
                  </div>
                  {lnk.commonAttributes && (
                    <div className="linkage-item-attrs">
                      {lnk.commonAttributes.modusOperandi && (
                        <span className="linkage-attr">
                          <span className="material-icons-outlined" style={{ fontSize: 11 }}>fingerprint</span>
                          {lnk.commonAttributes.modusOperandi}
                        </span>
                      )}
                      {lnk.commonAttributes.timePattern && (
                        <span className="linkage-attr">
                          <span className="material-icons-outlined" style={{ fontSize: 11 }}>schedule</span>
                          {lnk.commonAttributes.timePattern}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )) : (
                <div className="linkage-empty">
                  <span className="material-icons" style={{ fontSize: 28, opacity: 0.3 }}>link_off</span>
                  <span>No case linkages identified</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div className="linkage-alerts-list">
            {alerts.length > 0 ? alerts.map((a, i) => (
              <GeminiAlertCard key={a.id || i} alert={a} />
            )) : (
              <div className="linkage-empty">
                <span className="material-icons" style={{ fontSize: 28, color: 'var(--brand-success)', opacity: 0.5 }}>verified</span>
                <span>No active alerts — all clear</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="linkage-panel-footer">
        <div className="gemini-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" opacity="0.6" />
          </svg>
          Powered by Gemini 3.5 Flash-Lite
        </div>
        {lastAnalyzed && (
          <div className="linkage-last-analyzed">
            Last analyzed: {lastAnalyzed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
