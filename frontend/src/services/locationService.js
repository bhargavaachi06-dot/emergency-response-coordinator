// =====================================================
// Location Service — Emergency Response Coordinator
// GPS detection + Google Maps reverse geocoding
// =====================================================

/**
 * Attempt to load Google Maps JavaScript API dynamically.
 * Returns a Promise that resolves when the API is ready.
 * Safe to call multiple times — the script is only added once.
 */
let _mapsLoadPromise = null;

export function loadGoogleMapsApi() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured.'));
  }

  // Already loading or loaded
  if (_mapsLoadPromise) return _mapsLoadPromise;

  // Already available on window
  if (window.google?.maps) {
    _mapsLoadPromise = Promise.resolve(window.google.maps);
    return _mapsLoadPromise;
  }

  _mapsLoadPromise = new Promise((resolve, reject) => {
    const callbackName = '__gmaps_cb_' + Date.now();
    window[callbackName] = () => {
      resolve(window.google.maps);
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&libraries=geocoding`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      _mapsLoadPromise = null; // allow retry
      delete window[callbackName];
      reject(new Error('Google Maps script failed to load. Check your API key and network connection.'));
    };
    document.head.appendChild(script);
  });

  return _mapsLoadPromise;
}

/**
 * Check if the API key is configured in env
 */
export function isGoogleMapsConfigured() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return Boolean(key && key.trim() && key !== 'YOUR_GOOGLE_MAPS_API_KEY');
}

/**
 * Get current device/browser GPS location.
 * Returns a normalized location object.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 'UNSUPPORTED', message: 'Geolocation is not supported by this browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        let code = 'UNKNOWN';
        let message;

        switch (err.code) {
          case err.PERMISSION_DENIED:
            code = 'DENIED';
            message = 'Location permission was not granted. Please allow location access and try again.';
            break;
          case err.POSITION_UNAVAILABLE:
            code = 'UNAVAILABLE';
            message = 'Your location is currently unavailable. Please try again or enter your address manually.';
            break;
          case err.TIMEOUT:
            code = 'TIMEOUT';
            message = 'Location detection timed out. Please try again.';
            break;
          default:
            message = 'An unknown location error occurred.';
        }

        reject({ code, message, original: err });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Parse Google geocoder address_components into our structured location model.
 */
function parseAddressComponents(components = [], formattedAddress = '') {
  const get = (types) => {
    for (const type of types) {
      const comp = components.find((c) => c.types.includes(type));
      if (comp) return comp.long_name;
    }
    return null;
  };

  const streetNumber = get(['street_number']);
  const route = get(['route']);
  const street = [streetNumber, route].filter(Boolean).join(' ') || null;

  const area =
    get(['sublocality_level_1', 'sublocality_level_2', 'sublocality', 'neighborhood']) || null;

  const city =
    get(['locality', 'administrative_area_level_2', 'postal_town']) || null;

  const district =
    get(['administrative_area_level_2', 'administrative_area_level_3']) || null;

  const state =
    get(['administrative_area_level_1']) || null;

  const postalCode = get(['postal_code']) || null;

  const country = get(['country']) || null;

  return { street, area, city, district, state, postalCode, country, formattedAddress };
}

/**
 * Reverse geocode a {latitude, longitude} using Google Geocoding API.
 * Requires Google Maps API to be loaded first.
 * Returns a full location model object.
 */
export async function reverseGeocode(latitude, longitude) {
  if (!window.google?.maps?.Geocoder) {
    throw new Error('Google Maps Geocoder is not available.');
  }

  const geocoder = new window.google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const best = results[0];
          const parsed = parseAddressComponents(
            best.address_components || [],
            best.formatted_address || ''
          );
          resolve(parsed);
        } else if (status === 'ZERO_RESULTS') {
          resolve({
            street: null,
            area: null,
            city: null,
            district: null,
            state: null,
            postalCode: null,
            country: null,
            formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      }
    );
  });
}

/**
 * Full flow: detect GPS then reverse geocode.
 * Returns complete location data model.
 *
 * @param {Function} [onProgress] - optional callback for status updates: 'detecting' | 'geocoding'
 * @returns {Promise<LocationData>}
 */
export async function detectAndGeocodeLocation(onProgress) {
  if (onProgress) onProgress('detecting');

  const pos = await getCurrentPosition();
  const { latitude, longitude, accuracy } = pos;

  let addressData = {
    street: null,
    area: null,
    city: null,
    district: null,
    state: null,
    postalCode: null,
    country: null,
    formattedAddress: null,
  };

  // Only geocode if Google Maps is available
  if (window.google?.maps?.Geocoder) {
    try {
      if (onProgress) onProgress('geocoding');
      addressData = await reverseGeocode(latitude, longitude);
    } catch {
      // Geocoding failed — still return GPS coords
    }
  }

  return {
    latitude,
    longitude,
    accuracy,
    ...addressData,
  };
}
