import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import { getAuthText } from "../data/authTranslations";
import OtpInput from "../components/OtpInput";
import { TopNavbar } from "../components/Navigation";
import "./LoginPage.css";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+1", label: "US / Canada (+1)", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
  { code: "+966", label: "Saudi Arabia (+966)", flag: "🇸🇦" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { citizenLanguage, isRtl, login: setAuthSession } = useApp();

  const t = (key) => getAuthText(key, citizenLanguage);

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
  const [emailVerifiedBadge, setEmailVerifiedBadge] = useState(false);

  // Google Flow State (for users needing mobile verification)
  const [googleUserPending, setGoogleUserPending] = useState(null);
  const [googleMobileStep, setGoogleMobileStep] = useState(false);
  const [googleMobileNumber, setGoogleMobileNumber] = useState("");
  const [googleCountryCode, setGoogleCountryCode] = useState("+91");
  const [googleOtpSent, setGoogleOtpSent] = useState(false);
  const [googleOtp, setGoogleOtp] = useState("");
  const [googleCountdown, setGoogleCountdown] = useState(0);

  // Shared UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Countdown timer effect
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

  // Handle successful login completion
  const handleLoginSuccess = (token, user) => {
    if (setAuthSession) {
      setAuthSession(token, user);
    }
    const fromPath = location.state?.from || "/";
    navigate(fromPath, { replace: true });
  };

  // -----------------------------------------------------------
  // 2A. MOBILE LOGIN HANDLERS
  // -----------------------------------------------------------
  const handleSendMobileOtp = async (e) => {
    if (e) e.preventDefault();
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
        setSuccessMsg(`${t("otpSentTo")} ${countryCode} ${clean}`);
      } else {
        setError(res.message || "Failed to send mobile OTP");
      }
    } catch (err) {
      setError(err.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (e) => {
    if (e) e.preventDefault();
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
          // Account doesn't exist yet, redirect to SignUp with pre-filled phone
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
      setError(err.message || t("incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 2B. EMAIL LOGIN HANDLERS
  // -----------------------------------------------------------
  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError(t("invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendEmailOtp(email.trim());
      if (res.success) {
        setEmailOtpSent(true);
        setEmailCountdown(60);
        setSuccessMsg(t("otpSentEmail"));
      } else {
        setError(res.message || "Failed to send email OTP");
      }
    } catch (err) {
      setError(err.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!emailOtp || emailOtp.length !== 6) {
      setError(t("enterOtpHint"));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyEmailOtp(email.trim(), emailOtp, true);
      if (res.success) {
        setEmailVerifiedBadge(true);
        if (res.needsRegistration) {
          // Account doesn't exist yet, redirect to SignUp with pre-filled email
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
      setError(err.message || t("incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 2C. GOOGLE LOGIN HANDLER
  // -----------------------------------------------------------
  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authService.loginWithGoogle();
      if (!res.success) {
        setError(res.error || res.message || t("googleAuthFailed"));
        setLoading(false);
        return;
      }

      // Check if user needs mobile verification
      if (res.needsMobile) {
        setGoogleUserPending(res.user);
        setGoogleMobileStep(true);
        setSuccessMsg(t("googleLinkMobilePrompt"));
        setLoading(false);
        return;
      }

      // Already has mobile verified -> Complete login
      handleLoginSuccess(res.token, res.user);
    } catch (err) {
      setError(err.message || t("googleAuthFailed"));
      setLoading(false);
    }
  };

  // Google flow: Send Mobile OTP
  const handleSendGoogleMobileOtp = async (e) => {
    if (e) e.preventDefault();
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
        setSuccessMsg(`${t("otpSentTo")} ${googleCountryCode} ${clean}`);
      } else {
        setError(res.message || "Failed to send mobile OTP");
      }
    } catch (err) {
      setError(err.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  // Google flow: Verify Mobile OTP & Link
  const handleVerifyGoogleMobileOtp = async (e) => {
    if (e) e.preventDefault();
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
      setError(err.message || t("incorrectOtp"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page-root ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <TopNavbar />

      <main className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-card-header">
            <div className="auth-brand-badge">
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <h1 className="auth-title">{t("welcomeBack")}</h1>
            <p className="auth-subtitle">{t("signInToContinue")}</p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="auth-alert error" role="alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success" role="status">
              <i className="bi bi-check-circle-fill"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Mobile Verification Modal / Step */}
          {googleMobileStep ? (
            <div className="google-mobile-step">
              <div className="step-badge">
                <i className="bi bi-phone"></i>
                <span>{t("verifyMobileNumber")}</span>
              </div>
              <p className="step-desc">
                {t("googleLinkMobilePrompt")}
              </p>

              {!googleOtpSent ? (
                <form onSubmit={handleSendGoogleMobileOtp}>
                  <div className="form-group">
                    <label className="form-label">{t("mobileNumber")}</label>
                    <div className="phone-input-row">
                      <select
                        className="country-select"
                        value={googleCountryCode}
                        onChange={(e) => setGoogleCountryCode(e.target.value)}
                        disabled={loading}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        className="form-input phone-number-input"
                        placeholder={t("mobilePlaceholder")}
                        value={googleMobileNumber}
                        onChange={(e) => setGoogleMobileNumber(e.target.value)}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-primary"
                    disabled={loading || !googleMobileNumber}
                  >
                    {loading ? t("sendingOtp") : t("sendOtp")}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyGoogleMobileOtp}>
                  <div className="form-group">
                    <label className="form-label">{t("enterOtpHint")}</label>
                    <OtpInput
                      value={googleOtp}
                      onChange={setGoogleOtp}
                      disabled={loading}
                      idPrefix="google-otp"
                    />
                  </div>

                  <div className="resend-row">
                    {googleCountdown > 0 ? (
                      <span className="countdown-text">
                        {t("resendIn")} {googleCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-link-resend"
                        onClick={handleSendGoogleMobileOtp}
                        disabled={loading}
                      >
                        {t("resendOtp")}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-auth-primary"
                    disabled={loading || googleOtp.length !== 6}
                  >
                    {loading ? t("verifying") : t("verifyAndLogin")}
                  </button>
                </form>
              )}

              <button
                type="button"
                className="btn-auth-secondary mt-3"
                onClick={() => setGoogleMobileStep(false)}
                disabled={loading}
              >
                Back to Login Options
              </button>
            </div>
          ) : (
            <>
              {/* Tabs for Mobile / Email */}
              <div className="auth-method-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === "mobile"}
                  className={`tab-btn ${authMethod === "mobile" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMethod("mobile");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  <i className="bi bi-phone me-1"></i>
                  <span>{t("continueWithMobile")}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === "email"}
                  className={`tab-btn ${authMethod === "email" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMethod("email");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  <i className="bi bi-envelope me-1"></i>
                  <span>{t("continueWithEmail")}</span>
                </button>
              </div>

              {/* Method A: Mobile Login */}
              {authMethod === "mobile" && (
                <div className="tab-pane">
                  {!mobileOtpSent ? (
                    <form onSubmit={handleSendMobileOtp}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="login-mobile-input">
                          {t("mobileNumber")}
                        </label>
                        <div className="phone-input-row">
                          <select
                            id="login-country-code"
                            className="country-select"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            disabled={loading}
                            aria-label={t("countryCode")}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <input
                            id="login-mobile-input"
                            type="tel"
                            className="form-input phone-number-input"
                            placeholder={t("mobilePlaceholder")}
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            disabled={loading}
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        id="btn-send-mobile-otp"
                        type="submit"
                        className="btn-auth-primary"
                        disabled={loading || !mobileNumber}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {t("sendingOtp")}
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send-fill me-2"></i>
                            {t("sendOtp")}
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyMobileOtp}>
                      <div className="otp-verification-panel">
                        <div className="otp-sent-info">
                          <span className="otp-target">
                            {t("otpSentTo")} <strong>{countryCode} {mobileNumber}</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-link-edit"
                            onClick={() => {
                              setMobileOtpSent(false);
                              setMobileOtp("");
                            }}
                          >
                            Edit
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label">{t("enterOtpHint")}</label>
                          <OtpInput
                            value={mobileOtp}
                            onChange={setMobileOtp}
                            disabled={loading}
                            idPrefix="mobile-login-otp"
                          />
                        </div>

                        <div className="resend-row">
                          {mobileCountdown > 0 ? (
                            <span className="countdown-text">
                              {t("resendIn")} <strong>{mobileCountdown}s</strong>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-link-resend"
                              onClick={handleSendMobileOtp}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              {t("resendOtp")}
                            </button>
                          )}
                        </div>

                        <button
                          id="btn-verify-mobile-otp"
                          type="submit"
                          className="btn-auth-primary"
                          disabled={loading || mobileOtp.length !== 6}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              {t("verifying")}
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check2-circle me-2"></i>
                              {t("verifyAndLogin")}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Method B: Email Login */}
              {authMethod === "email" && (
                <div className="tab-pane">
                  {!emailOtpSent ? (
                    <form onSubmit={handleSendEmailOtp}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="login-email-input">
                          {t("emailAddress")}
                        </label>
                        <div className="input-with-icon">
                          <i className="bi bi-envelope-fill input-icon"></i>
                          <input
                            id="login-email-input"
                            type="email"
                            className="form-input"
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
                        className="btn-auth-primary"
                        disabled={loading || !email}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {t("sendingOtp")}
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send-fill me-2"></i>
                            {t("sendOtp")}
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmailOtp}>
                      <div className="otp-verification-panel">
                        <div className="otp-sent-info">
                          <span className="otp-target">
                            {t("otpSentTo")} <strong>{email}</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-link-edit"
                            onClick={() => {
                              setEmailOtpSent(false);
                              setEmailOtp("");
                            }}
                          >
                            Edit
                          </button>
                        </div>

                        {emailVerifiedBadge && (
                          <div className="verified-badge-row">
                            <span className="badge-verified">
                              <i className="bi bi-patch-check-fill me-1"></i>
                              {t("emailVerified")}
                            </span>
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">{t("enterOtpHint")}</label>
                          <OtpInput
                            value={emailOtp}
                            onChange={setEmailOtp}
                            disabled={loading}
                            idPrefix="email-login-otp"
                          />
                        </div>

                        <div className="resend-row">
                          {emailCountdown > 0 ? (
                            <span className="countdown-text">
                              {t("resendIn")} <strong>{emailCountdown}s</strong>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-link-resend"
                              onClick={handleSendEmailOtp}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              {t("resendOtp")}
                            </button>
                          )}
                        </div>

                        <button
                          id="btn-verify-email-otp"
                          type="submit"
                          className="btn-auth-primary"
                          disabled={loading || emailOtp.length !== 6}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              {t("verifying")}
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check2-circle me-2"></i>
                              {t("verifyAndLogin")}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="auth-divider">
                <span>{t("or")}</span>
              </div>

              {/* Method C: Google Login */}
              <div className="auth-social-section">
                <button
                  id="btn-google-login"
                  type="button"
                  className="btn-google-oauth"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  aria-label={t("continueWithGoogle")}
                >
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
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
                </button>
              </div>

              {/* Footer Switcher */}
              <div className="auth-card-footer">
                <span>{t("dontHaveAccount")} </span>
                <Link to="/signup" className="auth-link">
                  {t("createAccount")}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
