import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import { EMERGENCY_TYPES } from '../data/demoData';
import './ReportEmergency.css';

const INITIAL_FORM = {
  type: '',
  description: '',
  lat: '',
  lng: '',
  locationAddress: '',
  locationStatus: '',
  additionalInfo: '',
};

// Helpful subtitle descriptions for each emergency category
const TYPE_DESCRIPTIONS = {
  medical: 'Cardiac arrest, trauma, unconsciousness or acute illness',
  road_accident: 'Vehicle collisions, pedestrian incidents & roadway blockages',
  fire: 'Structural, residential, smoke or hazardous chemical fire',
  crime: 'Assaults, ongoing safety threats, burglaries & security incidents',
  natural_disaster: 'Flash floods, severe storms, landslides & structural collapse',
  other: 'Urgent situations requiring emergency triage and coordination',
};

export default function ReportEmergency() {
  const navigate = useNavigate();
  const { addEmergency } = useApp();

  const [form, setForm] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  // Field updater
  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: '',
      }));
    }
  };

  // GPS Location Detection
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setField('locationStatus', 'error');
      return;
    }

    setLocationLoading(true);
    setField('locationStatus', 'detecting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          locationStatus: 'detected',
        }));
        setLocationLoading(false);
      },
      () => {
        setField('locationStatus', 'error');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Optional image handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Image must be smaller than 10 MB.',
      }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Please select a valid image file (JPG, PNG, WEBP).',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Form validation
  const validate = () => {
    const errs = {};

    if (!form.type) {
      errs.type = 'Please select an emergency type.';
    }

    if (!form.description.trim()) {
      errs.description = 'Please describe the emergency.';
    } else if (form.description.trim().length < 10) {
      errs.description = 'Please provide more detail (at least 10 characters).';
    }

    return errs;
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Smoothly scroll to the first error
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const emergencyType =
        EMERGENCY_TYPES.find((t) => t.value === form.type)?.label || form.type;

      let description = form.description.trim();
      if (form.additionalInfo.trim()) {
        description += `\n\nAdditional Information: ${form.additionalInfo.trim()}`;
      }

      const latitude = form.lat ? parseFloat(form.lat) : null;
      const longitude = form.lng ? parseFloat(form.lng) : null;

      let locationText = 'Location not detected';
      if (form.locationAddress.trim()) {
        locationText = form.locationAddress.trim();
        if (form.lat && form.lng) {
          locationText += ` (GPS: ${form.lat}, ${form.lng})`;
        }
      } else if (form.lat && form.lng) {
        locationText = `Lat: ${form.lat}, Lng: ${form.lng}`;
      }

      const result = await addEmergency({
        type: emergencyType,
        description,
        latitude,
        longitude,
        locationText,
      });

      if (!result?.success) {
        setErrors({
          submit:
            result?.error || 'Unable to submit emergency report. Please try again.',
        });
        return;
      }

      // Navigates to existing confirmation view
      navigate('/citizen/confirmation');
    } catch (error) {
      console.error('Emergency submission error:', error);
      setErrors({
        submit: 'Unable to submit emergency report. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute step progress completion
  const isStep1Done = Boolean(form.type);
  const isStep2Done = Boolean((form.lat && form.lng) || form.locationAddress.trim());
  const isStep3Done = form.description.trim().length >= 10;

  return (
    <AppLayout
      title="Report Emergency"
      subtitle="Submit an incident report for immediate AI triage and dispatch"
    >
      <div className="report-page-wrapper">
        <div className="report-page-container">
          <BackButton fallback="/citizen" />

        {/* =====================================================
            1. COMMAND HEADER & SYSTEM STATUS
            ===================================================== */}
        <header className="report-header-card" role="banner">
          <div className="report-header-top">
            <div className="report-title-wrap">
              <div className="report-title-icon" aria-hidden="true">
                <i className="bi bi-exclamation-octagon-fill"></i>
              </div>
              <div>
                <h1 className="report-main-title">Report an Emergency</h1>
                <p className="report-subtitle">
                  Provide the essential details so the response team can act quickly.
                </p>
              </div>
            </div>

            <div className="report-status-badge" role="status">
              <span className="report-pulse-dot" aria-hidden="true"></span>
              <span>SYSTEM READY</span>
            </div>
          </div>
        </header>

        {/* =====================================================
            2. STEP PROGRESS INDICATOR
            ===================================================== */}
        <div className="report-steps-bar" aria-label="Reporting Stages">
          <div className={`report-step-item ${isStep1Done ? 'completed' : 'active'}`}>
            <span className="report-step-num">{isStep1Done ? '✓' : '1'}</span>
            <span className="report-step-text">Emergency Type</span>
          </div>

          <div
            className={`report-step-item ${
              isStep2Done ? 'completed' : isStep1Done ? 'active' : ''
            }`}
          >
            <span className="report-step-num">{isStep2Done ? '✓' : '2'}</span>
            <span className="report-step-text">Location</span>
          </div>

          <div
            className={`report-step-item ${
              isStep3Done ? 'completed' : isStep2Done ? 'active' : ''
            }`}
          >
            <span className="report-step-num">{isStep3Done ? '✓' : '3'}</span>
            <span className="report-step-text">Details</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* =====================================================
              3. EMERGENCY TYPE SELECTION
              ===================================================== */}
          <section className="report-section-card" aria-labelledby="type-section-title">
            <div className="report-section-header">
              <h2 id="type-section-title" className="report-section-title">
                <i className="bi bi-tag-fill text-danger" aria-hidden="true"></i>
                <span>1. Select Emergency Type</span>
                <span className="report-label-required">*</span>
              </h2>
              {form.type && (
                <span className="badge bg-danger text-uppercase" style={{ fontSize: '10.5px' }}>
                  {form.type.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="report-section-body">
              <div
                className="report-types-grid"
                role="radiogroup"
                aria-label="Emergency category selection"
              >
                {EMERGENCY_TYPES.map((t) => {
                  const isSelected = form.type === t.value;

                  return (
                    <div
                      key={t.value}
                      className={`emergency-type-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setField('type', t.value)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setField('type', t.value);
                        }
                      }}
                      style={{
                        borderColor: isSelected ? t.color : undefined,
                      }}
                    >
                      <div className="type-card-top">
                        <div
                          className="type-card-icon-wrap"
                          style={{
                            background: isSelected ? `${t.color}25` : 'rgba(30, 41, 59, 0.7)',
                            color: t.color,
                          }}
                        >
                          <i className={`bi ${t.icon}`}></i>
                        </div>

                        {isSelected && (
                          <div className="type-check-badge" aria-hidden="true">
                            <i className="bi bi-check-lg"></i>
                          </div>
                        )}
                      </div>

                      <div className="type-card-label">{t.label}</div>
                      <p className="type-card-desc">
                        {TYPE_DESCRIPTIONS[t.value] || 'Standard emergency protocol'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {errors.type && (
                <div className="report-inline-error" role="alert">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  <span>{errors.type}</span>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================
              4. LOCATION CAPTURE & ADDRESS
              ===================================================== */}
          <section className="report-section-card" aria-labelledby="location-section-title">
            <div className="report-section-header">
              <h2 id="location-section-title" className="report-section-title">
                <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true"></i>
                <span>2. Incident Location</span>
              </h2>
              {form.lat && form.lng && (
                <span className="badge bg-success" style={{ fontSize: '10.5px' }}>
                  GPS Locked
                </span>
              )}
            </div>

            <div className="report-section-body">
              {/* Quick GPS Action Button */}
              <button
                type="button"
                className="btn-detect-gps"
                onClick={detectLocation}
                disabled={locationLoading}
                id="detect-location-btn"
                aria-label="Use Current Location"
              >
                {locationLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Acquiring satellite GPS coordinates...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-crosshair2 fs-5"></i>
                    <span>Use My Current Location</span>
                  </>
                )}
              </button>

              {/* Status Banner */}
              {form.locationStatus === 'detected' && (
                <div className="location-status-banner location-status-success" role="status">
                  <i className="bi bi-check-circle-fill fs-5" aria-hidden="true"></i>
                  <div>
                    <strong>✓ Location captured:</strong> {form.lat}, {form.lng}
                    <div className="small text-secondary mt-1">
                      Coordinates will be routed directly to emergency dispatch map.
                    </div>
                  </div>
                </div>
              )}

              {form.locationStatus === 'error' && (
                <div className="location-status-banner location-status-error" role="alert">
                  <i className="bi bi-exclamation-triangle-fill fs-5" aria-hidden="true"></i>
                  <div>
                    <strong>Unable to detect GPS location.</strong> Please allow location permissions in your browser or provide street details below.
                  </div>
                </div>
              )}

              {/* Manual Location Inputs */}
              <div className="report-input-group">
                <label className="report-label" htmlFor="location-address">
                  Street Address / Landmark (Optional)
                </label>
                <input
                  id="location-address"
                  type="text"
                  className="report-input-dark"
                  placeholder="e.g. Near Oak Street Metro station, Sector 4"
                  value={form.locationAddress}
                  onChange={(e) => setField('locationAddress', e.target.value)}
                />
              </div>

              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="report-label" htmlFor="manual-lat">
                    Latitude
                  </label>
                  <input
                    id="manual-lat"
                    type="text"
                    className="report-input-dark font-monospace"
                    placeholder="e.g. 28.613900"
                    value={form.lat}
                    onChange={(e) => setField('lat', e.target.value)}
                  />
                </div>

                <div className="col-sm-6">
                  <label className="report-label" htmlFor="manual-lng">
                    Longitude
                  </label>
                  <input
                    id="manual-lng"
                    type="text"
                    className="report-input-dark font-monospace"
                    placeholder="e.g. 77.209000"
                    value={form.lng}
                    onChange={(e) => setField('lng', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              5. EMERGENCY DESCRIPTION (WHAT IS HAPPENING)
              ===================================================== */}
          <section className="report-section-card" aria-labelledby="desc-section-title">
            <div className="report-section-header">
              <h2 id="desc-section-title" className="report-section-title">
                <i className="bi bi-file-text-fill text-muted" aria-hidden="true"></i>
                <span>3. Emergency Description</span>
                <span className="report-label-required">*</span>
              </h2>
              <span className="text-secondary small font-monospace">
                {form.description.length} / 500
              </span>
            </div>

            <div className="report-section-body">
              <div className="report-input-group m-0">
                <label className="report-label" htmlFor="emergency-desc">
                  What is happening?
                </label>
                <textarea
                  id="emergency-desc"
                  className="report-textarea-dark"
                  rows={4}
                  maxLength={500}
                  placeholder="Example: Two vehicles collided near the main road. One person appears injured and traffic is blocked."
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  aria-describedby="desc-char-count"
                />

                {errors.description && (
                  <div className="report-inline-error" role="alert">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{errors.description}</span>
                  </div>
                )}

                <div id="desc-char-count" className="report-char-count">
                  {form.description.length} / 500 characters (minimum 10 characters)
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              6. OPTIONAL SUPPLEMENTARY DETAILS (IMAGE & NOTES)
              ===================================================== */}
          <section className="report-section-card" aria-labelledby="optional-section-title">
            <div className="report-section-header">
              <h2 id="optional-section-title" className="report-section-title">
                <i className="bi bi-paperclip text-secondary" aria-hidden="true"></i>
                <span>Additional Details (Optional)</span>
              </h2>
              <span className="badge bg-secondary-subtle text-secondary small">Optional</span>
            </div>

            <div className="report-section-body">
              {/* Optional Photo Attachment */}
              <div className="report-input-group">
                <span className="report-label">Scene Photo</span>
                {imagePreview ? (
                  <div className="report-preview-container">
                    <img
                      src={imagePreview}
                      alt="Incident scene preview"
                      className="report-preview-img"
                    />
                    <button
                      type="button"
                      className="report-remove-img-btn"
                      onClick={() => {
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i> Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className="report-upload-box"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    aria-label="Upload emergency scene photo"
                  >
                    <i className="bi bi-camera fs-3 text-secondary mb-2 d-block"></i>
                    <div className="fw-semibold text-light mb-1">Attach Scene Photo</div>
                    <div className="small text-secondary">
                      Click to browse · JPG, PNG, WEBP up to 10 MB
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </div>

              {/* Optional Notes */}
              <div className="report-input-group m-0 mt-3">
                <label className="report-label" htmlFor="additional-info">
                  Hazards, Entrances, or Gate Codes
                </label>
                <textarea
                  id="additional-info"
                  className="report-textarea-dark"
                  rows={2}
                  placeholder="Any gate codes, electrical hazards, fuel spills, or landmark tips..."
                  value={form.additionalInfo}
                  onChange={(e) => setField('additionalInfo', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Submission Error Banner */}
          {errors.submit && (
            <div
              className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 mb-3"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5' }}
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <span className="fw-semibold">{errors.submit}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleSubmit}
              >
                Try Again
              </button>
            </div>
          )}

          {/* =====================================================
              7. PRIMARY SUBMISSION BUTTON
              ===================================================== */}
          <button
            type="submit"
            className="btn-submit-emergency"
            disabled={loading}
            id="submit-emergency-btn"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Submitting Report...</span>
              </>
            ) : (
              <>
                <span>🚨 Submit Emergency Report</span>
              </>
            )}
          </button>
        </form>

        {/* =====================================================
            8. AI / MEMORY INFORMATIONAL FOOTNOTE PANEL
            ===================================================== */}
        <aside className="report-ai-info-panel" aria-label="Triage Protocol Information">
          <div className="report-ai-info-title">
            <i className="bi bi-cpu-fill" aria-hidden="true"></i>
            <span>🧠 What happens next?</span>
          </div>
          <p className="report-ai-info-text">
            Your report is analyzed by AI to identify the emergency category, severity, priority, and recommended responders. Relevant previous incident experience may also be recalled through persistent memory. A human coordinator remains responsible for response decisions.
          </p>
        </aside>
      </div>
    </div>
  </AppLayout>
  );
}