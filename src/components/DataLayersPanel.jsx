import { useState, useRef, useEffect } from 'react';

const VIZ_MODES = [
  { id: 'markers',  label: 'Crime Markers',    icon: 'place',          desc: 'Individual incidents by status' },
  { id: 'heatmap',  label: 'Heatmap',          icon: 'whatshot',       desc: 'Crime density gradient' },
  { id: 'severity', label: 'Severity Overlay',  icon: 'adjust',        desc: 'Sized by severity (1–5)' },
];

const OVERLAY_LAYERS = [
  { id: 'districts',    label: 'District Boundaries', icon: 'grid_view',      desc: 'Karnataka district lines' },
  { id: 'openOnly',     label: 'Open Cases Only',     icon: 'error_outline',  desc: 'Filter to unresolved cases' },
  { id: 'crimeType',    label: 'Crime Type Colors',   icon: 'palette',        desc: 'Color-code by crime type' },
  { id: 'timeFilter',   label: 'Time Filter',         icon: 'schedule',       desc: 'Filter by time of day' },
];

const TIME_SLOTS = [
  { id: 'night',     label: 'Night',     range: [0, 6],   short: '0–6h' },
  { id: 'morning',   label: 'Morning',   range: [6, 12],  short: '6–12h' },
  { id: 'afternoon', label: 'Afternoon', range: [12, 18], short: '12–18h' },
  { id: 'evening',   label: 'Evening',   range: [18, 24], short: '18–24h' },
];

export default function DataLayersPanel({
  vizMode,
  onVizModeChange,
  overlays,
  onOverlayToggle,
  timeSlot,
  onTimeSlotChange,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Count active layers
  const activeCount = 1 + Object.values(overlays).filter(Boolean).length; // 1 for viz mode

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      {open && <div className="data-layers-backdrop" onClick={() => setOpen(false)} />}

      <div className="data-layers-wrapper" ref={wrapperRef}>
        {/* Trigger */}
        <button
          className={`data-layers-trigger${open ? ' open' : ''}`}
          onClick={() => setOpen(prev => !prev)}
        >
          <span className="material-icons-outlined">layers</span>
          Data Layers
          <span className="data-layers-badge">{activeCount}</span>
          <span className="material-icons-outlined trigger-chevron">expand_more</span>
        </button>

        {/* Expanded panel */}
        {open && (
          <div className="data-layers-panel">
            {/* ── Visualization Mode (radio) ── */}
            <div className="dl-category">
              <div className="dl-category-label">
                <span className="material-icons-outlined">visibility</span>
                Visualization Mode
              </div>

              {VIZ_MODES.map(mode => (
                <div
                  key={mode.id}
                  className={`dl-layer-row${vizMode === mode.id ? ' active' : ''}`}
                  onClick={() => onVizModeChange(mode.id)}
                >
                  <div className="dl-radio">
                    <div className="dl-radio-dot" />
                  </div>
                  <div className="dl-layer-info">
                    <div className="dl-layer-name">{mode.label}</div>
                    <div className="dl-layer-desc">{mode.desc}</div>
                  </div>
                  <span className="material-icons-outlined dl-layer-icon">{mode.icon}</span>
                </div>
              ))}
            </div>

            {/* ── Overlay Layers (checkbox) ── */}
            <div className="dl-category">
              <div className="dl-category-label">
                <span className="material-icons-outlined">filter_list</span>
                Overlay Layers
              </div>

              {OVERLAY_LAYERS.map(layer => (
                <div key={layer.id}>
                  <div
                    className={`dl-layer-row${overlays[layer.id] ? ' active' : ''}`}
                    onClick={() => onOverlayToggle(layer.id)}
                  >
                    <div className="dl-checkbox">
                      <span className="material-icons dl-check-icon">check</span>
                    </div>
                    <div className="dl-layer-info">
                      <div className="dl-layer-name">{layer.label}</div>
                      <div className="dl-layer-desc">{layer.desc}</div>
                    </div>
                    <span className="material-icons-outlined dl-layer-icon">{layer.icon}</span>
                  </div>

                  {/* Time filter sub-selector */}
                  {layer.id === 'timeFilter' && overlays.timeFilter && (
                    <div className="dl-time-sub">
                      <div className="dl-time-chips">
                        {TIME_SLOTS.map(slot => (
                          <button
                            key={slot.id}
                            className={`dl-time-chip${timeSlot === slot.id ? ' active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTimeSlotChange(timeSlot === slot.id ? null : slot.id);
                            }}
                          >
                            {slot.label} <span style={{ opacity: 0.5 }}>{slot.short}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Export time slots for use in filtering
export { TIME_SLOTS };
