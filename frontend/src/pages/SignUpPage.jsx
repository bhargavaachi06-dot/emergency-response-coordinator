import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import { getAuthText } from "../data/authTranslations";
import OtpInput from "../components/OtpInput";
import { TopNavbar } from "../components/Navigation";
import "./SignUpPage.css";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", shortLabel: "IN +91", flag: "🇮🇳" },
  { code: "+1", label: "US / Canada (+1)", shortLabel: "US +1", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", shortLabel: "UK +44", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", shortLabel: "UAE +971", flag: "🇦🇪" },
  { code: "+61", label: "Australia (+61)", shortLabel: "AU +61", flag: "🇦🇺" },
  { code: "+65", label: "Singapore (+65)", shortLabel: "SG +65", flag: "🇸🇬" },
  { code: "+966", label: "Saudi Arabia (+966)", shortLabel: "SA +966", flag: "🇸🇦" },
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { citizenLanguage, isRtl, login: setAuthSession } = useApp();

  const t = (key) => getAuthText(key, citizenLanguage);

  const getCleanError = (err, fallbackKey = "networkError") => {
    const raw = (err?.message || (typeof err === "string" ? err : "")).toLowerCase();
    if (
      raw.includes("failed to fetch") ||
      raw.includes("networkerror") ||
      raw.includes("load failed") ||
      raw.includes("connection refused") ||
      raw.includes("network request failed")
    ) {
      return "Unable to connect to the authentication server. Please check your internet connection and try again.";
    }
    if (raw.includes("timeout") || raw.includes("timed out") || raw.includes("aborterror")) {
      return "Authentication request timed out. Please try again.";
    }
    if (raw.includes("unexpected token") || raw.includes("not valid json") || raw.includes("doctype")) {
      return "The authentication service returned an invalid response. Please try again shortly.";
    }
    if (raw.includes("expired") || raw.includes("expire")) {
      return t("otpExpired");
    }
    if (
      raw.includes("incorrect") ||
      raw.includes("invalid otp") ||
      raw.includes("wrong otp") ||
      raw.includes("mismatch")
    ) {
      return err?.message || t("incorrectOtp");
    }
    if (raw.includes("too soon") || raw.includes("wait before") || raw.includes("cooldown") || (raw.includes("wait") && raw.includes("s before"))) {
      return err?.message || t("resendTooSoon");
    }
    if (
      raw.includes("google sign-in is not configured") ||
      raw.includes("google sign-in is temporarily unavailable") ||
      raw.includes("api-key-not-valid") ||
      raw.includes("invalid-api-key")
    ) {
      return "Google sign-in is temporarily unavailable. Please try another sign-in method.";
    }
    if (raw.includes("google") || raw.includes("oauth") || raw.includes("popup")) {
      return t("googleAuthFailed");
    }
    return err?.message || (typeof err === "string" ? err : t(fallbackKey));
  };

  // Flow steps: 'form' | 'verify-mobile' | 'verify-email' | 'google-mobile'
  const [step, setStep] = useState(1); // 1: form, 2: verify-mobile, 3: verify-email, 4: google-mobile

  // User form details
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState(location.state?.prefillCountryCode || "+91");
  const [mobileNumber, setMobileNumber] = useState(location.state?.prefillMobile || "");
  const [email, setEmail] = useState(location.state?.prefillEmail || "");

  // Verification states
  const [mobileOtp, setMobileOtp] = useState("");
  const [isMobileVerified, setIsMobileVerified] = useState(Boolean(location.state?.mobileVerified));
  const [mobileCountdown, setMobileCountdown] = useState(0);

  const [emailOtp, setEmailOtp] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(location.state?.emailVerified));
  const [emailCountdown, setEmailCountdown] = useState(0);

  // Google OAuth flow state
  const [googleUserPending, setGoogleUserPending] = useState(null);
  const [googleMobileNumber, setGoogleMobileNumber] = useState("");
  const [googleCountryCode, setGoogleCountryCode] = useState("+91");
  const [googleOtpSent, setGoogleOtpSent] = useState(false);
  const [googleOtp, setGoogleOtp] = useState("");
  const [googleCountdown, setGoogleCountdown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Countdowns
  useEffect(() => {
    let timer;
    if (mobileCountdown > 0) {
      timer = setInterval(() => setMobileCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mobileCountdown]);

  useEffect(() => {
    let timer;
    if (emailCountdown > 0) {
      timer = setInterval(() => setEmailCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailCountdown]);

  useEffect(() => {
    let timer;
    if (googleCountdown > 0) {
      timer = setInterval(() => setGoogleCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [googleCountdown]);

  // Handle successful login redirect based on role or returnUrl
  const handleAuthSuccess = (token, user) => {
    if (setAuthSession) {
      setAuthSession(user, token);
    }

    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) {
      navigate(returnUrl, { replace: true });
      return;
    }

    const role = (user?.role || "citizen").toLowerCase();
    if (role === "coordinator") {
      navigate("/coordinator", { replace: true });
    } else if (role === "responder") {
      navigate("/responder", { replace: true });
    } else if (role === "helper") {
      navigate("/helper", { replace: true });
    } else {
      navigate("/citizen", { replace: true });
    }
  };

  // -----------------------------------------------------------
  // STEP 1: Submit Initial Details -> Trigger OTP
  // -----------------------------------------------------------
  const handleContinueDetails = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError(t("fullName") + " is required");
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 8) {
      setError(t("invalidMobile"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t("invalidEmail"));
      return;
    }

    // If mobile is already verified from previous redirect, go to email
    if (isMobileVerified) {
      await handleSendEmailOtpForStep3();
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendMobileOtp(countryCode, cleanMobile);
      if (res.success) {
        setMobileCountdown(60);
        setStep(2); // Mobile OTP step
        setSuccessMsg(`${t("otpSentTo")} ${countryCode} ${cleanMobile}`);
      } else {
        setError(res.message || "Failed to send mobile OTP");
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // STEP 2: Verify Mobile OTP
  // -----------------------------------------------------------
  const handleVerifyMobile = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!mobileOtp || mobileOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyMobileOtp(countryCode, mobileNumber, mobileOtp, false);
      if (res.success) {
        setIsMobileVerified(true);
        setSuccessMsg(t("mobileVerified"));
        // Advance to email OTP
        await handleSendEmailOtpForStep3();
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendMobileOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.sendMobileOtp(countryCode, mobileNumber);
      if (res.success) {
        setMobileCountdown(60);
        setSuccessMsg(`${t("otpSentTo")} ${countryCode} ${mobileNumber}`);
      } else {
        setError(res.message || "Failed to resend mobile OTP");
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // STEP 3: Send & Verify Email OTP -> Complete Registration
  // -----------------------------------------------------------
  const handleSendEmailOtpForStep3 = async () => {
    if (isEmailVerified) {
      await performFinalRegistration();
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendEmailOtp(email.trim());
      if (res.success) {
        setEmailCountdown(60);
        setStep(3);
        setSuccessMsg(t("otpSentEmail"));
      } else {
        setError(res.message || "Failed to send email OTP");
        setStep(3);
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!emailOtp || emailOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyEmailOtp(email.trim(), emailOtp, false);
      if (res.success) {
        setIsEmailVerified(true);
        // Both mobile and email are verified! Complete account creation immediately
        await performFinalRegistration();
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.sendEmailOtp(email.trim());
      if (res.success) {
        setEmailCountdown(60);
        setSuccessMsg(t("otpSentEmail"));
      } else {
        setError(res.message || "Failed to resend email OTP");
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  // Perform backend user registration
  const performFinalRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authService.registerUser({
        name: name.trim(),
        email: email.trim(),
        countryCode,
        mobileNumber,
      });

      if (res.success) {
        handleAuthSuccess(res.token, res.user);
      } else {
        setError(res.message || "Registration failed");
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // GOOGLE SIGN-UP / AUTHENTICATION
  // -----------------------------------------------------------
  const handleGoogleSignUp = async () => {
    if (loading) return;

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setGoogleLoading(true);

    try {
      const res = await authService.loginWithGoogle();
      if (!res.success) {
        setError(res.error || res.message || t("googleAuthFailed"));
        return;
      }

      // If user requires mobile phone linking
      if (res.needsMobile) {
        setGoogleUserPending(res.user);
        setStep(4); // Google mobile linking step
        setSuccessMsg(t("googleLinkMobilePrompt"));
        return;
      }

      // Existing or complete user
      handleAuthSuccess(res.token, res.user);
    } catch (err) {
      setError(getCleanError(err, "googleAuthFailed"));
    } finally {
      setLoading(false);
      setGoogleLoading(false);
    }
  };

  const handleSendGoogleMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);
    const clean = googleMobileNumber.replace(/\D/g, "");
    if (!clean || clean.length < 8) {
      setError(t("invalidMobile"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendMobileOtp(googleCountryCode, clean);
      if (res.success) {
        setGoogleOtpSent(true);
        setGoogleCountdown(60);
        setGoogleOtp("");
        setSuccessMsg(`${t("otpSentTo")} ${googleCountryCode} ${clean}`);
      } else {
        setError(res.message || t("networkError"));
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGoogleMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);
    if (!googleOtp || googleOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.linkGoogleMobile(
        googleUserPending.email,
        googleCountryCode,
        googleMobileNumber,
        googleOtp
      );
      if (res.success) {
        handleAuthSuccess(res.token, res.user);
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  const selectedGoogleCountry = COUNTRY_CODES.find((c) => c.code === googleCountryCode) || COUNTRY_CODES[0];

  return (
    <div className={`auth-page-root ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <TopNavbar />

      <main className="auth-main-layout" id="main-content">
        <div className="auth-card-container">
          <section className="auth-card clay-card" aria-labelledby="signup-card-title">
            {/* Header */}
            {step === 1 ? (
              <div className="auth-card-header text-center">
                <div className="auth-badge-icon" aria-hidden="true">
                  <i className="bi bi-person-plus-fill"></i>
                </div>
                <h1 id="signup-card-title" className="auth-title">
                  {t("createAccount")}
                </h1>
                <p className="auth-subtitle">
                  Join the Emergency Response Coordinator platform
                </p>
              </div>
            ) : step === 2 ? (
              <div className="otp-step-header text-center">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  aria-label={t("changeNumber")}
                >
                  <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                  <span>{t("changeNumber")}</span>
                </button>

                <div className="auth-badge-icon" aria-hidden="true">
                  <i className="bi bi-shield-check"></i>
                </div>
                <h1 id="signup-card-title" className="auth-title">
                  {t("verifyMobileNumber")}
                </h1>
                <p className="auth-subtitle">
                  {t("otpSentTo")}{" "}
                  <strong className="otp-target-text">{countryCode} {mobileNumber}</strong>
                </p>
              </div>
            ) : step === 3 ? (
              <div className="otp-step-header text-center">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  aria-label={t("changeEmail")}
                >
                  <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                  <span>{t("changeEmail")}</span>
                </button>

                <div className="auth-badge-icon" aria-hidden="true">
                  <i className="bi bi-envelope-check-fill"></i>
                </div>
                <h1 id="signup-card-title" className="auth-title">
                  {t("verifyEmailAddress")}
                </h1>
                <p className="auth-subtitle">
                  {t("otpSentTo")}{" "}
                  <strong className="otp-target-text">{email}</strong>
                </p>
              </div>
            ) : (
              <div className="otp-step-header text-center">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                >
                  <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                  <span>Back</span>
                </button>

                <div className="auth-badge-icon" aria-hidden="true">
                  <i className="bi bi-phone-fill"></i>
                </div>
                <h1 id="signup-card-title" className="auth-title">
                  {t("verifyMobileNumber")}
                </h1>
                <p className="auth-subtitle">
                  {t("googleLinkMobilePrompt")}
                </p>
              </div>
            )}

            {/* Compact Reserved Feedback / Error Region */}
            <div className="auth-feedback-area" aria-live="polite">
              {error && (
                <div className="auth-alert error" role="alert">
                  <i className="bi bi-exclamation-circle-fill alert-icon" aria-hidden="true"></i>
                  <span className="alert-text">{error}</span>
                </div>
              )}
              {successMsg && !error && (
                <div className="auth-alert success" role="status">
                  <i className="bi bi-check-circle-fill alert-icon" aria-hidden="true"></i>
                  <span className="alert-text">{successMsg}</span>
                </div>
              )}
            </div>

            {/* ===================================================
                STEP 1: CLEAN SINGLE INITIAL FORM
                =================================================== */}
            {step === 1 && (
              <>
                <form onSubmit={handleContinueDetails} className="auth-form-panel">
                  {/* Full Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-name">
                      {t("fullName")}
                    </label>
                    <div className="input-prefix-container">
                      <span className="input-prefix-icon" aria-hidden="true">
                        <i className="bi bi-person-fill"></i>
                      </span>
                      <div className="unified-divider" aria-hidden="true" />
                      <input
                        id="signup-name"
                        type="text"
                        className="prefix-input-field"
                        placeholder={t("fullNamePlaceholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-mobile">
                      {t("mobileNumber")}
                    </label>
                    <div className="phone-unified-container">
                      <div className="country-trigger">
                        <span className="country-flag">{selectedCountry.flag}</span>
                        <span className="country-code-text">{selectedCountry.shortLabel || selectedCountry.code}</span>
                        <i className="bi bi-chevron-down country-caret" aria-hidden="true"></i>
                        <select
                          id="signup-country-code"
                          className="country-select-hidden"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          disabled={loading}
                          aria-label={t("countryCode")}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="unified-divider" aria-hidden="true" />
                      <input
                        id="signup-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        className="phone-unified-input"
                        placeholder={t("mobilePlaceholder")}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d]/g, ""))}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-email">
                      {t("emailAddress")}
                    </label>
                    <div className="input-prefix-container">
                      <span className="input-prefix-icon" aria-hidden="true">
                        <i className="bi bi-envelope-fill"></i>
                      </span>
                      <div className="unified-divider" aria-hidden="true" />
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        className="prefix-input-field"
                        placeholder={t("emailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Primary Continue Button */}
                  <button
                    id="btn-signup-continue"
                    type="submit"
                    className="btn-clay-primary"
                    disabled={loading || !name.trim() || !mobileNumber.trim() || !email.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" role="status" aria-hidden="true"></span>
                        <span>{t("sendingOtp")}</span>
                      </>
                    ) : (
                      <span>{t("continue")}</span>
                    )}
                  </button>
                </form>

                {/* Subtle Divider */}
                <div className="auth-divider">
                  <span className="auth-divider-line" aria-hidden="true" />
                  <span className="auth-divider-text">{t("or")}</span>
                  <span className="auth-divider-line" aria-hidden="true" />
                </div>

                {/* Google Sign-Up Button */}
                <div className="auth-social-section">
                  <button
                    id="btn-google-signup"
                    type="button"
                    className="btn-google-clay"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    aria-label={t("continueWithGoogle")}
                  >
                    {googleLoading ? (
                      <>
                        <span className="btn-spinner google-spinner" role="status" aria-hidden="true"></span>
                        <span>{t("connectingToGoogle")}</span>
                      </>
                    ) : (
                      <>
                        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.39 7.34 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.61 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                          />
                        </svg>
                        <span>{t("continueWithGoogle")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Footer Switcher */}
                <div className="auth-card-footer">
                  <span className="footer-prompt">Already have an account? </span>
                  <Link to="/login" className="auth-link">
                    {t("login")}
                  </Link>
                </div>
              </>
            )}

            {/* ===================================================
                STEP 2: VERIFY MOBILE OTP
                =================================================== */}
            {step === 2 && (
              <form onSubmit={handleVerifyMobile} className="otp-verification-panel" aria-label="Verify mobile OTP">
                <div className="form-group otp-group">
                  <label className="form-label otp-label" htmlFor="signup-mobile-otp-digit-0">
                    {t("enterOtpHint")}
                  </label>
                  <OtpInput
                    value={mobileOtp}
                    onChange={setMobileOtp}
                    disabled={loading}
                    idPrefix="signup-mobile-otp"
                    autoFocus
                  />
                </div>

                <div className="resend-row">
                  {mobileCountdown > 0 ? (
                    <span className="countdown-text">
                      <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                      {t("resendIn")} <strong>{mobileCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-link-resend"
                      onClick={handleResendMobileOtp}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
                      <span>{t("resendOtp")}</span>
                    </button>
                  )}
                </div>

                <button
                  id="btn-verify-signup-mobile"
                  type="submit"
                  className="btn-clay-primary"
                  disabled={loading || mobileOtp.length !== 6}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" role="status" aria-hidden="true"></span>
                      <span>{t("verifying")}</span>
                    </>
                  ) : (
                    <span>{t("verifyMobileNumber")}</span>
                  )}
                </button>
              </form>
            )}

            {/* ===================================================
                STEP 3: VERIFY EMAIL OTP & COMPLETE
                =================================================== */}
            {step === 3 && (
              <form onSubmit={handleVerifyEmail} className="otp-verification-panel" aria-label="Verify email OTP">
                <div className="form-group otp-group">
                  <label className="form-label otp-label" htmlFor="signup-email-otp-digit-0">
                    {t("enterOtpHint")}
                  </label>
                  <OtpInput
                    value={emailOtp}
                    onChange={setEmailOtp}
                    disabled={loading}
                    idPrefix="signup-email-otp"
                    autoFocus
                  />
                </div>

                <div className="resend-row">
                  {emailCountdown > 0 ? (
                    <span className="countdown-text">
                      <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                      {t("resendIn")} <strong>{emailCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-link-resend"
                      onClick={handleResendEmailOtp}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
                      <span>{t("resendOtp")}</span>
                    </button>
                  )}
                </div>

                <button
                  id="btn-verify-signup-email"
                  type="submit"
                  className="btn-clay-primary"
                  disabled={loading || emailOtp.length !== 6}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" role="status" aria-hidden="true"></span>
                      <span>{t("verifying")}</span>
                    </>
                  ) : (
                    <span>Verify &amp; {t("completeSignUp")}</span>
                  )}
                </button>
              </form>
            )}

            {/* ===================================================
                GOOGLE MOBILE LINKING STEP
                =================================================== */}
            {step === 4 && (
              <div className="google-mobile-step">
                {!googleOtpSent ? (
                  <form onSubmit={handleSendGoogleMobileOtp} className="auth-form-panel">
                    <div className="form-group">
                      <label className="form-label" htmlFor="google-mobile-input">
                        {t("mobileNumber")}
                      </label>
                      <div className="phone-unified-container">
                        <div className="country-trigger">
                          <span className="country-flag">{selectedGoogleCountry.flag}</span>
                          <span className="country-code-text">{selectedGoogleCountry.shortLabel || selectedGoogleCountry.code}</span>
                          <i className="bi bi-chevron-down country-caret" aria-hidden="true"></i>
                          <select
                            id="google-country-code"
                            className="country-select-hidden"
                            value={googleCountryCode}
                            onChange={(e) => setGoogleCountryCode(e.target.value)}
                            disabled={loading}
                            aria-label={t("countryCode")}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="unified-divider" aria-hidden="true" />
                        <input
                          id="google-mobile-input"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          className="phone-unified-input"
                          placeholder={t("mobilePlaceholder")}
                          value={googleMobileNumber}
                          onChange={(e) => setGoogleMobileNumber(e.target.value.replace(/[^\d]/g, ""))}
                          disabled={loading}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      id="btn-send-google-mobile-otp"
                      type="submit"
                      className="btn-clay-primary"
                      disabled={loading || !googleMobileNumber.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="btn-spinner" role="status" aria-hidden="true"></span>
                          <span>{t("sendingOtp")}</span>
                        </>
                      ) : (
                        <span>{t("sendOtp")}</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyGoogleMobileOtp} className="otp-verification-panel">
                    <div className="form-group otp-group">
                      <label className="form-label otp-label" htmlFor="google-signup-otp-digit-0">
                        {t("enterOtpHint")}
                      </label>
                      <OtpInput
                        value={googleOtp}
                        onChange={setGoogleOtp}
                        disabled={loading}
                        idPrefix="google-signup-otp"
                        autoFocus
                      />
                    </div>

                    <div className="resend-row">
                      {googleCountdown > 0 ? (
                        <span className="countdown-text">
                          <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                          {t("resendIn")} <strong>{googleCountdown}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-link-resend"
                          onClick={handleSendGoogleMobileOtp}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
                          <span>{t("resendOtp")}</span>
                        </button>
                      )}
                    </div>

                    <button
                      id="btn-verify-google-mobile-otp"
                      type="submit"
                      className="btn-clay-primary"
                      disabled={loading || googleOtp.length !== 6}
                    >
                      {loading ? (
                        <>
                          <span className="btn-spinner" role="status" aria-hidden="true"></span>
                          <span>{t("verifying")}</span>
                        </>
                      ) : (
                        <span>Verify &amp; Link Account</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
