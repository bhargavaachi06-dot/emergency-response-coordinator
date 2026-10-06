import { signInWithGoogleOAuth, firebaseSignOut, isFirebaseConfigured } from "./firebase";
import { isGoogleAuthConfigured, getGoogleClientId } from "./googleAuth";
import { AUTH_ENDPOINTS, API_ROOT_URL } from "../config/apiConfig";
import { safeApiFetch } from "./apiFetch";

const TOKEN_KEY = "emergency_auth_token";

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
    return safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, mobileNumber }),
    });
  },

  async verifyMobileOtp(countryCode, mobileNumber, otp, isLogin = false) {
    const endpoint = AUTH_ENDPOINTS.mobileVerifyOtp;
    const result = await safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, mobileNumber, otp, isLogin }),
    });

    if (result.success && result.token) {
      this.setToken(result.token);
    }
    return result;
  },

  // --------------------------------------------------
  // 2. EMAIL OTP
  // --------------------------------------------------
  async sendEmailOtp(email) {
    const endpoint = AUTH_ENDPOINTS.emailSendOtp;
    return safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  async verifyEmailOtp(email, otp, isLogin = false) {
    const endpoint = AUTH_ENDPOINTS.emailVerifyOtp;
    const result = await safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, isLogin }),
    });

    if (result.success && result.token) {
      this.setToken(result.token);
    }
    return result;
  },

  // --------------------------------------------------
  // --------------------------------------------------
  // 3. GOOGLE OAUTH & GOOGLE IDENTITY SERVICES
  // --------------------------------------------------
  isGoogleConfigured() {
    return isGoogleAuthConfigured() || isFirebaseConfigured();
  },

  getGoogleClientId() {
    return getGoogleClientId();
  },

  /**
   * Authenticate using a verified Google ID Token (from Google Identity Services)
   * @param {string} idToken - The Google ID Token JWT
   */
  async loginWithGoogleToken(idToken) {
    if (!idToken || typeof idToken !== "string") {
      return {
        success: false,
        message: "Google authentication token was not provided.",
      };
    }

    const endpoint = AUTH_ENDPOINTS.google;
    const result = await safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: idToken.trim(),
        googleToken: idToken.trim(),
      }),
    });

    if (result.success && result.token) {
      this.setToken(result.token);
    }
    return result;
  },

  /**
   * Generalized Google Login handler
   * Accepts an optional idToken from GIS, or falls back to Firebase if configured
   */
  async loginWithGoogle(idToken = null) {
    // 1. If ID token provided directly from GIS callback
    if (idToken && typeof idToken === "string") {
      return this.loginWithGoogleToken(idToken);
    }

    // 2. If Firebase is configured with full client credentials
    if (isFirebaseConfigured()) {
      try {
        const oauthResult = await signInWithGoogleOAuth();
        if (!oauthResult.success) {
          return oauthResult;
        }
        return this.loginWithGoogleToken(oauthResult.idToken);
      } catch (error) {
        return {
          success: false,
          message: error?.message || "Google authentication failed. Please try again.",
        };
      }
    }

    // 3. If GIS is configured but function was called without token
    if (isGoogleAuthConfigured()) {
      return {
        success: false,
        code: "USE_GIS_BUTTON",
        message: "Please sign in using the Google Sign-In button.",
      };
    }

    // 4. Neither GIS nor Firebase is configured
    return {
      success: false,
      code: "GOOGLE_NOT_CONFIGURED",
      message: "Google sign-in is not configured. Please try another sign-in method.",
    };
  },

  async linkGoogleMobile(email, countryCode, mobileNumber, otp) {
    const endpoint = AUTH_ENDPOINTS.googleLinkMobile;
    const result = await safeApiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, countryCode, mobileNumber, otp }),
    });

    if (result.success && result.token) {
      this.setToken(result.token);
    }
    return result;
  },

  // --------------------------------------------------
  // 4. SIGN UP REGISTRATION
  // --------------------------------------------------
  async registerUser({ name, email, countryCode, mobileNumber, profilePhoto }) {
    const endpoint = AUTH_ENDPOINTS.register;
    const result = await safeApiFetch(endpoint, {
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

    if (result.success && result.token) {
      this.setToken(result.token);
    }
    return result;
  },

  // --------------------------------------------------
  // 5. CURRENT SESSION / GET PROFILE
  // --------------------------------------------------
  async getProfile() {
    const token = this.getToken();
    if (!token) return null;

    const endpoint = AUTH_ENDPOINTS.me;
    const result = await safeApiFetch(endpoint, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (result.status === 401 || result.status === 403) {
      this.clearToken();
      return null;
    }

    if (!result.success || !result.user) {
      return null;
    }

    return result.user;
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
