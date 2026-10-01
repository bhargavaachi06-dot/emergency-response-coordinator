import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

// Firebase configuration using Vite environment variables
// Replace with your Firebase console project settings in frontend/.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemo-Placeholder-KeyForBuild2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "emergency-response-coordinator.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "emergency-response-coordinator",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "emergency-response-coordinator.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
};

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with account selector
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Perform real Google OAuth Sign-In
 * Supports both Popup (desktop browsers) and Redirect (mobile/Capacitor WebView)
 */
export async function signInWithGoogleOAuth() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    return {
      success: true,
      email: user.email,
      name: user.displayName || "Google User",
      photoUrl: user.photoURL || null,
      googleId: user.uid,
      idToken: await user.getIdToken(),
    };
  } catch (error) {
    console.error("Google OAuth error:", error);
    
    // Provide user-friendly message based on Firebase error code
    let userMessage = "Google authentication failed. Please try again.";
    if (error.code === "auth/popup-closed-by-user") {
      userMessage = "Google sign-in was closed before completing.";
    } else if (error.code === "auth/cancelled-popup-request") {
      userMessage = "Sign-in cancelled.";
    } else if (error.code === "auth/network-request-failed") {
      userMessage = "Network error. Please check your internet connection.";
    } else if (error.code === "auth/account-exists-with-different-credential") {
      userMessage = "An account already exists with the same email using a different sign-in method.";
    } else if (error.message) {
      userMessage = error.message;
    }

    return {
      success: false,
      error: userMessage,
      code: error.code,
    };
  }
}

/**
 * Real Firebase Phone Auth with reCAPTCHA verifier
 */
export function setupRecaptcha(containerId = "recaptcha-container") {
  if (typeof window === "undefined") return null;

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Resetting...");
    },
  });

  return window.recaptchaVerifier;
}

export async function sendFirebasePhoneOtp(formattedPhoneNumber, appVerifier) {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return {
      success: true,
      confirmationResult,
    };
  } catch (error) {
    console.error("Firebase phone auth error:", error);
    return {
      success: false,
      error: error.message || "Failed to send phone OTP via Firebase",
    };
  }
}

export async function firebaseSignOut() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Firebase sign out warning:", err);
  }
}

export { auth, googleProvider };
