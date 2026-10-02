import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import { getAuthText } from "../data/authTranslations";
import OtpInput from "../components/OtpInput";
import { TopNavbar } from "../components/Navigation";
import "./LoginPage.css";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", shortLabel: "IN +91", flag: "🇮🇳" },
  { code: "+1", label: "US / Canada (+1)", shortLabel: "US +1", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", shortLabel: "UK +44", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", shortLabel: "UAE +971", flag: "🇦🇪" },
  { code: "+61", label: "Australia (+61)", shortLabel: "AU +61", flag: "🇦🇺" },
  { code: "+65", label: "Singapore (+65)", shortLabel: "SG +65", flag: "🇸🇬" },
  { code: "+966", label: "Saudi Arabia (+966)", shortLabel: "SA +966", flag: "🇸🇦" },
];

export default function LoginPage() {
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
      return "Unable to connect to the emergency response server. Please try again.";
    }
    if (raw.includes("unexpected token") || raw.includes("not valid json") || raw.includes("doctype")) {
      return "Unable to connect to the emergency response server. Please try again.";
    }
    if (raw.includes("not available yet") || raw.includes("404") || raw.includes("cannot post")) {
      return "The authentication service is not available yet. Please try again shortly.";
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
      return t("incorrectOtp");
    }
    if (raw.includes("too soon") || raw.includes("wait before") || raw.includes("cooldown")) {
      return t("resendTooSoon");
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

  // Active auth tab: 'mobile' | 'email'
  const [authMethod, setAuthMethod] = useState("mobile");

  // Mobile Auth State
  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileCountdown, setMobileCountdown] = useState(0);

  // Email Auth State
  const [email, setEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);

  // Google Flow State (for users needing mobile verification)
  const [googleUserPending, setGoogleUserPending] = useState(null);
  const [googleMobileStep, setGoogleMobileStep] = useState(false);
  const [googleMobileNumber, setGoogleMobileNumber] = useState("");
  const [googleCountryCode, setGoogleCountryCode] = useState("+91");
  const [googleOtpSent, setGoogleOtpSent] = useState(false);
  const [googleOtp, setGoogleOtp] = useState("");
  const [googleCountdown, setGoogleCountdown] = useState(0);

  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Countdown timer effects
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
  const handleLoginSuccess = (token, user) => {
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
  // 1. MOBILE LOGIN HANDLERS
  // -----------------------------------------------------------
  const handleSendMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccessMsg(null);

    const clean = mobileNumber.replace(/\D/g, "");
    if (!clean || clean.length < 8) {
      setError(t("invalidMobile"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendMobileOtp(countryCode, clean);
      if (res.success) {
        setMobileOtpSent(true);
        setMobileCountdown(60);
        setMobileOtp("");
        setSuccessMsg(`${t("otpSentTo")} ${countryCode} ${clean}`);
      } else {
        setError(res.message || t("networkError"));
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);

    if (!mobileOtp || mobileOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyMobileOtp(countryCode, mobileNumber, mobileOtp, true);
      if (res.success) {
        if (res.needsRegistration) {
          // New user -> redirect to SignUp with prefilled mobile
          navigate("/signup", {
            state: {
              prefillMobile: mobileNumber,
              prefillCountryCode: countryCode,
              mobileVerified: true,
            },
          });
        } else {
          handleLoginSuccess(res.token, res.user);
        }
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 2. EMAIL LOGIN HANDLERS
  // -----------------------------------------------------------
  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccessMsg(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError(t("invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendEmailOtp(trimmedEmail);
      if (res.success) {
        setEmailOtpSent(true);
        setEmailCountdown(60);
        setEmailOtp("");
        setSuccessMsg(t("otpSentEmail"));
      } else {
        setError(res.message || t("networkError"));
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError(null);

    if (!emailOtp || emailOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyEmailOtp(email.trim(), emailOtp, true);
      if (res.success) {
        if (res.needsRegistration) {
          // New user -> redirect to SignUp with prefilled email
          navigate("/signup", {
            state: {
              prefillEmail: email.trim(),
              emailVerified: true,
            },
          });
        } else {
          handleLoginSuccess(res.token, res.user);
        }
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 3. GOOGLE LOGIN HANDLER
  // -----------------------------------------------------------
  const handleGoogleLogin = async () => {
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

      // Check if user needs mobile verification
      if (res.needsMobile) {
        setGoogleUserPending(res.user);
        setGoogleMobileStep(true);
        setSuccessMsg(t("googleLinkMobilePrompt"));
        return;
      }

      // Existing verified user
      handleLoginSuccess(res.token, res.user);
    } catch (err) {
      setError(getCleanError(err, "googleAuthFailed"));
    } finally {
      setLoading(false);
      setGoogleLoading(false);
    }
  };

  // Google flow: Send Mobile OTP
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

  // Google flow: Verify Mobile OTP & Link
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
        handleLoginSuccess(res.token, res.user);
      } else {
        setError(res.message || t("incorrectOtp"));
      }
    } catch (err) {
      setError(getCleanError(err, "incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  // Check if current flow is in OTP entry state
  const isOtpStep = (authMethod === "mobile" && mobileOtpSent) || (authMethod === "email" && emailOtpSent);

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  const selectedGoogleCountry = COUNTRY_CODES.find((c) => c.code === googleCountryCode) || COUNTRY_CODES[0];

  return (
    <div className={`auth-page-root ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <TopNavbar />

      <main className="auth-main-layout" id="main-content">
        <div className="auth-card-container">
          <section className="auth-card clay-card" aria-labelledby="login-card-title">
            {/* Google Mobile Verification Flow */}
            {googleMobileStep ? (
              <div className="google-mobile-step">
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => {
                    setGoogleMobileStep(false);
                    setGoogleOtpSent(false);
                    setGoogleOtp("");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                  <span>Back</span>
                </button>

                <div className="auth-card-header text-center">
                  <div className="auth-badge-icon">
                    <i className="bi bi-phone-fill"></i>
                  </div>
                  <h1 id="login-card-title" className="auth-title">
                    {t("verifyMobileNumber")}
                  </h1>
                  <p className="auth-subtitle">{t("googleLinkMobilePrompt")}</p>
                </div>

                {/* Compact Reserved Feedback Region */}
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
                      <label className="form-label otp-label" htmlFor="google-otp-digit-0">
                        {t("enterOtpHint")}
                      </label>
                      <OtpInput
                        value={googleOtp}
                        onChange={setGoogleOtp}
                        disabled={loading}
                        idPrefix="google-otp"
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
                        <span>{t("verifyAndLogin")}</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <>
                {/* Top Card Header */}
                {!isOtpStep ? (
                  <div className="auth-card-header text-center">
                    <div className="auth-badge-icon" aria-hidden="true">
                      🚨
                    </div>
                    <h1 id="login-card-title" className="auth-title">
                      {t("welcomeBack")}
                    </h1>
                    <p className="auth-subtitle">{t("signInToContinue")}</p>
                  </div>
                ) : (
                  <div className="otp-step-header text-center">
                    <button
                      type="button"
                      className="btn-back-link"
                      onClick={() => {
                        if (authMethod === "mobile") {
                          setMobileOtpSent(false);
                          setMobileOtp("");
                        } else {
                          setEmailOtpSent(false);
                          setEmailOtp("");
                        }
                        setError(null);
                      }}
                      aria-label={authMethod === "mobile" ? t("changeNumber") : t("changeEmail")}
                    >
                      <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
                      <span>{authMethod === "mobile" ? t("changeNumber") : t("changeEmail")}</span>
                    </button>

                    <div className="auth-badge-icon" aria-hidden="true">
                      <i className="bi bi-shield-check"></i>
                    </div>

                    <h1 id="login-card-title" className="auth-title">
                      {authMethod === "mobile" ? t("verifyYourMobile") : t("verifyYourEmail")}
                    </h1>
                    <p className="auth-subtitle">
                      {t("otpSentTo")}{" "}
                      <strong className="otp-target-text">
                        {authMethod === "mobile" ? `${countryCode} ${mobileNumber}` : email}
                      </strong>
                    </p>
                  </div>
                )}

                {/* Method Switcher Segmented Control */}
                {!isOtpStep && (
                  <div className="method-switcher-section">
                    <span className="method-switcher-label">{t("howToSignIn")}</span>
                    <div className="segmented-control" role="tablist" aria-label="Sign in method">
                      <button
                        type="button"
                        id="tab-mobile"
                        role="tab"
                        aria-selected={authMethod === "mobile"}
                        aria-controls="panel-mobile"
                        className={`segmented-tab ${authMethod === "mobile" ? "active" : ""}`}
                        onClick={() => {
                          setAuthMethod("mobile");
                          setError(null);
                          setSuccessMsg(null);
                        }}
                      >
                        <span className="tab-icon" aria-hidden="true">📱</span>
                        <span>{t("mobile")}</span>
                      </button>

                      <button
                        type="button"
                        id="tab-email"
                        role="tab"
                        aria-selected={authMethod === "email"}
                        aria-controls="panel-email"
                        className={`segmented-tab ${authMethod === "email" ? "active" : ""}`}
                        onClick={() => {
                          setAuthMethod("email");
                          setError(null);
                          setSuccessMsg(null);
                        }}
                      >
                        <span className="tab-icon" aria-hidden="true">✉</span>
                        <span>{t("email")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact Reserved Feedback Region */}
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

                {/* METHOD A: MOBILE LOGIN */}
                {authMethod === "mobile" && (
                  <div id="panel-mobile" role="tabpanel" aria-labelledby="tab-mobile" className="auth-tab-panel">
                    {!mobileOtpSent ? (
                      <form onSubmit={handleSendMobileOtp} className="auth-form-panel">
                        <div className="form-group">
                          <label className="form-label" htmlFor="login-mobile-input">
                            {t("mobileNumber")}
                          </label>
                          <div className="phone-unified-container">
                            <div className="country-trigger">
                              <span className="country-flag">{selectedCountry.flag}</span>
                              <span className="country-code-text">{selectedCountry.shortLabel || selectedCountry.code}</span>
                              <i className="bi bi-chevron-down country-caret" aria-hidden="true"></i>
                              <select
                                id="login-country-code"
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
                              id="login-mobile-input"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              className="phone-unified-input"
                              placeholder={t("mobilePlaceholder")}
                              value={mobileNumber}
                              onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d]/g, ""))}
                              disabled={loading}
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        <button
                          id="btn-send-mobile-otp"
                          type="submit"
                          className="btn-clay-primary"
                          disabled={loading || !mobileNumber.trim()}
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
                      <form onSubmit={handleVerifyMobileOtp} className="otp-verification-panel" aria-label="Verify mobile OTP">
                        <div className="form-group otp-group">
                          <label className="form-label otp-label" htmlFor="mobile-login-otp-digit-0">
                            {t("enterOtpHint")}
                          </label>
                          <OtpInput
                            value={mobileOtp}
                            onChange={setMobileOtp}
                            disabled={loading}
                            idPrefix="mobile-login-otp"
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
                              onClick={handleSendMobileOtp}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
                              <span>{t("resendOtp")}</span>
                            </button>
                          )}
                        </div>

                        <button
                          id="btn-verify-mobile-otp"
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
                            <span>{t("verifyAndLogin")}</span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* METHOD B: EMAIL LOGIN */}
                {authMethod === "email" && (
                  <div id="panel-email" role="tabpanel" aria-labelledby="tab-email" className="auth-tab-panel">
                    {!emailOtpSent ? (
                      <form onSubmit={handleSendEmailOtp} className="auth-form-panel">
                        <div className="form-group">
                          <label className="form-label" htmlFor="login-email-input">
                            {t("emailAddress")}
                          </label>
                          <div className="email-unified-container">
                            <span className="email-prefix-icon" aria-hidden="true">
                              <i className="bi bi-envelope-fill"></i>
                            </span>
                            <div className="unified-divider" aria-hidden="true" />
                            <input
                              id="login-email-input"
                              type="email"
                              autoComplete="email"
                              className="email-unified-input"
                              placeholder={t("emailPlaceholder")}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={loading}
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        <button
                          id="btn-send-email-otp"
                          type="submit"
                          className="btn-clay-primary"
                          disabled={loading || !email.trim()}
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
                      <form onSubmit={handleVerifyEmailOtp} className="otp-verification-panel" aria-label="Verify email OTP">
                        <div className="form-group otp-group">
                          <label className="form-label otp-label" htmlFor="email-login-otp-digit-0">
                            {t("enterOtpHint")}
                          </label>
                          <OtpInput
                            value={emailOtp}
                            onChange={setEmailOtp}
                            disabled={loading}
                            idPrefix="email-login-otp"
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
                              onClick={handleSendEmailOtp}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
                              <span>{t("resendOtp")}</span>
                            </button>
                          )}
                        </div>

                        <button
                          id="btn-verify-email-otp"
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
                            <span>{t("verifyAndLogin")}</span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Show Google Sign-In and Separator only when not actively verifying OTP */}
                {!isOtpStep && (
                  <>
                    <div className="auth-divider">
                      <span className="auth-divider-line" aria-hidden="true" />
                      <span className="auth-divider-text">{t("or")}</span>
                      <span className="auth-divider-line" aria-hidden="true" />
                    </div>

                    <div className="auth-social-section">
                      <button
                        id="btn-google-login"
                        type="button"
                        className="btn-google-clay"
                        onClick={handleGoogleLogin}
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
                      <span className="footer-prompt">Don't have an account? </span>
                      <Link to="/signup" className="auth-link">
                        {t("createAccount")}
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
