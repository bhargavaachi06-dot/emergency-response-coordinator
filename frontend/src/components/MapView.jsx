import GoogleLocationMap from './GoogleLocationMap';

/**
 * MapView — backward-compatible wrapper around GoogleLocationMap.
 *
 * Existing consumers pass:
 *   markers: [{lat, lng, type, label, status, eta}]
 *   center:  [lat, lng]   (array form)
 *   height:  number
 *
 * This adapter translates to GoogleLocationMap's props.
 */
export function MapView({ markers = [], center, height = 400 }) {
  // Translate array center [lat, lng] → individual props
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
    <GoogleLocationMap
      latitude={latitude}
      longitude={longitude}
      markers={validMarkers}
      height={height}
      zoom={15}
      showInfoBar={false}
      showNoLocationState={!isValidCenter}
    />
  );
}
