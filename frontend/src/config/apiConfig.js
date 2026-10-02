/**
 * Central API Configuration
 * Emergency Response Coordinator
 *
 * Ensures safe and deterministic backend API URL resolution across:
 * - Local Vite Development (defaults to http://localhost:5000)
 * - Vercel Production Web (defaults to https://emergency-response-coordinator-api.onrender.com)
 * - Capacitor Android APK (defaults to https://emergency-response-coordinator-api.onrender.com)
 */

const PRODUCTION_API_ROOT = "https://emergency-response-coordinator-api.onrender.com";
const LOCAL_DEV_API_ROOT = "http://localhost:5000";

/**
 * Determine the root API URL without trailing slash or /api suffix
 */
export function getApiRootUrl() {
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) ||
    "";

  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    // Strip trailing slashes and any accidental /api or /auth path suffix so we have a clean root
    let clean = envUrl.trim().replace(/\/+$/, "");
    while (clean.endsWith("/auth") || clean.endsWith("/api")) {
      if (clean.endsWith("/auth")) clean = clean.slice(0, -5).replace(/\/+$/, "");
      if (clean.endsWith("/api")) clean = clean.slice(0, -4).replace(/\/+$/, "");
    }
    return clean;
  }

  // Detect local development environment
  const isBrowser = typeof window !== "undefined";
  const hostname = isBrowser ? window.location.hostname : "";
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local");

  const isViteDev = Boolean(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV);

  // If running locally in Vite dev mode on localhost, use local backend
  if (isLocalHost && isViteDev) {
    return LOCAL_DEV_API_ROOT;
  }

  // Otherwise (Vercel production, preview deployments, or Capacitor Android), safely use production Render backend
  return PRODUCTION_API_ROOT;
}

export const API_ROOT_URL = getApiRootUrl();
export const API_BASE_URL = `${API_ROOT_URL}/api`;

export const AUTH_ENDPOINTS = {
  mobileSendOtp: `${API_BASE_URL}/auth/mobile/send-otp`,
  mobileVerifyOtp: `${API_BASE_URL}/auth/mobile/verify-otp`,
  emailSendOtp: `${API_BASE_URL}/auth/email/send-otp`,
  emailVerifyOtp: `${API_BASE_URL}/auth/email/verify-otp`,
  google: `${API_BASE_URL}/auth/google`,
  googleLinkMobile: `${API_BASE_URL}/auth/google/link-mobile`,
  register: `${API_BASE_URL}/auth/register`,
  me: `${API_BASE_URL}/auth/me`,
};
