import LeafletMap from './LeafletMap';

/**
 * GoogleLocationMap (Legacy Compatibility Wrapper)
 *
 * Re-exports LeafletMap to guarantee that any legacy imports immediately
 * use OpenStreetMap + Leaflet without Google Maps API keys or scripts.
 */
export default function GoogleLocationMap(props) {
  return <LeafletMap {...props} />;
}
