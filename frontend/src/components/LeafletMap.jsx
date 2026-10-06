import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import './LeafletMap.css';

// =====================================================
// Marker Categories & Visual Configurations
// =====================================================
const CATEGORY_MAP = {
  medical:          { color: '#DC2626', emoji: '🚑', label: 'Medical' },
  health:           { color: '#DC2626', emoji: '🚑', label: 'Medical' },
  cardiac:          { color: '#DC2626', emoji: '🚑', label: 'Medical' },
  road_accident:    { color: '#EA580C', emoji: '🚗', label: 'Road Accident' },
  accident:         { color: '#EA580C', emoji: '🚗', label: 'Road Accident' },
  traffic:          { color: '#EA580C', emoji: '🚗', label: 'Road Accident' },
  crash:            { color: '#EA580C', emoji: '🚗', label: 'Road Accident' },
  fire:             { color: '#F59E0B', emoji: '🔥', label: 'Fire' },
  explosion:        { color: '#F59E0B', emoji: '🔥', label: 'Fire & Explosion' },
  gas:              { color: '#F59E0B', emoji: '🔥', label: 'Gas Leak' },
  crime:            { color: '#1D4ED8', emoji: '🛡️', label: 'Crime / Safety' },
  safety:           { color: '#1D4ED8', emoji: '🛡️', label: 'Crime / Safety' },
  theft:            { color: '#1D4ED8', emoji: '🛡️', label: 'Security' },
  assault:          { color: '#1D4ED8', emoji: '🛡️', label: 'Security' },
  natural_disaster: { color: '#0284C7', emoji: '🌊', label: 'Natural Disaster' },
  flood:            { color: '#0284C7', emoji: '🌊', label: 'Flood / Disaster' },
  weather:          { color: '#0284C7', emoji: '🌊', label: 'Severe Weather' },
  storm:            { color: '#0284C7', emoji: '🌊', label: 'Storm' },
  ambulance:        { color: '#16A34A', emoji: '🚑', label: 'Ambulance' },
  police:           { color: '#1D4ED8', emoji: '👮', label: 'Police' },
  helper:           { color: '#D97706', emoji: '🤝', label: 'Helper' },
  emergency:        { color: '#DC2626', emoji: '🚨', label: 'Emergency' },
  other:            { color: '#64748B', emoji: '❓', label: 'Incident' },
};

function getCategoryMeta(type = '') {
  const normalized = String(type).toLowerCase().replace(/[-\s]/g, '_');
  for (const [key, meta] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key)) return meta;
  }
  return CATEGORY_MAP.other;
}

/**
 * Creates custom DivIcon to prevent broken default Leaflet image paths in Vite builds
 */
function createCustomPin(color = '#DC2626', emoji = '📍', isSelected = false) {
  const strokeColor = isSelected ? '#38BDF8' : '#FFFFFF';
  const strokeWidth = isSelected ? 3 : 2;
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';

  const html = `
    <div class="custom-pin-root" style="transform: ${scale};">
      <div class="custom-pin-svg-wrap">
        <svg class="custom-pin-svg" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 30 18 30S36 30.6 36 18C36 8.06 27.94 0 18 0z"
                fill="${color}"
                stroke="${strokeColor}"
                stroke-width="${strokeWidth}"/>
        </svg>
        <span class="custom-pin-emoji">${emoji}</span>
      </div>
      <div class="custom-pin-pulse" style="background: ${color}66;"></div>
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-custom-marker',
    html,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42],
  });
}

/**
 * Subcomponent to handle click-to-pick coordinates
 */
function MapClickHandler({ onLocationSelect, active }) {
  useMapEvents({
    click(e) {
      if (!active || !onLocationSelect) return;
      onLocationSelect({
        lat: Number(e.latlng.lat),
        lng: Number(e.latlng.lng),
      });
    },
  });
  return null;
}

/**
 * Subcomponent to synchronize map viewport, center, and bounds
 */
function MapViewportController({ centerCoords, markers, zoom }) {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    // Invalidate size on initial mount and when dimensions change
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // map might be unmounting
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    const validMarkers = (Array.isArray(markers) ? markers : []).filter(
      (m) => m && typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)
    );

    // Case 1: Multiple markers -> Auto-fit bounds
    if (validMarkers.length > 1) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      return;
    }

    // Case 2: Specific center coordinate provided
    if (centerCoords) {
      const [cLat, cLng] = centerCoords;
      const prev = prevCenterRef.current;
      const hasChanged = !prev || Math.abs(prev[0] - cLat) > 0.0001 || Math.abs(prev[1] - cLng) > 0.0001;

      if (hasChanged) {
        map.setView([cLat, cLng], zoom || 15, { animate: true });
        prevCenterRef.current = [cLat, cLng];
      }
      return;
    }

    // Case 3: Exactly one marker
    if (validMarkers.length === 1) {
      map.setView([validMarkers[0].lat, validMarkers[0].lng], zoom || 15, { animate: true });
    }
  }, [map, centerCoords, markers, zoom]);

  return null;
}

/**
 * LeafletMap — Primary OpenStreetMap + Leaflet Component
 *
 * Props:
 *   latitude            {number|null}   - Primary pin latitude
 *   longitude           {number|null}   - Primary pin longitude
 *   center              {Array|object}  - [lat, lng] or {lat, lng}
 *   zoom                {number}        - Default zoom level (default 15)
 *   markers             {Array}         - [{lat, lng, type, label, title, status, eta, formattedAddress, id, category, severity, createdAt}]
 *   height              {number|string} - Map height (default 350, min 350px)
 *   showInfoBar         {boolean}       - Show coordinates bar below map (default true)
 *   onMarkerDrop        {Function}      - Called with {lat, lng} when user clicks map or drops marker
 *   draggable           {boolean}       - Enable dragging primary marker / clicking map to select location
 *   interactive         {boolean}       - Enable clicking map to pick coords
 *   showNoLocationState {boolean}       - Show overlay banner when no location selected
 *   className           {string}        - Extra CSS class
 */
export default function LeafletMap({
  latitude = null,
  longitude = null,
  center = null,
  zoom = 15,
  markers = [],
  height = 350,
  showInfoBar = true,
  onMarkerDrop = null,
  draggable = false,
  interactive = false,
  showNoLocationState = false,
  className = '',
}) {
  // Resolve latitude and longitude
  const resolvedLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude :
                      Array.isArray(center) && typeof center[0] === 'number' && !isNaN(center[0]) ? center[0] :
                      center && typeof center.lat === 'number' && !isNaN(center.lat) ? center.lat : null;

  const resolvedLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude :
                      Array.isArray(center) && typeof center[1] === 'number' && !isNaN(center[1]) ? center[1] :
                      center && typeof center.lng === 'number' && !isNaN(center.lng) ? center.lng : null;

  const hasPrimaryLocation = resolvedLat !== null && resolvedLng !== null;

  const validMarkers = useMemo(() => {
    return (Array.isArray(markers) ? markers : []).filter(
      (m) => m && typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)
    );
  }, [markers]);

  // Initial center fallback: Primary -> First marker -> Neutral India centroid
  const initialCenter = useMemo(() => {
    if (hasPrimaryLocation) return [resolvedLat, resolvedLng];
    if (validMarkers.length > 0) return [validMarkers[0].lat, validMarkers[0].lng];
    return [20.5937, 78.9629]; // Geographic centroid of India
  }, [hasPrimaryLocation, resolvedLat, resolvedLng, validMarkers]);

  const initialZoom = hasPrimaryLocation ? zoom : validMarkers.length > 0 ? 13 : 5;

  const isClickSelectionEnabled = Boolean(interactive || draggable || onMarkerDrop);

  const resolvedHeight = typeof height === 'number' ? Math.max(height, 350) : height;
  const containerStyle = {
    height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
    minHeight: '350px',
  };

  // Primary Pin Icon
  const primaryPinIcon = useMemo(() => {
    return createCustomPin('#DC2626', '📍', false);
  }, []);

  return (
    <div className={`leaflet-map-wrapper ${className}`} style={containerStyle}>
      {/* Floating Guidance Banner when map is click-selectable but coordinates unset */}
      {showNoLocationState && !hasPrimaryLocation && validMarkers.length === 0 && (
        <div className="leaflet-map-overlay-banner" role="status">
          <i className="bi bi-info-circle-fill text-warning" />
          <span>Click on the map or use &ldquo;Use My Location&rdquo; to set coordinates</span>
        </div>
      )}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="leaflet-map-container"
        style={{ width: '100%', height: '100%', minHeight: '350px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_TILE_ATTRIBUTION) ||
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          url={
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_TILE_URL) ||
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          maxZoom={19}
        />

        {/* Viewport & Auto-fit Controller */}
        <MapViewportController
          centerCoords={hasPrimaryLocation ? [resolvedLat, resolvedLng] : null}
          markers={validMarkers}
          zoom={zoom}
        />

        {/* Click-to-pick Location Listener */}
        <MapClickHandler
          onLocationSelect={onMarkerDrop}
          active={isClickSelectionEnabled}
        />

        {/* Primary Selected Emergency Marker (e.g. Report Emergency or single incident) */}
        {hasPrimaryLocation && (
          <Marker
            position={[resolvedLat, resolvedLng]}
            icon={primaryPinIcon}
            draggable={draggable}
            eventHandlers={{
              dragend(e) {
                if (draggable && onMarkerDrop) {
                  const latlng = e.target.getLatLng();
                  onMarkerDrop({ lat: latlng.lat, lng: latlng.lng });
                }
              },
            }}
          >
            <Popup>
              <div className="leaflet-popup-card">
                <div className="leaflet-popup-title">
                  <span>📍</span>
                  <span>Emergency Location</span>
                </div>
                <div className="leaflet-popup-desc">
                  <strong>Coordinates:</strong> {resolvedLat.toFixed(5)}, {resolvedLng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Multi-incident & Responder Markers (e.g. Command Center) */}
        {validMarkers.map((m, idx) => {
          const catMeta = getCategoryMeta(m.category || m.type || '');
          const pinColor = m.color || catMeta.color;
          const pinEmoji = m.emoji || catMeta.emoji;
          const markerIcon = createCustomPin(pinColor, pinEmoji, Boolean(m.isSelected));

          const incidentId = m.emergency_code || m.id || m.code || null;
          const title = m.label || m.title || (incidentId ? `Emergency #${incidentId}` : 'Incident');
          const categoryName = m.category || catMeta.label;
          const status = m.status || null;
          const severity = m.severity || null;
          const location = m.formattedAddress || m.location || null;
          const reportedTime = m.createdAt || m.reportedAt || m.time || m.eta || null;

          return (
            <Marker
              key={m.id || `marker-${idx}-${m.lat}-${m.lng}`}
              position={[m.lat, m.lng]}
              icon={markerIcon}
            >
              <Popup>
                <div className="leaflet-popup-card">
                  <div className="leaflet-popup-title">
                    <span>{pinEmoji}</span>
                    <span>{title}</span>
                  </div>

                  <div className="leaflet-popup-badge-row">
                    {incidentId && (
                      <span className="leaflet-popup-badge" style={{ color: '#0284C7' }}>
                        #{incidentId}
                      </span>
                    )}
                    <span className="leaflet-popup-badge">
                      {categoryName}
                    </span>
                    {severity && (
                      <span
                        className="leaflet-popup-badge"
                        style={{
                          background: severity.toUpperCase() === 'CRITICAL' || severity.toUpperCase() === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                          color: severity.toUpperCase() === 'CRITICAL' || severity.toUpperCase() === 'HIGH' ? '#DC2626' : '#D97706',
                          borderColor: severity.toUpperCase() === 'CRITICAL' || severity.toUpperCase() === 'HIGH' ? '#FECACA' : '#FDE68A',
                        }}
                      >
                        {severity}
                      </span>
                    )}
                    {status && (
                      <span className="leaflet-popup-badge" style={{ textTransform: 'capitalize' }}>
                        {status}
                      </span>
                    )}
                  </div>

                  {location && (
                    <div className="leaflet-popup-desc">
                      <i className="bi bi-geo-alt me-1" />
                      {location}
                    </div>
                  )}

                  {reportedTime && (
                    <div className="leaflet-popup-desc" style={{ marginTop: '3px' }}>
                      <i className="bi bi-clock me-1" />
                      {reportedTime}
                    </div>
                  )}

                  <div className="leaflet-popup-desc" style={{ marginTop: '4px', fontSize: '10.5px' }}>
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Incident Coordinates Bar */}
      {showInfoBar && hasPrimaryLocation && (
        <div className="leaflet-map-info-bar">
          <div className="leaflet-info-left">
            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
            <span>Incident Coordinates:</span>
            <span className="leaflet-coords-mono">
              {resolvedLat.toFixed(6)}, {resolvedLng.toFixed(6)}
            </span>
          </div>
          {isClickSelectionEnabled && (
            <span className="leaflet-info-hint">
              Click anywhere on map to reposition marker
            </span>
          )}
        </div>
      )}
    </div>
  );
}
