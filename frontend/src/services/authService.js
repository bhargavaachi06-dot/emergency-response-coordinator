import { signInWithGoogleOAuth, firebaseSignOut } from "./firebase";
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
      const result = await safeApiFetch(endpoint, {
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

      if (result.success && result.token) {
        this.setToken(result.token);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error?.message || "Google authentication failed. Please try again.",
      };
    }
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
