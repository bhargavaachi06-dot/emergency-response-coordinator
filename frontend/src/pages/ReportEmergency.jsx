import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import { EMERGENCY_TYPES } from '../data/demoData';
import { TRANSLATIONS, speakText } from '../data/translations';
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

// Helpful subtitle descriptions for standard mode
const TYPE_DESCRIPTIONS = {
  medical: 'Cardiac arrest, trauma, unconsciousness or acute illness',
  road_accident: 'Vehicle collisions, pedestrian incidents & roadway blockages',
  fire: 'Structural, residential, smoke or hazardous chemical fire',
  crime: 'Assaults, ongoing safety threats, burglaries & security incidents',
  natural_disaster: 'Flash floods, severe storms, landslides & structural collapse',
  other: 'Urgent situations requiring emergency triage and coordination',
};

// Visual emergency cards configuration for Simple Mode
const SIMPLE_TYPE_CARDS = [
  {
    key: 'medical',
    iconEmoji: '🩺',
    iconClass: 'bi-heart-pulse-fill',
    color: '#DC2626',
    bgTint: 'rgba(220, 38, 38, 0.12)',
  },
  {
    key: 'road_accident',
    iconEmoji: '🚗',
    iconClass: 'bi-car-front-fill',
    color: '#EA580C',
    bgTint: 'rgba(234, 88, 12, 0.12)',
  },
  {
    key: 'fire',
    iconEmoji: '🔥',
    iconClass: 'bi-fire',
    color: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.12)',
  },
  {
    key: 'crime',
    iconEmoji: '🛡️',
    iconClass: 'bi-shield-exclamation',
    color: '#38BDF8',
    bgTint: 'rgba(56, 189, 248, 0.12)',
  },
  {
    key: 'natural_disaster',
    iconEmoji: '🌊',
    iconClass: 'bi-cloud-rain-heavy-fill',
    color: '#0284C7',
    bgTint: 'rgba(2, 132, 199, 0.12)',
  },
  {
    key: 'other',
    iconEmoji: '❓',
    iconClass: 'bi-question-circle-fill',
    color: '#94A3B8',
    bgTint: 'rgba(148, 163, 184, 0.12)',
  },
];

export default function ReportEmergency() {
  const navigate = useNavigate();
  const { addEmergency } = useApp();

  // Mode: 'simple' (default for accessibility) or 'standard'
  const [reportingMode, setReportingMode] = useState('simple');
  // Language: 'en' or 'te'
  const [lang, setLang] = useState('en');

  // Form state shared between both modes
  const [form, setForm] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Active translation dictionary
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update form fields
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

  // Speech Recognition Handler
  const handleStartListening = () => {
    setSpeechError('');
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError(t.speechUnsupported);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'te' ? 'te-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechTranscript('');
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setSpeechTranscript(transcript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError(t.speechDenied);
        } else if (event.error === 'no-speech') {
          setSpeechError(t.speechAgain);
        } else {
          setSpeechError(t.speechDenied);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition failed:', err);
      setIsListening(false);
      setSpeechError(t.speechDenied);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleApplyVoiceTranscript = () => {
    if (speechTranscript) {
      setField(
        'description',
        form.description
          ? `${form.description} ${speechTranscript}`
          : speechTranscript
      );
      setSpeechTranscript('');
    }
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

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form validation
  const validate = () => {
    const errs = {};

    if (!form.type) {
      errs.type = t.errSelectType;
    }

    if (!form.description.trim()) {
      errs.description = t.errDescription;
    } else if (form.description.trim().length < 10) {
      errs.description = t.errDescription;
    }

    return errs;
  };

  // Submission handler (preserves 100% of existing payload and backend flow)
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 160, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const emergencyType =
        EMERGENCY_TYPES.find((item) => item.value === form.type)?.label ||
        form.type;

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
            result?.error ||
            t.errGeneral ||
            'Unable to submit emergency report. Please try again.',
        });
        return;
      }

      // Navigates to existing confirmation view
      navigate('/citizen/confirmation');
    } catch (error) {
      console.error('Emergency submission error:', error);
      setErrors({
        submit: t.errGeneral || 'Unable to submit emergency report. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Read out summary in Simple Mode
  const handleReadSummary = () => {
    const typeLabel = t.types[form.type]?.spoken || form.type || 'Emergency';
    const locText =
      form.locationStatus === 'detected'
        ? t.locationCaptured
        : form.locationAddress || 'Not specified';
    const spokenText = `${t.reviewTitle}. ${t.summaryType}: ${typeLabel}. ${t.summaryLocation}: ${locText}. ${t.summaryDescription}: ${form.description || 'Not provided'}.`;
    speakText(spokenText, lang);
  };

  // Step progress for Standard Mode
  const isStep1Done = Boolean(form.type);
  const isStep2Done = Boolean((form.lat && form.lng) || form.locationAddress.trim());
  const isStep3Done = form.description.trim().length >= 10;

  return (
    <AppLayout
      title={reportingMode === 'simple' ? t.headerTitle : 'Report Emergency'}
      subtitle={
        reportingMode === 'simple'
          ? t.headerSubtitle
          : 'Submit an incident report for immediate AI triage and dispatch'
      }
    >
      <div className="report-page-wrapper">
        <div className="report-page-container">
          {/* Top navigation row with back button and mode switch */}
          <div className="report-top-bar">
            <BackButton fallback="/citizen" />

            <div className="report-mode-controls">
              {/* Language Selector */}
              <div
                className="report-lang-toggle"
                role="group"
                aria-label="Language Selector"
              >
                <button
                  type="button"
                  className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`lang-btn ${lang === 'te' ? 'active' : ''}`}
                  onClick={() => setLang('te')}
                  aria-pressed={lang === 'te'}
                >
                  తెలుగు
                </button>
              </div>

              {/* Mode Switcher */}
              <div
                className="report-mode-toggle"
                role="group"
                aria-label="Reporting Mode Switcher"
              >
                <button
                  type="button"
                  className={`mode-toggle-btn ${
                    reportingMode === 'simple' ? 'active' : ''
                  }`}
                  onClick={() => setReportingMode('simple')}
                  aria-pressed={reportingMode === 'simple'}
                >
                  <i className="bi bi-person-arms-up me-1"></i>
                  {t.simpleMode}
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${
                    reportingMode === 'standard' ? 'active' : ''
                  }`}
                  onClick={() => setReportingMode('standard')}
                  aria-pressed={reportingMode === 'standard'}
                >
                  <i className="bi bi-card-checklist me-1"></i>
                  {t.standardMode}
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================
              SIMPLE MODE (ACCESSIBLE / VOICE / VISUAL)
              ===================================================== */}
          {reportingMode === 'simple' && (
            <div className="simple-report-flow" role="region" aria-label="Simple Emergency Reporting">
              {/* Header Card */}
              <header className="report-header-card simple-header-card" role="banner">
                <div className="report-header-top">
                  <div className="report-title-wrap">
                    <div className="report-title-icon" aria-hidden="true">
                      <i className="bi bi-exclamation-octagon-fill"></i>
                    </div>
                    <div>
                      <h1 className="report-main-title">{t.headerTitle}</h1>
                      <p className="report-subtitle">{t.headerSubtitle}</p>
                    </div>
                  </div>

                  <div className="report-header-actions">
                    <div className="report-status-badge" role="status">
                      <span className="report-pulse-dot" aria-hidden="true"></span>
                      <span>{t.systemReady}</span>
                    </div>

                    <button
                      type="button"
                      className="btn-tts-listen"
                      onClick={() => speakText(t.instructionSpeech, lang)}
                      title={t.listenInstructions}
                      aria-label={t.listenInstructions}
                    >
                      <i className="bi bi-volume-up-fill" aria-hidden="true"></i>
                      <span>{t.listenInstructions}</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* SECTION 1: VISUAL EMERGENCY TYPE (6 Large Cards) */}
              <section className="report-section-card simple-section-card" aria-labelledby="type-section-heading">
                <div className="report-section-header">
                  <h2 className="report-section-title" id="type-section-heading">
                    <i className="bi bi-grid-fill text-info" aria-hidden="true"></i>
                    {t.typesTitle}
                  </h2>
                  <span className="text-secondary small">{t.typesSubtitle}</span>
                </div>

                <div className="report-section-body">
                  <div className="simple-types-grid" role="radiogroup" aria-label={t.typesTitle}>
                    {SIMPLE_TYPE_CARDS.map((card) => {
                      const isSelected = form.type === card.key;
                      const typeData = t.types[card.key] || {};
                      return (
                        <button
                          key={card.key}
                          type="button"
                          className={`simple-type-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setField('type', card.key);
                            speakText(typeData.spoken || typeData.label, lang);
                          }}
                          role="radio"
                          aria-checked={isSelected}
                          style={{
                            borderColor: isSelected ? '#38BDF8' : '#26344D',
                          }}
                        >
                          <div
                            className="simple-type-icon-box"
                            style={{
                              backgroundColor: card.bgTint,
                              color: card.color,
                            }}
                            aria-hidden="true"
                          >
                            <span className="type-emoji">{card.iconEmoji}</span>
                          </div>
                          <div className="simple-type-details">
                            <span className="simple-type-name">{typeData.label}</span>
                            <span className="simple-type-sublabel">{typeData.sublabel}</span>
                          </div>
                          {isSelected && (
                            <div className="simple-type-badge" aria-hidden="true">
                              <i className="bi bi-check-lg"></i>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {errors.type && (
                    <div className="report-inline-error mt-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                      <span>{errors.type}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 2: SPEAK INSTEAD OF TYPE (Voice Assistant) */}
              <section className="report-section-card simple-section-card" aria-labelledby="voice-section-heading">
                <div className="report-section-header">
                  <h2 className="report-section-title" id="voice-section-heading">
                    <i className="bi bi-mic-fill text-danger" aria-hidden="true"></i>
                    {t.voiceSectionTitle}
                  </h2>
                  <button
                    type="button"
                    className="btn-tts-listen-inline"
                    onClick={() =>
                      speakText(
                        lang === 'te'
                          ? 'మైక్రోఫోన్ నొక్కి ఏం జరిగిందో మాట్లాడండి'
                          : 'Tap the microphone and tell us what happened',
                        lang
                      )
                    }
                    aria-label="Listen audio"
                  >
                    <i className="bi bi-volume-up-fill"></i>
                  </button>
                </div>

                <div className="report-section-body">
                  <p className="simple-voice-intro">{t.voiceSubtitle}</p>

                  <div className="voice-action-wrapper text-center my-3">
                    {!isListening ? (
                      <button
                        type="button"
                        className="btn-voice-record"
                        onClick={handleStartListening}
                        aria-label={t.tapToSpeak}
                      >
                        <i className="bi bi-mic-fill voice-mic-icon" aria-hidden="true"></i>
                        <span className="voice-record-label">{t.tapToSpeak}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-voice-recording active"
                        onClick={handleStopListening}
                        aria-label={t.stopListening}
                      >
                        <span className="voice-pulse-ring" aria-hidden="true"></span>
                        <i className="bi bi-stop-circle-fill voice-mic-icon" aria-hidden="true"></i>
                        <span className="voice-record-label">{t.listening}</span>
                      </button>
                    )}
                  </div>

                  {/* Speech Transcript Output */}
                  {speechTranscript && (
                    <div className="voice-transcript-card" role="region" aria-live="polite">
                      <div className="transcript-header">
                        <span className="transcript-label">{t.weHeard}</span>
                        <button
                          type="button"
                          className="btn-transcript-listen"
                          onClick={() => speakText(speechTranscript, lang)}
                          title="Listen to transcription"
                        >
                          <i className="bi bi-volume-up-fill"></i>
                        </button>
                      </div>
                      <blockquote className="transcript-text">"{speechTranscript}"</blockquote>
                      <div className="transcript-actions">
                        <button
                          type="button"
                          className="btn-use-transcript"
                          onClick={handleApplyVoiceTranscript}
                        >
                          <i className="bi bi-check-circle-fill me-1"></i>
                          {t.useThis}
                        </button>
                        <button
                          type="button"
                          className="btn-retry-transcript"
                          onClick={handleStartListening}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i>
                          {t.speakAgain}
                        </button>
                      </div>
                    </div>
                  )}

                  {speechError && (
                    <div className="alert-voice-notice" role="alert">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      <span>{speechError}</span>
                    </div>
                  )}

                  {/* Fallback & Typed Description */}
                  <div className="simple-text-fallback mt-4">
                    <label htmlFor="simple-desc-input" className="report-label">
                      {t.descriptionLabel} <span className="report-label-required">*</span>
                    </label>
                    <textarea
                      id="simple-desc-input"
                      className="report-textarea-dark simple-textarea"
                      rows={3}
                      placeholder={t.descriptionPlaceholder}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      maxLength={500}
                    />
                    <div className="report-char-count">
                      {form.description.length} / 500 {t.charCount}
                    </div>

                    {errors.description && (
                      <div className="report-inline-error" role="alert">
                        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                        <span>{errors.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 3: AUTOMATIC LOCATION */}
              <section className="report-section-card simple-section-card" aria-labelledby="location-section-heading">
                <div className="report-section-header">
                  <h2 className="report-section-title" id="location-section-heading">
                    <i className="bi bi-geo-alt-fill text-warning" aria-hidden="true"></i>
                    {t.locationSectionTitle}
                  </h2>
                </div>

                <div className="report-section-body">
                  <button
                    type="button"
                    className="btn-large-location"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    aria-label={t.useMyLocation}
                  >
                    {locationLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        <span>{t.detectingLocation}</span>
                      </>
                    ) : form.locationStatus === 'detected' ? (
                      <>
                        <i className="bi bi-check-circle-fill text-success fs-5"></i>
                        <span className="text-success fw-bold">{t.locationCaptured}</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-geo-fill fs-5 text-info"></i>
                        <span>{t.useMyLocation}</span>
                      </>
                    )}
                  </button>

                  {form.locationStatus === 'error' && (
                    <div className="location-error-card mt-3">
                      <div className="text-warning mb-2 fw-semibold">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        {t.locationFailed}
                      </div>
                    </div>
                  )}

                  <div className="landmark-field-wrap mt-3">
                    <label htmlFor="simple-landmark-input" className="report-label">
                      {t.enterNearbyLabel}
                    </label>
                    <input
                      id="simple-landmark-input"
                      type="text"
                      className="report-input-dark"
                      placeholder={t.enterNearbyPlaceholder}
                      value={form.locationAddress}
                      onChange={(e) => setField('locationAddress', e.target.value)}
                    />
                    <small className="text-muted d-block mt-1">
                      {t.locationOptionalNote}
                    </small>
                  </div>
                </div>
              </section>

              {/* SECTION 4: OPTIONAL PHOTO */}
              <section className="report-section-card simple-section-card" aria-labelledby="photo-section-heading">
                <div className="report-section-header">
                  <h2 className="report-section-title" id="photo-section-heading">
                    <i className="bi bi-camera-fill text-info" aria-hidden="true"></i>
                    {t.photoSectionTitle}
                  </h2>
                </div>

                <div className="report-section-body">
                  {!imagePreview ? (
                    <div
                      className="simple-photo-box"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          fileInputRef.current?.click();
                        }
                      }}
                      aria-label={t.takePhoto}
                    >
                      <i className="bi bi-camera fs-2 text-info mb-2 d-block"></i>
                      <span className="fw-bold d-block text-light">{t.takePhoto}</span>
                      <span className="text-secondary small">{t.photoOptional}</span>
                    </div>
                  ) : (
                    <div className="report-preview-container">
                      <img
                        src={imagePreview}
                        alt="Emergency situation preview"
                        className="report-preview-img"
                      />
                      <button
                        type="button"
                        className="report-remove-img-btn"
                        onClick={handleRemoveImage}
                        aria-label={t.removePhoto}
                      >
                        <i className="bi bi-trash-fill me-1"></i>
                        {t.removePhoto}
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </div>
              </section>

              {/* SECTION 5: PRE-SUBMISSION CONFIRMATION SUMMARY CARD */}
              <section className="simple-summary-card" aria-labelledby="summary-heading">
                <div className="summary-card-top">
                  <div>
                    <h3 className="summary-card-title" id="summary-heading">
                      <i className="bi bi-shield-check text-success me-2"></i>
                      {t.reviewTitle}
                    </h3>
                    <p className="summary-card-sub">{t.reviewSubtitle}</p>
                  </div>

                  <button
                    type="button"
                    className="btn-tts-listen-inline"
                    onClick={handleReadSummary}
                    title={t.listenSummary}
                    aria-label={t.listenSummary}
                  >
                    <i className="bi bi-volume-up-fill me-1"></i>
                    <span>{t.listenSummary}</span>
                  </button>
                </div>

                <div className="summary-grid">
                  <div className="summary-row">
                    <span className="summary-label">{t.summaryType}:</span>
                    <span className="summary-value">
                      {form.type
                        ? t.types[form.type]?.label || form.type
                        : '— (Not selected)'}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">{t.summaryLocation}:</span>
                    <span className="summary-value">
                      {form.locationStatus === 'detected'
                        ? t.locationCaptured
                        : form.locationAddress || '— (No landmark provided)'}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">{t.summaryDescription}:</span>
                    <span className="summary-value">
                      {form.description
                        ? form.description.length > 80
                          ? `${form.description.slice(0, 80)}...`
                          : form.description
                        : '— (No details yet)'}
                    </span>
                  </div>

                  {imagePreview && (
                    <div className="summary-row">
                      <span className="summary-label">{t.summaryPhoto}:</span>
                      <span className="summary-value text-success">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {t.photoAttached}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submission Error Banner if any */}
                {errors.submit && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <span>{errors.submit}</span>
                  </div>
                )}

                {/* Primary Large Send Button */}
                <button
                  type="button"
                  className="btn-submit-emergency btn-large-simple-submit mt-4"
                  onClick={handleSubmit}
                  disabled={loading}
                  id="simple-submit-emergency-btn"
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span>{t.submittingReport}</span>
                    </>
                  ) : (
                    <>
                      <span>🚨 {t.sendReport}</span>
                    </>
                  )}
                </button>
              </section>

              {/* HUMAN-IN-THE-LOOP PLAIN LANGUAGE NOTICE */}
              <div className="simple-hitl-note mt-4" role="note">
                <i className="bi bi-shield-lock-fill text-info fs-5 me-2"></i>
                <span>{t.hitlNotice}</span>
              </div>
            </div>
          )}

          {/* =====================================================
              STANDARD MODE (DETAILED OPERATIONAL REPORTING FORM)
              ===================================================== */}
          {reportingMode === 'standard' && (
            <div className="standard-report-flow" role="region" aria-label="Standard Emergency Reporting">
              {/* Header Panel */}
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

              {/* Step Progress Indicator */}
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

              {/* Form Container */}
              <form onSubmit={handleSubmit} noValidate>
                {/* 1. Emergency Type Selection */}
                <section className="report-section-card" aria-labelledby="std-type-title">
                  <div className="report-section-header">
                    <h2 className="report-section-title" id="std-type-title">
                      <i className="bi bi-grid-3x3-gap-fill text-danger" aria-hidden="true"></i>
                      Select Emergency Type
                    </h2>
                    <span className="badge bg-danger text-light">Required</span>
                  </div>

                  <div className="report-section-body">
                    <div className="report-types-grid" role="radiogroup" aria-label="Emergency Types">
                      {EMERGENCY_TYPES.map((type) => {
                        const isSelected = form.type === type.value;
                        return (
                          <div
                            key={type.value}
                            className={`emergency-type-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setField('type', type.value)}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                setField('type', type.value);
                              }
                            }}
                          >
                            <div className="type-card-top">
                              <div
                                className="type-card-icon-wrap"
                                style={{
                                  backgroundColor: `${type.color}20`,
                                  color: type.color,
                                }}
                              >
                                <i className={`bi ${type.icon}`}></i>
                              </div>
                              {isSelected && (
                                <div className="type-check-badge">
                                  <i className="bi bi-check-lg"></i>
                                </div>
                              )}
                            </div>
                            <div className="type-card-label">{type.label}</div>
                            <p className="type-card-desc">
                              {TYPE_DESCRIPTIONS[type.value] || 'Immediate dispatch support'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {errors.type && (
                      <div className="report-inline-error" role="alert">
                        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                        <span>{errors.type}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. Incident Location */}
                <section className="report-section-card" aria-labelledby="std-location-title">
                  <div className="report-section-header">
                    <h2 className="report-section-title" id="std-location-title">
                      <i className="bi bi-geo-alt-fill text-warning" aria-hidden="true"></i>
                      Incident Location
                    </h2>
                  </div>

                  <div className="report-section-body">
                    <button
                      type="button"
                      className="btn-detect-gps"
                      onClick={detectLocation}
                      disabled={locationLoading}
                      id="detect-location-btn"
                    >
                      {locationLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          <span>Detecting GPS Location...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-crosshair2 fs-5"></i>
                          <span>Use My Current GPS Location</span>
                        </>
                      )}
                    </button>

                    {form.locationStatus === 'detected' && (
                      <div className="location-status-banner location-status-success" role="status">
                        <i className="bi bi-check-circle-fill"></i>
                        <span>
                          Coordinates locked: {form.lat}, {form.lng}
                        </span>
                      </div>
                    )}

                    {form.locationStatus === 'error' && (
                      <div className="location-status-banner location-status-error" role="alert">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        <span>
                          Could not access GPS. Please type the location or landmark below.
                        </span>
                      </div>
                    )}

                    <div className="report-input-group mt-3">
                      <label className="report-label" htmlFor="std-location-address">
                        Street Address / Landmark
                      </label>
                      <input
                        id="std-location-address"
                        type="text"
                        className="report-input-dark"
                        placeholder="e.g. Near Metro Pillar 140, Outer Ring Road"
                        value={form.locationAddress}
                        onChange={(e) => setField('locationAddress', e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Description & Situation Details */}
                <section className="report-section-card" aria-labelledby="std-details-title">
                  <div className="report-section-header">
                    <h2 className="report-section-title" id="std-details-title">
                      <i className="bi bi-card-text text-info" aria-hidden="true"></i>
                      Emergency Details
                    </h2>
                    <span className="badge bg-danger text-light">Required</span>
                  </div>

                  <div className="report-section-body">
                    <div className="report-input-group">
                      <label className="report-label" htmlFor="std-description">
                        What is happening? <span className="report-label-required">*</span>
                      </label>
                      <textarea
                        id="std-description"
                        className="report-textarea-dark"
                        rows={4}
                        placeholder="Describe what happened, number of injured persons, visible hazards..."
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                        maxLength={500}
                      />
                      <div className="report-char-count">
                        {form.description.length} / 500 characters (min 10)
                      </div>

                      {errors.description && (
                        <div className="report-inline-error" role="alert">
                          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                          <span>{errors.description}</span>
                        </div>
                      )}
                    </div>

                    {/* Image Attachment */}
                    <div className="report-input-group">
                      <label className="report-label">Photo Attachment (Optional)</label>
                      {!imagePreview ? (
                        <div
                          className="report-upload-box"
                          onClick={() => fileInputRef.current?.click()}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              fileInputRef.current?.click();
                            }
                          }}
                        >
                          <i className="bi bi-camera fs-3 text-secondary mb-2 d-block"></i>
                          <span className="text-light fw-semibold d-block">
                            Click to take or upload a photo
                          </span>
                          <span className="text-muted small">Supports JPG, PNG (Max 10MB)</span>
                        </div>
                      ) : (
                        <div className="report-preview-container">
                          <img
                            src={imagePreview}
                            alt="Emergency attachment"
                            className="report-preview-img"
                          />
                          <button
                            type="button"
                            className="report-remove-img-btn"
                            onClick={handleRemoveImage}
                          >
                            <i className="bi bi-x-circle-fill me-1"></i>
                            Remove
                          </button>
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

                    {/* Optional Hazards & Gate Codes */}
                    <div className="report-input-group m-0 mt-3">
                      <label className="report-label" htmlFor="std-additional-info">
                        Hazards, Entrances, or Gate Codes
                      </label>
                      <textarea
                        id="std-additional-info"
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
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                    }}
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

                {/* Primary Submission Button */}
                <button
                  type="submit"
                  className="btn-submit-emergency"
                  disabled={loading}
                  id="submit-emergency-btn"
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <span>🚨 Submit Emergency Report</span>
                    </>
                  )}
                </button>
              </form>

              {/* AI / Memory Footnote */}
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}