import { useState, useRef } from 'react';
import NetworkGraph from '../components/NetworkGraph';

export default function NetworkPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [searchMeta, setSearchMeta] = useState({ total: 0, current: 0 });
  const graphRef = useRef();

  const handleSearch = (direction = 0) => {
    if (!searchTerm.trim()) {
      setNotFound(false);
      setSearchMeta({ total: 0, current: 0 });
      if (graphRef.current?.clearHover) graphRef.current.clearHover();
      return;
    }
    if (graphRef.current) {
      const res = graphRef.current.searchNode(searchTerm, direction);
      if (res.total > 0) {
        setNotFound(false);
        setSearchMeta(res);
      } else {
        setNotFound(true);
        setSearchMeta({ total: 0, current: 0 });
      }
    }
  };

  return (
    <div className="page-container net-page">

      {/* ── Page header ── */}
      <div className="net-page-header">
        <div className="net-page-title-group">
          <div className="net-page-icon">
            <span className="material-icons">hub</span>
          </div>
          <div>
            <h1 className="net-page-title">Criminal Network Analysis</h1>
            <p className="net-page-sub">Force-directed physics graph · drag sliders to tune forces · click nodes to inspect</p>
          </div>
        </div>

        {/* Offender search pill */}
        <div className="net-search-pill">
          <span className="material-icons-outlined" style={{ fontSize: 17, color: 'var(--text-muted)' }}>person_search</span>
          <input
            className="net-search-input"
            placeholder="Search network..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setNotFound(false);
              setSearchMeta({ total: 0, current: 0 });
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(1);
              }
            }}
          />
          {searchMeta.total > 1 && (
             <div className="net-search-nav" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', color: '#aaaab3' }}>
                <span style={{ fontSize: 12 }}>{searchMeta.current}/{searchMeta.total}</span>
                <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }} onClick={() => handleSearch(-1)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }} onClick={() => handleSearch(1)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
             </div>
          )}
          <button className="net-search-btn" onClick={() => handleSearch(1)}>
            <span className="material-icons" style={{ fontSize: 15 }}>search</span>
          </button>
        </div>
      </div>

      {/* Offender results strip */}
      {notFound && (
        <div className="net-no-result">No nodes found matching "{searchTerm}"</div>
      )}

      {/* ── 2D graph card ── */}
      <div className="net-graph-card">
        <NetworkGraph ref={graphRef} height={Math.max(560, window.innerHeight - 300)} />
      </div>
    </div>
  );
}
