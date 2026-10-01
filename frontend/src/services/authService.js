import { signInWithGoogleOAuth, firebaseSignOut } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
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
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/mobile/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobileNumber }),
      });
      const data = await res.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to send mobile OTP. Please check your connection.",
      };
    }
  },

  async verifyMobileOtp(countryCode, mobileNumber, otp, isLogin = false) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/mobile/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, mobileNumber, otp, isLogin }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Verification failed. Please try again.",
      };
    }
  },

  // --------------------------------------------------
  // 2. EMAIL OTP
  // --------------------------------------------------
  async sendEmailOtp(email) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/email/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to send email OTP. Please check your connection.",
      };
    }
  },

  async verifyEmailOtp(email, otp, isLogin = false) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/email/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, isLogin }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Verification failed. Please try again.",
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

      // Send authenticated Google profile to backend for verification and account linking
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
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

      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Google authentication failed",
      };
    }
  },

  async linkGoogleMobile(email, countryCode, mobileNumber, otp) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google/link-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, countryCode, mobileNumber, otp }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to link mobile to Google account",
      };
    }
  },

  // --------------------------------------------------
  // 4. SIGN UP REGISTRATION
  // --------------------------------------------------
  async registerUser({ name, email, countryCode, mobileNumber, profilePhoto }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
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
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Account creation failed",
      };
    }
  },

  // --------------------------------------------------
  // 5. CURRENT SESSION / GET PROFILE
  // --------------------------------------------------
  async getProfile() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.clearToken();
        }
        return null;
      }

      const data = await res.json();
      return data.user || null;
    } catch (error) {
      console.warn("Failed to fetch user session:", error);
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
};
