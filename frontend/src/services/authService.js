import { signInWithGoogleOAuth, firebaseSignOut } from "./firebase";
import { AUTH_ENDPOINTS, API_ROOT_URL } from "../config/apiConfig";

const TOKEN_KEY = "emergency_auth_token";

/**
 * Format user-facing error messages safely
 */
function formatAuthError(error, response) {
  if (response) {
    if (response.status >= 500) {
      return "The authentication server is temporarily unavailable. Please try again.";
    }
  }

  const rawMessage = (error?.message || String(error || "")).toLowerCase();

  if (
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("networkerror") ||
    rawMessage.includes("load failed") ||
    rawMessage.includes("network request failed") ||
    rawMessage.includes("connection refused")
  ) {
    return "Unable to connect to the emergency response server. Please check your internet connection and try again.";
  }

  if (rawMessage.includes("cors") || rawMessage.includes("cross-origin")) {
    return "Authentication service configuration needs attention.";
  }

  return error?.message || "Authentication request failed. Please try again.";
}

/**
 * Safe development diagnostics logger
 * Never logs OTPs, JWTs, passwords, or sensitive payloads
 */
function safeDevLog(method, endpointUrl, status, statusText) {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    try {
      const parsed = new URL(endpointUrl);
      console.log(`[API Diagnostic] ${method} ${parsed.hostname}${parsed.pathname} [${status || "ERR"}] ${statusText || ""}`);
    } catch {
      console.log(`[API Diagnostic] ${method} ${endpointUrl} [${status || "ERR"}]`);
    }
  }
}

export const authService = {
  // --------------------------------------------------
  // TOKEN STORAGE
  // --------------------------------------------------
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn("Error saving auth token to localStorage:", e);
    }
  },

  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },

  getAuthHeaders() {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  // --------------------------------------------------
  // 1. MOBILE OTP
  // --------------------------------------------------
  async sendMobileOtp(countryCode, mobileNumber) {
    const endpoint = AUTH_ENDPOINTS.mobileSendOtp;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobileNumber }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  async verifyMobileOtp(countryCode, mobileNumber, otp, isLogin = false) {
    const endpoint = AUTH_ENDPOINTS.mobileVerifyOtp;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobileNumber, otp, isLogin }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  // --------------------------------------------------
  // 2. EMAIL OTP
  // --------------------------------------------------
  async sendEmailOtp(email) {
    const endpoint = AUTH_ENDPOINTS.emailSendOtp;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  async verifyEmailOtp(email, otp, isLogin = false) {
    const endpoint = AUTH_ENDPOINTS.emailVerifyOtp;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, isLogin }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  // --------------------------------------------------
  // 3. GOOGLE OAUTH
  // --------------------------------------------------
  async loginWithGoogle() {
    try {
      const oauthResult = await signInWithGoogleOAuth();
      if (!oauthResult.success) {
        return oauthResult;
      }

      const endpoint = AUTH_ENDPOINTS.google;
      // Send authenticated Google profile to backend for verification and account linking
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: oauthResult.email,
          name: oauthResult.name,
          photoUrl: oauthResult.photoUrl,
          googleId: oauthResult.googleId,
          googleToken: oauthResult.idToken,
        }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);

      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      safeDevLog("POST", AUTH_ENDPOINTS.google, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  async linkGoogleMobile(email, countryCode, mobileNumber, otp) {
    const endpoint = AUTH_ENDPOINTS.googleLinkMobile;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, countryCode, mobileNumber, otp }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  // --------------------------------------------------
  // 4. SIGN UP REGISTRATION
  // --------------------------------------------------
  async registerUser({ name, email, countryCode, mobileNumber, profilePhoto }) {
    const endpoint = AUTH_ENDPOINTS.register;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          countryCode,
          mobileNumber,
          profilePhoto: profilePhoto || null,
        }),
      });
      safeDevLog("POST", endpoint, res.status, res.statusText);
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      safeDevLog("POST", endpoint, 0, error.message);
      return {
        success: false,
        message: formatAuthError(error),
      };
    }
  },

  // --------------------------------------------------
  // 5. CURRENT SESSION / GET PROFILE
  // --------------------------------------------------
  async getProfile() {
    const token = this.getToken();
    if (!token) return null;

    const endpoint = AUTH_ENDPOINTS.me;
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      safeDevLog("GET", endpoint, res.status, res.statusText);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.clearToken();
        }
        return null;
      }

      const data = await res.json();
      return data.user || null;
    } catch (error) {
      safeDevLog("GET", endpoint, 0, error.message);
      console.warn("Failed to fetch user session:", formatAuthError(error));
      return null;
    }
  },

  // --------------------------------------------------
  // 6. LOGOUT
  // --------------------------------------------------
  async logout() {
    this.clearToken();
    await firebaseSignOut();
  },

  // Expose root URL for diagnostics
  getApiRoot() {
    return API_ROOT_URL;
  },
};
