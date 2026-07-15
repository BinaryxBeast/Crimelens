import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const CLOUD_MAP_ID = '4b73d3c8b67d96f076d1e749';
const KARNATAKA_CENTER = { lat: 14.85, lng: 76.1 };
const KARNATAKA_ZOOM = 7;

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

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function LocationPickerMap({ lat, lng, onChange }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false);

  const toggleSatellite = () => {
    setIsSatellite(prev => {
      const next = !prev;
      if (mapRef.current) {
        mapRef.current.setMapTypeId(next ? 'hybrid' : 'roadmap');
      }
      return next;
    });
  };

  useEffect(() => {
    if (!API_KEY || API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE' || !mapContainer.current) return;
    if (mapRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const loader = getLoader(API_KEY);
        const { Map } = await loader.importLibrary('maps');
        
        if (cancelled || !mapContainer.current) return;

        const initialCenter = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : KARNATAKA_CENTER;
        const initialZoom = lat && lng ? 14 : KARNATAKA_ZOOM;

        const map = new Map(mapContainer.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapId: CLOUD_MAP_ID,
          colorScheme: 'DARK',
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: 'greedy',
        });
        
        mapRef.current = map;

        map.addListener('click', (e) => {
          const clickedLat = e.latLng.lat();
          const clickedLng = e.latLng.lng();
          if (onChange) {
            onChange(clickedLat.toFixed(6), clickedLng.toFixed(6));
          }
        });

        setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('Location picker map error:', err);
          setLoadError(err?.message || 'Failed to load map');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!mapReady || !mapRef.current || !searchInputRef.current) return;
    
    let cancelled = false;

    (async () => {
      try {
        const loader = getLoader(API_KEY);
        const { Autocomplete } = await loader.importLibrary('places');
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

          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();

          if (onChange) {
            onChange(newLat.toFixed(6), newLng.toFixed(6));
          }

          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
          }
        });
      } catch (err) {
        console.error('[LocationPickerMap] Autocomplete load error:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, onChange]);

  // Update marker when lat/lng change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const currentLat = parseFloat(lat);
    const currentLng = parseFloat(lng);
    
    if (isNaN(currentLat) || isNaN(currentLng)) {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const pin = document.createElement('div');
      pin.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: #ef5350;
        border: 2px solid white;
        box-shadow: 0 0 8px rgba(239,83,80,0.8);
      `;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: currentLat, lng: currentLng },
        content: pin,
      });
    } else {
      markerRef.current.position = { lat: currentLat, lng: currentLng };
    }
    
    // Pan to location if it exists
    mapRef.current.panTo({ lat: currentLat, lng: currentLng });
    
  }, [lat, lng, mapReady]);

  if (!API_KEY || API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-md)', background: 'var(--elevation-1)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Google Maps API Key Required
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-md)', background: 'var(--elevation-1)', border: '1px solid rgba(255,45,85,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff2d55', fontSize: 13 }}>
        Map Load Error: {loadError}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '250px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', marginTop: '8px' }}>
      
      {mapReady && (
        <button
          type="button"
          onClick={toggleSatellite}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--elevation-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
        >
          <span className="material-icons" style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            {isSatellite ? 'map' : 'satellite'}
          </span>
          {isSatellite ? 'Map' : 'Satellite'}
        </button>
      )}

      {/* Search Bar */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        background: 'var(--elevation-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 12px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '250px',
        maxWidth: 'calc(100% - 20px)'
      }}>
        <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-muted)' }}>search</span>
        <input 
          ref={searchInputRef}
          type="text"
          placeholder="Search location..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13,
            width: '100%',
          }}
        />
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--elevation-1)', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ marginRight: 8, width: 16, height: 16, borderWidth: 2 }} /> Loading map...
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 11, pointerEvents: 'none', zIndex: 10 }}>
        Click anywhere on the map to set location
      </div>
    </div>
  );
}
