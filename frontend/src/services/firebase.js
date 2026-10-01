import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

/**
 * Central Firebase Configuration
 * Emergency Response Coordinator
 *
 * Uses Vite environment variables via import.meta.env
 * Lazy-initialized only when Google OAuth is explicitly requested
 */
const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/**
 * Validate that required Firebase configuration fields exist and are not placeholders
 */
export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = firebaseConfig;

  if (
    !apiKey ||
    typeof apiKey !== "string" ||
    !apiKey.trim() ||
    apiKey.includes("Placeholder") ||
    apiKey.includes("Demo")
  ) {
    return false;
  }

  if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
    return false;
  }

  if (!appId || typeof appId !== "string" || !appId.trim()) {
    return false;
  }

  return true;
}

// Development Diagnostic (never logs full API key or secrets)
if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
  const isConfigured = isFirebaseConfigured();
  console.log(
    `[Firebase Diagnostic] Configuration present: ${isConfigured}${
      isConfigured && firebaseConfig.projectId ? ` (Project: ${firebaseConfig.projectId})` : ""
    }`
  );
}

// Lazy Singletons
let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;

/**
 * Lazy-initialize Firebase only when Google Authentication is requested.
 * Prevents module-load crashes when Firebase is not configured or when
 * users authenticate via Mobile OTP or Email OTP.
 */
export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!firebaseAuth) {
    try {
      firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      firebaseAuth = getAuth(firebaseApp);
    } catch (err) {
      console.warn("Failed to initialize Firebase Auth:", err.message);
      return null;
    }
  }

  return firebaseAuth;
}

/**
 * Perform Google OAuth Sign-In
 * Only initializes Firebase upon user action
 */
export async function signInWithGoogleOAuth() {
  // 1. Verify Firebase configuration before attempting initialization
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: "Google sign-in is not configured. Please try another sign-in method.",
    };
  }

  // 2. Lazy-initialize auth instance
  const auth = getFirebaseAuth();
  if (!auth) {
    return {
      success: false,
      error: "Google sign-in is not configured. Please try another sign-in method.",
    };
  }

  // 3. Initialize Google Auth Provider singleton
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });
  }

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
    console.error("Google OAuth error code:", error.code);

    let userMessage = "Google authentication failed. Please try again.";

    if (error.code === "auth/api-key-not-valid" || error.code === "auth/invalid-api-key") {
      userMessage = "Google sign-in is not configured. Please try another sign-in method.";
    } else if (error.code === "auth/popup-closed-by-user") {
      userMessage = "Google sign-in was closed before completing.";
    } else if (error.code === "auth/cancelled-popup-request") {
      userMessage = "Sign-in cancelled.";
    } else if (error.code === "auth/network-request-failed") {
      userMessage = "Network error. Please check your internet connection.";
    } else if (error.code === "auth/account-exists-with-different-credential") {
      userMessage = "An account already exists with the same email using a different sign-in method.";
    } else if (error.code === "auth/operation-not-allowed") {
      userMessage = "Google sign-in is not enabled in this Firebase project.";
    }

    return {
      success: false,
      error: userMessage,
      code: error.code,
    };
  }
}

/**
 * Safe Firebase Sign Out (only invokes signOut if Firebase was initialized)
 */
export async function firebaseSignOut() {
  if (firebaseAuth) {
    try {
      await signOut(firebaseAuth);
    } catch (err) {
      console.warn("Firebase sign out warning:", err);
    }
  }
}
