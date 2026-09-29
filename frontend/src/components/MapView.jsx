import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icon paths (common Vite/Webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored icon factory
function makeIcon(color, symbol) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 36px; height: 36px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 14px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%;
          margin-top: -4px;
        ">${symbol}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

const ICONS = {
  emergency: makeIcon('#dc2626', '🚨'),
  ambulance: makeIcon('#16a34a', '🚑'),
  police:    makeIcon('#1d4ed8', '👮'),
  helper:    makeIcon('#d97706', '🤝'),
};

// Component that smoothly flies to a new center when it changes
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
}

export function MapView({ markers = [], center, height = 400 }) {
  // Default center: a central demo location
  const defaultCenter = [28.6139, 77.2090];
  const isValidCenter =
    Array.isArray(center) &&
    center.length === 2 &&
    typeof center[0] === 'number' &&
    !isNaN(center[0]) &&
    typeof center[1] === 'number' &&
    !isNaN(center[1]);

  const mapCenter = isValidCenter ? center : defaultCenter;

  // Filter out any markers missing valid lat/lng coordinates to avoid Leaflet NaN crashes
  const validMarkers = (Array.isArray(markers) ? markers : []).filter(
    (m) => m && typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)
  );

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />

        {/* Smooth re-centering when center prop changes */}
        {isValidCenter && <MapController center={center} />}

        {/* Render each valid marker */}
        {validMarkers.map((m, idx) => (
          <Marker
            key={idx}
            position={[m.lat, m.lng]}
            icon={ICONS[m.type] || ICONS.emergency}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 130 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.label}</div>
                {m.status && (
                  <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'capitalize' }}>
                    Status: {m.status}
                  </div>
                )}
                {m.eta && (
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>ETA: {m.eta}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
