import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { DISTRICTS } from '../data/complaintsData';

// Karnataka centroid and default zoom
const KARNATAKA_CENTER = { lat: 14.85, lng: 76.1 };
const KARNATAKA_ZOOM = 7;

// Cloud-based Map ID (dark style configured in Google Cloud Console)
const CLOUD_MAP_ID = '4b73d3c8b67d96f076d1e749';

/* ─────────────────────────────────────────────────────────────
   GeoJSON district name → seed data district name mapping
   (the GeoJSON uses older spellings)
───────────────────────────────────────────────────────────── */
const DISTRICT_NAME_MAP = {
  'Bagalkot':        'Bagalkot',
  'Bangalore Rural': 'Bengaluru Rural',
  'Bangalore Urban': 'Bengaluru Urban',
  'Belgaum':         'Belagavi',
  'Bellary':         'Ballari',
  'Bidar':           'Bidar',
  'Bijapur':         'Vijayapura',
  'Chamrajnagar':    'Chamarajanagara',
  'Chikmagalur':     'Chikkamagaluru',
  'Chitradurga':     'Chitradurga',
  'Dakshin Kannad':  'Dakshina Kannada',
  'Davanagere':      'Davangere',
  'Dharwad':         'Dharwad',
  'Gadag':           'Gadag',
  'Gulbarga':        'Kalaburagi',
  'Hassan':          'Hassan',
  'Haveri':          'Haveri',
  'Kodagu':          'Kodagu',
  'Kolar':           'Kolar',
  'Koppal':          'Koppal',
  'Mandya':          'Mandya',
  'Mysore':          'Mysuru',
  'Raichur':         'Raichur',
  'Shimoga':         'Shivamogga',
  'Tumkur':          'Tumakuru',
  'Udupi':           'Udupi',
  'Uttar Kannand':   'Uttara Kannada',
};

/* ─── Status & Crime Type color maps ─────────────────────── */
const STATUS_COLORS = {
  'Open':                '#ef5350',
  'Under Investigation': '#ff9800',
  'Closed':              '#66bb6a',
};

const CRIME_TYPE_COLORS = {
  'Chain Snatching':     '#ef5350',
  'Cyber Crime':         '#42a5f5',
  'Drug Trafficking':    '#ab47bc',
  'Burglary':            '#ff7043',
  'Financial Fraud':     '#ffd54f',
  'Theft':               '#78909c',
  'Assault':             '#e53935',
  'Robbery':             '#ff9800',
  'Domestic Violence':   '#ec407a',
  'Extortion':           '#7e57c2',
  'Smuggling':           '#26a69a',
};

/* ─── Severity color ramp (1=low → 5=critical) ──────────── */
const SEVERITY_COLORS = [
  '#66bb6a', // 1
  '#ffd54f', // 2
  '#ff9800', // 3
  '#ff5722', // 4
  '#e53935', // 5
];

const SEVERITY_SIZES = [6, 9, 13, 18, 24]; // pixel radius per severity

/* ─────────────────────────────────────────────────────────────
   Singleton loader
───────────────────────────────────────────────────────────── */
let loaderInstance = null;
function getLoader(apiKey) {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'marker'],
      mapIds: [CLOUD_MAP_ID],
    });
  }
  return loaderInstance;
}

/* ─── Custom Canvas Heatmap Overlay ──────────────────────── */
function createHeatmapOverlay(map, points, options = {}) {
  const { radius = 30, opacity = 0.75, maxIntensity = 8 } = options;

  // Gradient colors (blue → cyan → green → yellow → red)
  const GRADIENT = [
    [0, 0, 255],     // blue
    [0, 255, 255],   // cyan
    [0, 255, 0],     // green
    [255, 255, 0],   // yellow
    [255, 128, 0],   // orange
    [255, 0, 0],     // red
  ];

  function getColor(value) {
    const v = Math.min(1, Math.max(0, value));
    const idx = v * (GRADIENT.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.min(GRADIENT.length - 1, lower + 1);
    const t = idx - lower;
    return [
      Math.round(GRADIENT[lower][0] + t * (GRADIENT[upper][0] - GRADIENT[lower][0])),
      Math.round(GRADIENT[lower][1] + t * (GRADIENT[upper][1] - GRADIENT[lower][1])),
      Math.round(GRADIENT[lower][2] + t * (GRADIENT[upper][2] - GRADIENT[lower][2])),
    ];
  }

  class HeatOverlay extends google.maps.OverlayView {
    constructor() {
      super();
      this.canvas = null;
      this.setMap(map);
    }

    onAdd() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      const panes = this.getPanes();
      panes.overlayLayer.appendChild(this.canvas);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.canvas) return;

      const bounds = map.getBounds();
      if (!bounds) return;

      const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
      const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
      const w = ne.x - sw.x;
      const h = sw.y - ne.y;

      this.canvas.style.left = sw.x + 'px';
      this.canvas.style.top = ne.y + 'px';
      this.canvas.width = w;
      this.canvas.height = h;

      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      // Step 1: Draw intensity in grayscale
      const intensityCanvas = document.createElement('canvas');
      intensityCanvas.width = w;
      intensityCanvas.height = h;
      const ictx = intensityCanvas.getContext('2d');

      points.forEach(pt => {
        const pixel = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(pt.lat, pt.lng)
        );
        const x = pixel.x - sw.x;
        const y = pixel.y - ne.y;

        const grad = ictx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ictx.globalAlpha = (pt.weight || 1) / maxIntensity;
        ictx.fillStyle = grad;
        ictx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });

      // Step 2: Colorize based on intensity
      const imgData = ictx.getImageData(0, 0, w, h);
      const pixels = imgData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const intensity = pixels[i + 3] / 255; // alpha = intensity
        if (intensity > 0.01) {
          const [r, g, b] = getColor(intensity);
          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
          pixels[i + 3] = Math.round(intensity * opacity * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    onRemove() {
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
    }

    remove() {
      this.setMap(null);
    }
  }

  return new HeatOverlay();
}



/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const KEY_MISSING = !API_KEY || API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

function getDeterministicJitter(id, seed) {
  let h = 0;
  const str = String(id || '') + seed;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (Math.abs(h) / 2147483647) - 0.5;
}

export default function CrimeHeatmap({
  incidents = [],
  showDistricts = true,
  onDistrictSelect,
  selectedDistrict,
  vizMode = 'markers',       // 'markers' | 'heatmap' | 'severity'
  showOpenOnly = false,
  showCrimeTypeColoring = false,
  timeFilter = null,         // null | { range: [start, end] }
  onIncidentClick,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false);

  // Refs for layers so we can toggle them without re-creating the map
  const districtDataRef = useRef(null);
  const selectedFeatureRef = useRef(null);

  // Marker & layer refs
  const markersRef = useRef([]);
  const heatmapLayerRef = useRef(null);
  const severityMarkersRef = useRef([]);
  const searchInputRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const toggleSatellite = () => {
    setIsSatellite(prev => {
      const next = !prev;
      if (mapRef.current) {
        mapRef.current.setMapTypeId(next ? 'hybrid' : 'roadmap');
      }
      return next;
    });
  };

  /* ── Map initialization ─────────────────────────────────── */
  useEffect(() => {
    if (KEY_MISSING || !mapContainer.current) return;
    if (mapRef.current && mapRef.current.getDiv() === mapContainer.current) return;

    let cancelled = false;

    (async () => {
      try {
        const loader = getLoader(API_KEY);
        const { Map } = await loader.importLibrary('maps');

        if (cancelled || !mapContainer.current) return;

        const map = new Map(mapContainer.current, {
          center: KARNATAKA_CENTER,
          zoom: KARNATAKA_ZOOM,
          mapId: CLOUD_MAP_ID,
          colorScheme: 'DARK',
          disableDefaultUI: true,
          zoomControl: true,
          scaleControl: true,
          gestureHandling: 'greedy',
        });

        mapRef.current = map;

        map.addListener('tilesloaded', function onFirstLoad() {
          if (!cancelled) setMapReady(true);
          google.maps.event.removeListener(onFirstLoad);
        });

        setTimeout(() => {
          if (!cancelled) setMapReady(true);
        }, 3000);
      } catch (err) {
        if (cancelled) return;
        console.error('[CrimeHeatmap] Google Maps load error:', err);
        setLoadError(err?.message || 'Failed to load Google Maps');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ── Place search initialization ────────────────────────── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !searchInputRef.current) return;
    
    let cancelled = false;

    (async () => {
      try {
        const loader = getLoader(API_KEY);
        const { Autocomplete } = await loader.importLibrary('places');
        const { AdvancedMarkerElement } = await loader.importLibrary('marker');
        if (cancelled) return;

        const map = mapRef.current;
        const autocomplete = new Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['geometry', 'name'],
        });

        autocomplete.bindTo('bounds', map);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
          }

          if (searchMarkerRef.current) {
            searchMarkerRef.current.map = null;
          }

          const pin = document.createElement('div');
          pin.innerHTML = '<span class="material-icons" style="color: #42a5f5; font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">location_on</span>';
          
          searchMarkerRef.current = new AdvancedMarkerElement({
            map,
            position: place.geometry.location,
            content: pin,
            title: place.name,
          });
        });
      } catch (err) {
        console.error('[CrimeHeatmap] Autocomplete load error:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady]);

  /* ── Filter incidents based on overlay toggles ──────────── */
  const filteredIncidents = useMemo(() => {
    let filtered = incidents;

    // Open cases only
    if (showOpenOnly) {
      filtered = filtered.filter(i => i.status === 'Open');
    }

    // Time filter
    if (timeFilter) {
      const [start, end] = timeFilter.range;
      filtered = filtered.filter(i => {
        const h = new Date(i.occurred_at).getHours();
        return h >= start && h < end;
      });
    }

    return filtered;
  }, [incidents, showOpenOnly, timeFilter]);


  /* ── Clear all visualization layers ─────────────────────── */
  const clearVizLayers = () => {
    // Clear markers
    markersRef.current.forEach(m => m.map = null);
    markersRef.current = [];

    // Clear heatmap overlay
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.remove();
      heatmapLayerRef.current = null;
    }

    // Clear severity markers
    severityMarkersRef.current.forEach(m => m.map = null);
    severityMarkersRef.current = [];
  };


  /* ── Visualization mode rendering ──────────────────────── */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    let cancelled = false;
    const map = mapRef.current;
    clearVizLayers();

    const renderViz = async () => {
      if (vizMode === 'markers') {
        // Individual incident markers colored by status or crime type
        filteredIncidents.forEach(incident => {
          if (cancelled) return;
          
          let lat = incident.latitude;
          let lng = incident.longitude;
          
          if (!lat || !lng) {
            const dist = DISTRICTS.find(d => d.name === incident.district);
            if (dist) {
              // Add jitter so fallback points don't completely overlap
              lat = dist.latitude + getDeterministicJitter(incident.id, 'lat') * 0.05;
              lng = dist.longitude + getDeterministicJitter(incident.id, 'lng') * 0.05;
            } else {
              return;
            }
          }

          const color = showCrimeTypeColoring
            ? (CRIME_TYPE_COLORS[incident.crime_type] || '#78909c')
            : (STATUS_COLORS[incident.status] || '#78909c');

          const dot = document.createElement('div');
          dot.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%;
            background: ${color};
            border: 1.5px solid rgba(0,0,0,0.4);
            box-shadow: 0 0 6px ${color}44;
            transition: transform 0.15s ease;
            cursor: pointer;
          `;
          dot.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.8)'; });
          dot.addEventListener('mouseleave', () => { dot.style.transform = 'scale(1)'; });

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat, lng },
            content: dot,
            title: `${incident.crime_type} — ${incident.status}`,
          });

          marker.addListener('click', () => {
            if (onIncidentClick) onIncidentClick(incident);
          });

          markersRef.current.push(marker);
        });

      } else if (vizMode === 'heatmap') {
        // Custom canvas-based heatmap (no dependency on deprecated visualization lib)
        const heatPoints = filteredIncidents
          .map(i => {
            let lat = i.latitude;
            let lng = i.longitude;
            if (!lat || !lng) {
              const dist = DISTRICTS.find(d => d.name === i.district);
              if (dist) {
                lat = dist.latitude + getDeterministicJitter(i.id, 'lat') * 0.05;
                lng = dist.longitude + getDeterministicJitter(i.id, 'lng') * 0.05;
              }
            }
            return { lat, lng, weight: i.severity || 1 };
          })
          .filter(pt => pt.lat && pt.lng);

        if (heatPoints.length === 0) return;

        const overlay = createHeatmapOverlay(map, heatPoints, {
          radius: 30,
          opacity: 0.8,
          maxIntensity: 6,
        });

        heatmapLayerRef.current = overlay;

      } else if (vizMode === 'severity') {
        // Circles sized and colored by severity
        filteredIncidents.forEach(incident => {
          if (cancelled) return;
          
          let lat = incident.latitude;
          let lng = incident.longitude;
          
          if (!lat || !lng) {
            const dist = DISTRICTS.find(d => d.name === incident.district);
            if (dist) {
              lat = dist.latitude + getDeterministicJitter(incident.id, 'lat') * 0.05;
              lng = dist.longitude + getDeterministicJitter(incident.id, 'lng') * 0.05;
            } else {
              return;
            }
          }

          const sev = Math.max(1, Math.min(5, incident.severity || 1));
          const color = SEVERITY_COLORS[sev - 1];
          const size = SEVERITY_SIZES[sev - 1];

          const circle = document.createElement('div');
          circle.style.cssText = `
            width: ${size}px; height: ${size}px; border-radius: 50%;
            background: ${color}99;
            border: 1.5px solid ${color};
            box-shadow: 0 0 ${size / 2}px ${color}55;
            transition: transform 0.15s ease;
            cursor: pointer;
          `;
          circle.addEventListener('mouseenter', () => { circle.style.transform = 'scale(1.5)'; });
          circle.addEventListener('mouseleave', () => { circle.style.transform = 'scale(1)'; });

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat, lng },
            content: circle,
            title: `Severity ${sev} — ${incident.crime_type}`,
          });

          marker.addListener('click', () => {
            if (onIncidentClick) onIncidentClick(incident);
          });

          severityMarkersRef.current.push(marker);
        });
      }
    };

    renderViz();

    // Cleanup on unmount or re-render
    return () => {
      cancelled = true;
      clearVizLayers();
    };
  }, [mapReady, vizMode, filteredIncidents, showCrimeTypeColoring]);


  /* ── District polygons ──────────────────────────────────── */
  const districtListenersRef = useRef(false);
  const districtCountsRef = useRef({});
  const maxCountRef = useRef(1);

  const districtCounts = useMemo(() => {
    const counts = {};
    filteredIncidents.forEach(i => {
      if (i.district) {
        counts[i.district] = (counts[i.district] || 0) + 1;
      }
    });
    return counts;
  }, [filteredIncidents]);

  useEffect(() => {
    districtCountsRef.current = districtCounts;
    maxCountRef.current = Math.max(1, ...Object.values(districtCounts));
  }, [districtCounts]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    // If districts are toggled off, hide via style
    if (!showDistricts) {
      if (districtDataRef.current) {
        map.data.setStyle({ visible: false });
      }
      return;
    }

    const getStyle = (feature) => {
      const geoName = feature.getProperty('NAME_2');
      const mappedName = DISTRICT_NAME_MAP[geoName] || geoName;
      const isSelected = mappedName === selectedDistrict;

      return {
        visible: true,
        fillColor: '#ffffff',
        fillOpacity: isSelected ? 0.08 : 0.02,
        strokeColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
        strokeWeight: isSelected ? 1.5 : 0.6,
        cursor: 'pointer',
      };
    };

    // If already loaded, just update styles
    if (districtDataRef.current) {
      map.data.setStyle(getStyle);
    } else {
      // Load GeoJSON for the first time
      map.data.loadGeoJson('/karnataka-districts.json', null, (features) => {
        districtDataRef.current = features;
        map.data.setStyle(getStyle);
      });
    }

    // Only attach event listeners once
    if (!districtListenersRef.current) {
      districtListenersRef.current = true;

      // Hover effects
      map.data.addListener('mouseover', (e) => {
        map.data.overrideStyle(e.feature, {
          fillOpacity: 0.06,
          strokeColor: 'rgba(255,255,255,0.3)',
          strokeWeight: 1.2,
        });
      });

      map.data.addListener('mouseout', (e) => {
        map.data.revertStyle(e.feature);
      });

      // Click to select district
      map.data.addListener('click', (e) => {
        const geoName = e.feature.getProperty('NAME_2');
        const mappedName = DISTRICT_NAME_MAP[geoName] || geoName;

        // Revert previous selection
        if (selectedFeatureRef.current) {
          map.data.revertStyle(selectedFeatureRef.current);
        }

        selectedFeatureRef.current = e.feature;
        map.data.overrideStyle(e.feature, {
          fillOpacity: 0.08, // Base fallback, effect handled by re-render
          strokeColor: 'rgba(255,255,255,0.4)',
          strokeWeight: 1.5,
        });

        if (onDistrictSelect) {
          onDistrictSelect(mappedName);
        }
      });
    }

  }, [mapReady, showDistricts, selectedDistrict, districtCounts, onDistrictSelect]);



  /* ── Render ─────────────────────────────────────────────── */
  if (KEY_MISSING) {
    return (
      <div style={{
        width: '100%', height: '100%', minHeight: 400,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, color: 'var(--text-muted)',
      }}>
        <span className="material-icons" style={{ fontSize: 40, color: 'var(--text-muted)' }}>map</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Google Maps API Key Required
        </div>
        <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          Add <code style={{ color: 'var(--text-secondary)', background: 'var(--elevation-3)', padding: '1px 5px', borderRadius: 3 }}>VITE_GOOGLE_MAPS_API_KEY</code> to your <code style={{ color: 'var(--text-secondary)', background: 'var(--elevation-3)', padding: '1px 5px', borderRadius: 3 }}>.env</code> and restart.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        width: '100%', height: '100%', minHeight: 400,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255,45,85,0.25)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, color: 'var(--text-muted)',
      }}>
        <span className="material-icons" style={{ fontSize: 36, color: '#ff2d55' }}>error_outline</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#ff2d55' }}>Map Failed to Load</div>
        <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 320, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          {loadError}. Check that your API key is valid, billing is enabled, and the Maps JavaScript API is enabled in Google Cloud Console.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* Search Bar Above Map */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: 'var(--elevation-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
        zIndex: 30,
      }}>
        <span className="material-icons" style={{ fontSize: 20, color: 'var(--text-muted)' }}>search</span>
        <input 
          ref={searchInputRef}
          type="text"
          placeholder="Search location..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            width: '100%',
          }}
        />
      </div>

      <div style={{ position: 'relative', flex: 1, borderRadius: 'var(--radius-lg)', minHeight: 0, overflow: 'hidden' }}>
        <div
          ref={mapContainer}
          style={{ width: '100%', height: '100%' }}
        />

        {mapReady && (
          <button
            onClick={toggleSatellite}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
            zIndex: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--elevation-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
        >
          <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>
            {isSatellite ? 'map' : 'satellite'}
          </span>
          {isSatellite ? 'Default Map' : 'Satellite Map'}
        </button>
      )}

        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 'inherit',
            background: 'var(--elevation-1)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, color: 'var(--text-muted)', fontSize: 13,
            zIndex: 20,
          }}>
            <div className="spinner" />
            <span>Loading map…</span>
          </div>
        )}
      </div>
    </div>
  );
}
