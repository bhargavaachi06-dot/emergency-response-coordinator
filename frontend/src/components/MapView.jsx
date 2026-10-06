import LeafletMap from './LeafletMap';

/**
 * MapView — Primary abstraction for map rendering in Emergency Response Coordinator.
 * Wraps LeafletMap (OpenStreetMap) so future map provider changes remain easy.
 *
 * Props:
 *   markers: [{lat, lng, type, label, status, eta, ...}]
 *   center:  [lat, lng] or null
 *   height:  number | string (default 400)
 */
export function MapView({ markers = [], center = null, height = 400, onMarkerDrop = null, draggable = false }) {
  const isValidCenter =
    Array.isArray(center) &&
    center.length === 2 &&
    typeof center[0] === 'number' &&
    !isNaN(center[0]) &&
    typeof center[1] === 'number' &&
    !isNaN(center[1]);

  const latitude  = isValidCenter ? center[0] : null;
  const longitude = isValidCenter ? center[1] : null;

  // Filter invalid markers
  const validMarkers = (Array.isArray(markers) ? markers : []).filter(
    (m) => m && typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)
  );

  return (
    <LeafletMap
      latitude={latitude}
      longitude={longitude}
      center={isValidCenter ? [latitude, longitude] : null}
      markers={validMarkers}
      height={height}
      zoom={15}
      showInfoBar={false}
      showNoLocationState={!isValidCenter && validMarkers.length === 0}
      onMarkerDrop={onMarkerDrop}
      draggable={draggable}
    />
  );
}

export default MapView;
