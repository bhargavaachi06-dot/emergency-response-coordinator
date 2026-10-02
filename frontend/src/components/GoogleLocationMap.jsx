import { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsApi, isGoogleMapsConfigured } from '../services/locationService';
import './GoogleLocationMap.css';

// Module-level marker type config (no window.google dependency)
const MARKER_TYPE_MAP = {
  emergency: { color: '#dc2626', emoji: '\ud83d\udea8' },
  ambulance: { color: '#16a34a', emoji: '\ud83d\ude91' },
  police:    { color: '#1d4ed8', emoji: '\ud83d\udc6e' },
  helper:    { color: '#d97706', emoji: '\ud83e\udd1d' },
};

function buildInfoWindowContent(m) {
  return `<div style="font-family:Inter,sans-serif;min-width:130px;padding:4px">
    <div style="font-weight:700;font-size:13px;margin-bottom:4px">${m.label || ''}</div>
    ${m.status ? `<div style="font-size:11.5px;color:#64748b;text-transform:capitalize">Status: ${m.status}</div>` : ''}
    ${m.eta ? `<div style="font-size:11.5px;color:#64748b">ETA: ${m.eta}</div>` : ''}
    ${m.formattedAddress ? `<div style="font-size:11.5px;color:#64748b;margin-top:4px">${m.formattedAddress}</div>` : ''}
  </div>`;
}

/**
 * GoogleLocationMap — Reusable Google Maps component.
 *
 * Props:
 *   latitude      {number|null}   - Center latitude
 *   longitude     {number|null}   - Center longitude
 *   markers       {Array}         - [{lat, lng, title, type, label, status}]
 *   height        {number|string} - Map height (default 320)
 *   zoom          {number}        - Default zoom level (default 15)
 *   showInfoBar   {boolean}       - Show coordinates bar below map (default true)
 *   onMarkerDrop  {Function}      - Called with {lat, lng} when user drops marker
 *   draggable     {boolean}       - Allow user to drag the primary marker (default false)
 *   showNoLocationState {boolean} - Show placeholder when no location (default true)
 *   className     {string}        - Extra CSS classes for container
 */
export default function GoogleLocationMap({
  latitude = null,
  longitude = null,
  markers = [],
  height = 320,
  zoom = 15,
  showInfoBar = true,
  onMarkerDrop = null,
  draggable = false,
  showNoLocationState = true,
  className = '',
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const primaryMarkerRef = useRef(null);

  const [loadState, setLoadState] = useState(() => {
    // Determine initial state synchronously to avoid cascading render
    if (!isGoogleMapsConfigured()) return 'error';
    if (window.google?.maps) return 'ready';
    return 'idle';
  });
  const [loadError, setLoadError] = useState(() => {
    if (!isGoogleMapsConfigured()) {
      return 'Google Maps API key is not configured. Add VITE_GOOGLE_MAPS_API_KEY to your .env file.';
    }
    return '';
  });

  const hasLocation = typeof latitude === 'number' && !isNaN(latitude) &&
                      typeof longitude === 'number' && !isNaN(longitude);

  // Load Google Maps API on mount (async — no synchronous setState)
  useEffect(() => {
    // Already resolved by lazy initializer
    if (loadState === 'error' || loadState === 'ready') return;

    // Async state transition — set loading after microtask to avoid sync setState
    const timer = setTimeout(() => setLoadState('loading'), 0);

    loadGoogleMapsApi()
      .then(() => {
        clearTimeout(timer);
        setLoadState('ready');
      })
      .catch((err) => {
        clearTimeout(timer);
        setLoadState('error');
        setLoadError(err.message || 'Failed to load Google Maps.');
      });

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize map when API ready and element mounted
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const center = hasLocation
      ? { lat: latitude, lng: longitude }
      : { lat: 20.5937, lng: 78.9629 }; // India center as neutral fallback (not Delhi)

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: hasLocation ? zoom : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;
  }, [loadState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map center and markers when location/markers change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || loadState !== 'ready') return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (primaryMarkerRef.current) {
      primaryMarkerRef.current.setMap(null);
      primaryMarkerRef.current = null;
    }

    if (hasLocation) {
      const center = { lat: latitude, lng: longitude };
      map.panTo(center);
      if (map.getZoom() < zoom) map.setZoom(zoom);

      // Primary marker (the main location)
      const primary = new window.google.maps.Marker({
        position: center,
        map,
        title: 'Emergency Location',
        draggable: Boolean(draggable),
        icon: makePinIcon('#dc2626', '📍'),
      });

      primaryMarkerRef.current = primary;

      // If draggable, fire onMarkerDrop when user finishes dragging
      if (draggable && onMarkerDrop) {
        primary.addListener('dragend', (e) => {
          onMarkerDrop({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      }

      // Additional markers
      (markers || []).forEach((m) => {
        if (!m || isNaN(m.lat) || isNaN(m.lng)) return;
        const icon = getMarkerIcon(m.type);
        const marker = new window.google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.label || m.title || '',
          icon,
        });

        if (m.label || m.status || m.eta) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: buildInfoWindowContent(m),
          });
          marker.addListener('click', () => infoWindow.open(map, marker));
        }

        markersRef.current.push(marker);
      });
    }
  }, [latitude, longitude, markers, loadState, hasLocation, zoom, draggable, onMarkerDrop]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers (makePinIcon/getMarkerIcon need window.google so stay inside component) ───
  function makePinIcon(color, emoji) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 30 18 30S36 30.6 36 18C36 8.06 27.94 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="23" text-anchor="middle" font-size="14">${emoji}</text>
    </svg>`;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(36, 42),
      anchor: new window.google.maps.Point(18, 42),
    };
  }

  function getMarkerIcon(type) {
    const cfg = MARKER_TYPE_MAP[type] || MARKER_TYPE_MAP.emergency;
    return makePinIcon(cfg.color, cfg.emoji);
  }

  // ─── Render ───────────────────────────────────────────────────
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (loadState === 'error') {
    return (
      <div className={`glm-container ${className}`} style={containerStyle}>
        <div className="glm-state glm-no-location" style={containerStyle}>
          <div className="glm-error-card">
            <i className="bi bi-exclamation-triangle-fill glm-error-icon" />
            <span>{loadError}</span>
          </div>
          <p className="glm-state-sub">
            You can still enter your location manually in the address fields below.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className={`glm-container ${className}`} style={containerStyle}>
        <div className="glm-state" style={containerStyle}>
          <div className="glm-spinner" />
          <p className="glm-state-title">Loading Map…</p>
          <p className="glm-state-sub">Initializing Google Maps</p>
        </div>
      </div>
    );
  }

  if (loadState === 'ready' && !hasLocation && showNoLocationState) {
    return (
      <div className={`glm-container ${className}`} style={containerStyle}>
        <div className="glm-state glm-no-location" style={containerStyle}>
          <div className="glm-state-icon">📍</div>
          <p className="glm-state-title">Location not available</p>
          <p className="glm-state-sub">
            Use the "Use My Location" button to detect your GPS position, or enter your address manually below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glm-container ${className}`}>
      <div
        ref={mapRef}
        className="glm-map-canvas"
        style={containerStyle}
        aria-label="Emergency location map"
        role="application"
      />
      {showInfoBar && hasLocation && (
        <div className="glm-info-bar">
          <i className="bi bi-geo-alt-fill" aria-hidden="true" />
          <span className="glm-info-coords" dir="ltr">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
