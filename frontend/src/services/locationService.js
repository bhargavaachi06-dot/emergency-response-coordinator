// =====================================================
// Location Service — Emergency Response Coordinator
// OpenStreetMap + Nominatim Reverse Geocoding & Browser GPS
// Reliable, API-Key-Free Primary Map Service
// =====================================================

// In-memory LRU-like cache for reverse geocoded coordinates
const _geocodeCache = new Map();
const MAX_CACHE_SIZE = 100;

// Throttling lock for Nominatim (limit to max 1 request per second as per OSM usage policy)
let _lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

/**
 * Normalizes coordinate keys for caching (rounded to ~11 meters precision)
 */
function getCacheKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
}

/**
 * Standard categorized error codes for location & geolocation
 */
export const LOCATION_ERROR_CODES = {
  GEOLOCATION_UNAVAILABLE: 'GEOLOCATION_UNAVAILABLE',
  GEOLOCATION_DENIED: 'GEOLOCATION_DENIED',
  GEOCODING_FAILED: 'GEOCODING_FAILED',
  TIMEOUT: 'TIMEOUT',
};

/**
 * Get current device/browser GPS location.
 * Uses high accuracy where supported.
 *
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number|null}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: LOCATION_ERROR_CODES.GEOLOCATION_UNAVAILABLE,
        message: 'Your current location could not be detected. Please enter the location manually.',
      });
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
        let code = LOCATION_ERROR_CODES.GEOLOCATION_UNAVAILABLE;
        let message = 'Your current location could not be detected. Please enter the location manually.';

        if (err.code === err.PERMISSION_DENIED) {
          code = LOCATION_ERROR_CODES.GEOLOCATION_DENIED;
          message = 'Location permission was denied. You can enter the location manually.';
        } else if (err.code === err.TIMEOUT) {
          code = LOCATION_ERROR_CODES.TIMEOUT;
          message = 'Location detection timed out. Please enter your address manually or try again.';
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
 * Parse OpenStreetMap Nominatim address details into application standard model.
 */
function parseNominatimAddress(address = {}, displayName = '', lat, lng) {
  const streetNumber = address.house_number || '';
  const road = address.road || address.pedestrian || address.street || address.path || '';
  const street = [streetNumber, road].filter(Boolean).join(' ') || null;

  const area =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.subdistrict ||
    address.quarter ||
    null;

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    null;

  const district =
    address.city_district ||
    address.county ||
    address.state_district ||
    null;

  const state = address.state || null;
  const postalCode = address.postcode || null;
  const country = address.country || null;

  // Build clean concise formatted address if display_name is overly verbose
  const formattedAddress =
    displayName ||
    [street, area, city || district, state, country].filter(Boolean).join(', ') ||
    `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;

  return {
    street,
    area,
    city,
    district,
    state,
    postalCode,
    country,
    formattedAddress,
  };
}

/**
 * Reverse geocode a {latitude, longitude} pair using OpenStreetMap Nominatim API.
 * Includes caching and rate limiting to respect OSM usage policy.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>} Parsed address object
 */
export async function reverseGeocode(latitude, longitude) {
  if (typeof latitude !== 'number' || isNaN(latitude) || typeof longitude !== 'number' || isNaN(longitude)) {
    throw new Error('Invalid coordinates provided for reverse geocoding.');
  }

  const cacheKey = getCacheKey(latitude, longitude);
  if (_geocodeCache.has(cacheKey)) {
    return _geocodeCache.get(cacheKey);
  }

  // Throttle request rate
  const now = Date.now();
  const timeSinceLast = now - _lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((res) => setTimeout(res, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  _lastRequestTime = Date.now();

  const geocodingBaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOCODING_API_URL) ||
    'https://nominatim.openstreetmap.org/reverse';

  const separator = geocodingBaseUrl.includes('?') ? '&' : '?';
  const url = `${geocodingBaseUrl}${separator}format=json&lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocode responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsed = parseNominatimAddress(
      data.address || {},
      data.display_name || '',
      latitude,
      longitude
    );

    // Save in cache
    if (_geocodeCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = _geocodeCache.keys().next().value;
      _geocodeCache.delete(oldestKey);
    }
    _geocodeCache.set(cacheKey, parsed);

    return parsed;
  } catch (err) {
    console.warn('[locationService] Reverse geocode fallback to coordinates:', err.message);
    // Graceful fallback: return valid coordinate structure without crashing
    const fallback = {
      street: null,
      area: null,
      city: null,
      district: null,
      state: null,
      postalCode: null,
      country: null,
      formattedAddress: `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`,
    };
    return fallback;
  }
}

/**
 * Full detection flow: GPS detection followed by reverse geocoding.
 * Returns complete location data model.
 *
 * @param {Function} [onProgress] - optional callback ('detecting' | 'geocoding')
 * @returns {Promise<object>} Complete location model
 */
export async function detectAndGeocodeLocation(onProgress) {
  if (onProgress) onProgress('detecting');

  const pos = await getCurrentPosition();
  const { latitude, longitude, accuracy } = pos;

  if (onProgress) onProgress('geocoding');
  const addressData = await reverseGeocode(latitude, longitude);

  return {
    latitude,
    longitude,
    accuracy,
    ...addressData,
  };
}
