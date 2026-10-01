import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import { getAuthText } from "../data/authTranslations";
import OtpInput from "../components/OtpInput";
import { TopNavbar } from "../components/Navigation";
import "./SignUpPage.css";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+1", label: "US / Canada (+1)", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
  { code: "+966", label: "Saudi Arabia (+966)", flag: "🇸🇦" },
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
      return t("networkError");
    }
    if (raw.includes("unexpected token") || raw.includes("not valid json") || raw.includes("doctype")) {
      return "The authentication service returned an unexpected response. Please try again.";
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
    return err?.message || (typeof err === "string" ? err : t(fallbackKey));
  };

  // Hidden file inputs for Camera & Gallery
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Registration step: 1 (Details) | 2 (Verify Mobile) | 3 (Verify Email) | 4 (Photo & Finish)
  const [step, setStep] = useState(1);

  // User form details
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState(location.state?.prefillCountryCode || "+91");
  const [mobileNumber, setMobileNumber] = useState(location.state?.prefillMobile || "");
  const [email, setEmail] = useState(location.state?.prefillEmail || "");
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Mobile OTP state
  const [mobileOtp, setMobileOtp] = useState("");
  const [isMobileVerified, setIsMobileVerified] = useState(Boolean(location.state?.mobileVerified));
  const [mobileCountdown, setMobileCountdown] = useState(0);

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(location.state?.emailVerified));
  const [emailCountdown, setEmailCountdown] = useState(0);

  // Shared UI state
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

  // Profile photo file handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePhoto(event.target.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // -----------------------------------------------------------
  // STEP 1 -> STEP 2: Submit Details & Send Mobile OTP
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

    // If mobile is already verified from previous redirect
    if (isMobileVerified) {
      // Advance directly to email verification
      handleSendEmailOtpForStep3();
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendMobileOtp(countryCode, cleanMobile);
      if (res.success) {
        setMobileCountdown(60);
        setStep(2);
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
        
        // Immediately trigger email OTP and advance to Step 3
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
  // STEP 3: Send & Verify Email OTP
  // -----------------------------------------------------------
  const handleSendEmailOtpForStep3 = async () => {
    if (isEmailVerified) {
      setStep(4);
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
        setStep(3); // Still advance so user sees retry
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
        setSuccessMsg(t("emailVerified"));
        // Advance to step 4 (Optional photo & finish)
        setStep(4);
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

  // -----------------------------------------------------------
  // STEP 4: Complete Registration
  // -----------------------------------------------------------
  const handleCompleteSignUp = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await authService.registerUser({
        name: name.trim(),
        email: email.trim(),
        countryCode,
        mobileNumber,
        profilePhoto,
      });

      if (res.success) {
        if (setAuthSession) {
          setAuthSession(res.token, res.user);
        }
        navigate("/", { replace: true });
      } else {
        setError(res.message || "Registration failed");
      }
    } catch (err) {
      setError(getCleanError(err, "networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page-root ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <TopNavbar />

      {/* Hidden file inputs for Camera and Gallery picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={handlePhotoSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoSelect}
      />

      <main className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-card-header">
            <div className="auth-brand-badge">
              <i className="bi bi-person-plus-fill"></i>
            </div>
            <h1 className="auth-title">
              {step === 1 && t("createAccount")}
              {step === 2 && t("verifyMobileNumber")}
              {step === 3 && t("verifyEmailAddress")}
              {step === 4 && t("verifyAccount")}
            </h1>
            <p className="auth-subtitle">
              {step === 1 && "Step 1 of 4: Enter details"}
              {step === 2 && "Step 2 of 4: Real SMS verification"}
              {step === 3 && "Step 3 of 4: Real email verification"}
              {step === 4 && "Step 4 of 4: Profile photo & complete"}
            </p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="signup-stepper" aria-label="Registration Progress">
            <div className={`step-dot ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>1</div>
            <div className={`step-line ${step >= 2 ? "active" : ""}`}></div>
            <div className={`step-dot ${step >= 2 ? "active" : ""} ${step > 2 ? "done" : ""}`}>2</div>
            <div className={`step-line ${step >= 3 ? "active" : ""}`}></div>
            <div className={`step-dot ${step >= 3 ? "active" : ""} ${step > 3 ? "done" : ""}`}>3</div>
            <div className={`step-line ${step >= 4 ? "active" : ""}`}></div>
            <div className={`step-dot ${step >= 4 ? "active" : ""}`}>4</div>
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

          {/* ===================================================
              STEP 1: DETAILS FORM (NAME, MOBILE, EMAIL, OPTIONAL PHOTO)
              =================================================== */}
          {step === 1 && (
            <form onSubmit={handleContinueDetails}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">
                  {t("fullName")} <span className="text-danger">*</span>
                </label>
                <div className="input-with-icon">
                  <i className="bi bi-person-fill input-icon"></i>
                  <input
                    id="signup-name"
                    type="text"
                    className="form-input"
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
                  {t("mobileNumber")} <span className="text-danger">*</span>
                </label>
                <div className="phone-input-row">
                  <select
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
                    id="signup-mobile"
                    type="tel"
                    className="form-input phone-number-input"
                    placeholder={t("mobilePlaceholder")}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">
                  {t("emailAddress")} <span className="text-danger">*</span>
                </label>
                <div className="input-with-icon">
                  <i className="bi bi-envelope-fill input-icon"></i>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-input"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Optional Profile Photo in Step 1 */}
              <div className="form-group photo-upload-box">
                <label className="form-label">{t("profilePhotoOptional")}</label>
                <div className="photo-action-container">
                  {profilePhoto ? (
                    <div className="photo-preview-wrapper">
                      <img src={profilePhoto} alt="Profile Preview" className="photo-preview-thumb" />
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={() => setProfilePhoto(null)}
                        title={t("removePhoto")}
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder-circle">
                      <i className="bi bi-person-bounding-box"></i>
                    </div>
                  )}

                  <div className="photo-buttons-group">
                    <button
                      type="button"
                      className="btn-photo-action"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={loading}
                    >
                      <i className="bi bi-camera-fill me-1"></i>
                      {t("takePhoto")}
                    </button>
                    <button
                      type="button"
                      className="btn-photo-action"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={loading}
                    >
                      <i className="bi bi-image me-1"></i>
                      {t("choosePhoto")}
                    </button>
                  </div>
                </div>
              </div>

              <button
                id="btn-signup-continue"
                type="submit"
                className="btn-auth-primary"
                disabled={loading || !name.trim() || !mobileNumber.trim() || !email.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {t("sendingOtp")}
                  </>
                ) : (
                  <>
                    <span>{t("continue")}</span>
                    <i className="bi bi-arrow-right ms-2"></i>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ===================================================
              STEP 2: VERIFY MOBILE OTP
              =================================================== */}
          {step === 2 && (
            <form onSubmit={handleVerifyMobile}>
              <div className="otp-verification-panel">
                <div className="otp-sent-info">
                  <span className="otp-target">
                    {t("otpSentTo")} <strong>{countryCode} {mobileNumber}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-link-edit"
                    onClick={() => setStep(1)}
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
                    idPrefix="signup-mobile-otp"
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
                      onClick={handleResendMobileOtp}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      {t("resendOtp")}
                    </button>
                  )}
                </div>

                <button
                  id="btn-verify-signup-mobile"
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
                      <i className="bi bi-shield-check me-2"></i>
                      {t("verifyMobileNumber")}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ===================================================
              STEP 3: VERIFY EMAIL OTP
              =================================================== */}
          {step === 3 && (
            <form onSubmit={handleVerifyEmail}>
              {/* Show Verified Mobile Badge */}
              <div className="verified-status-badges">
                <span className="badge-verified">
                  <i className="bi bi-patch-check-fill me-1"></i>
                  {t("mobileVerified")}
                </span>
              </div>

              <div className="otp-verification-panel">
                <div className="otp-sent-info">
                  <span className="otp-target">
                    {t("otpSentEmail")} <strong>{email}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-link-edit"
                    onClick={() => setStep(1)}
                  >
                    Edit
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("enterOtpHint")}</label>
                  <OtpInput
                    value={emailOtp}
                    onChange={setEmailOtp}
                    disabled={loading}
                    idPrefix="signup-email-otp"
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
                      onClick={handleResendEmailOtp}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      {t("resendOtp")}
                    </button>
                  )}
                </div>

                <button
                  id="btn-verify-signup-email"
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
                      <i className="bi bi-shield-check me-2"></i>
                      {t("verifyEmailAddress")}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ===================================================
              STEP 4: BOTH VERIFIED -> OPTIONAL PHOTO -> COMPLETE
              =================================================== */}
          {step === 4 && (
            <div className="completion-panel">
              {/* Verified Badges */}
              <div className="verified-status-badges stack">
                <span className="badge-verified">
                  <i className="bi bi-patch-check-fill me-1"></i>
                  {t("mobileVerified")}
                </span>
                <span className="badge-verified">
                  <i className="bi bi-patch-check-fill me-1"></i>
                  {t("emailVerified")}
                </span>
              </div>

              {/* Profile Photo (Optional) */}
              <div className="form-group photo-upload-box mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label m-0">{t("profilePhotoOptional")}</label>
                  <span className="optional-tag">{t("optional")}</span>
                </div>

                <div className="photo-action-container">
                  {profilePhoto ? (
                    <div className="photo-preview-wrapper">
                      <img src={profilePhoto} alt="Profile Preview" className="photo-preview-thumb" />
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={() => setProfilePhoto(null)}
                        title={t("removePhoto")}
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="photo-placeholder-circle">
                      <i className="bi bi-person-bounding-box"></i>
                    </div>
                  )}

                  <div className="photo-buttons-group">
                    <button
                      type="button"
                      className="btn-photo-action"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={loading}
                    >
                      <i className="bi bi-camera-fill me-1"></i>
                      {t("takePhoto")}
                    </button>
                    <button
                      type="button"
                      className="btn-photo-action"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={loading}
                    >
                      <i className="bi bi-image me-1"></i>
                      {t("choosePhoto")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="completion-actions">
                <button
                  id="btn-complete-signup"
                  type="button"
                  className="btn-auth-primary"
                  onClick={handleCompleteSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {t("verifying")}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-all me-2"></i>
                      {t("completeSignUp")}
                    </>
                  )}
                </button>

                {!profilePhoto && (
                  <button
                    type="button"
                    className="btn-auth-skip"
                    onClick={handleCompleteSignUp}
                    disabled={loading}
                  >
                    {t("skip")} &amp; {t("completeSignUp")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer switcher */}
          <div className="auth-card-footer">
            <span>{t("alreadyHaveAccount")} </span>
            <Link to="/login" className="auth-link">
              {t("login")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
