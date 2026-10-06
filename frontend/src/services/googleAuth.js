/**
 * Google Identity Services (GIS) Client Service
 * Emergency Response Coordinator
 *
 * Implements the official Google Identity Services ID-token authentication flow
 * using VITE_GOOGLE_CLIENT_ID from environment variables.
 *
 * Safe Architecture:
 * - Reads VITE_GOOGLE_CLIENT_ID without hardcoded secrets
 * - Lazy-loads official https://accounts.google.com/gsi/client script
 * - Never throws unhandled exceptions when Google servers are unreachable
 * - Returns clean error descriptions when configuration is missing
 */

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GSI_SCRIPT_ID = "google-gsi-client-script";

let scriptLoadingPromise = null;

/**
 * Read the configured Google OAuth 2.0 Web Client ID
 * @returns {string} Clean client ID or empty string
 */
export function getGoogleClientId() {
  const envId =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)) ||
    "";

  if (!envId || typeof envId !== "string") return "";

  const trimmed = envId.trim();
  // Filter out common boilerplate placeholders
  if (
    trimmed.toLowerCase().includes("placeholder") ||
    trimmed.toLowerCase().includes("your_google_client_id") ||
    trimmed.toLowerCase().includes("your-client-id")
  ) {
    return "";
  }

  return trimmed;
}

/**
 * Check whether Google Sign-In is configured with a valid Client ID
 * @returns {boolean}
 */
export function isGoogleAuthConfigured() {
  const clientId = getGoogleClientId();
  return Boolean(clientId && clientId.length > 5);
}

/**
 * Dynamically and safely load the Google Identity Services client library
 * @returns {Promise<boolean>} Resolves true when window.google.accounts.id is ready
 */
export function loadGsiScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // Already loaded
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    // Check if script element is already in the document
    const existing = document.getElementById(GSI_SCRIPT_ID);
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve(true);
      } else {
        existing.addEventListener("load", () => resolve(Boolean(window.google?.accounts?.id)));
        existing.addEventListener("error", () => resolve(false));
      }
      return;
    }

    const script = document.createElement("script");
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve(Boolean(window.google?.accounts?.id));
    };

    script.onerror = (err) => {
      console.warn("[GoogleAuth] Failed to load Google Identity Services script:", err);
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Initialize Google Identity Services and optionally render the official sign-in button
 * @param {object} options
 * @param {function} options.onCredential - Callback receiving { credential } (Google ID Token)
 * @param {function} [options.onError] - Optional error callback
 * @param {HTMLElement|string} [options.buttonContainer] - Container element or ID to render the button into
 * @param {string} [options.theme] - 'outline' | 'filled_blue' | 'filled_black'
 * @param {string} [options.size] - 'large' | 'medium' | 'small'
 * @param {number} [options.width] - Button width in pixels
 * @param {boolean} [options.prompt] - Whether to display One Tap prompt
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function initializeGoogleSignIn({
  onCredential,
  onError,
  buttonContainer,
  theme = "outline",
  size = "large",
  width = 320,
  prompt = false,
} = {}) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return {
      success: false,
      code: "NOT_CONFIGURED",
      message: "Google sign-in is not configured. Please try another sign-in method.",
    };
  }

  const loaded = await loadGsiScript();
  if (!loaded || !window.google?.accounts?.id) {
    return {
      success: false,
      code: "SCRIPT_LOAD_FAILED",
      message: "Unable to load Google authentication services. Please check your connection and try again.",
    };
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (typeof onCredential === "function") {
          onCredential(response);
        }
      },
      error_callback: (err) => {
        console.warn("[GoogleAuth] GSI error callback:", err);
        if (typeof onError === "function") {
          onError(err);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Render button if container provided
    if (buttonContainer) {
      const containerEl =
        typeof buttonContainer === "string"
          ? document.getElementById(buttonContainer)
          : buttonContainer;

      if (containerEl) {
        // Clear previous buttons to prevent duplicates on re-render
        containerEl.innerHTML = "";
        window.google.accounts.id.renderButton(containerEl, {
          type: "standard",
          theme,
          size,
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(Math.max(width, 200), 400),
        });
      }
    }

    if (prompt) {
      window.google.accounts.id.prompt();
    }

    return { success: true };
  } catch (err) {
    console.warn("[GoogleAuth] Initialization error:", err);
    return {
      success: false,
      code: "INIT_ERROR",
      message: err.message || "Failed to initialize Google sign-in.",
    };
  }
}
