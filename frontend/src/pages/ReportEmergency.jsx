import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import LeafletMap from '../components/LeafletMap';
import { EMERGENCY_TYPES } from '../data/demoData';
import {
  LANGUAGES,
  TRANSLATIONS,
  getLanguage,
  isRTL,
  speakText,
} from '../data/translations';
import {
  getCurrentPosition,
  reverseGeocode,
  formatDistance,
  verifyEvidenceLocation,
} from '../services/locationService';
import { LiveCameraModal } from '../components/LiveCameraModal';
import './ReportEmergency.css';

const INITIAL_FORM = {
  type: '',
  description: '',
  // Location — full structured model
  lat: '',
  lng: '',
  accuracy: null,
  locationAddress: '',   // manual text fallback
  locationStatus: '',    // '' | 'detecting' | 'geocoding' | 'detected' | 'error' | 'denied' | 'unsupported' | 'timeout'
  locationError: '',
  // Reverse-geocoded address parts
  street: null,
  area: null,
  city: null,
  district: null,
  state: null,
  postalCode: null,
  country: null,
  formattedAddress: null,
};

// Visual emergency cards configuration
const EMERGENCY_CARDS = [
  {
    key: 'medical',
    iconEmoji: '🚑',
    iconClass: 'bi-heart-pulse-fill',
    color: '#DC2626',
  },
  {
    key: 'road_accident',
    iconEmoji: '🚗',
    iconClass: 'bi-car-front-fill',
    color: '#EA580C',
  },
  {
    key: 'fire',
    iconEmoji: '🔥',
    iconClass: 'bi-fire',
    color: '#F59E0B',
  },
  {
    key: 'crime',
    iconEmoji: '🛡️',
    iconClass: 'bi-shield-exclamation',
    color: '#38BDF8',
  },
  {
    key: 'natural_disaster',
    iconEmoji: '🌊',
    iconClass: 'bi-cloud-rain-heavy-fill',
    color: '#0284C7',
  },
  {
    key: 'other',
    iconEmoji: '❓',
    iconClass: 'bi-question-circle-fill',
    color: '#94A3B8',
  },
];

export default function ReportEmergency() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { addEmergency, language, setLanguage, openLangModal } = useApp();

  // Mode: 'simple' (default for ease) or 'standard'
  const [reportingMode, setReportingMode] = useState('simple');

  // Language state synchronized with global citizenLanguage
  const lang = language || 'en';

  // Modal drawer for selecting among 23 languages
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    type: routeLocation.state?.preselectedType || '',
  }));
  const [mediaList, setMediaList] = useState([]);
  const [mediaError, setMediaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);

  // Live emergency camera modal state (enforces device camera capture only)
  const [liveCameraModal, setLiveCameraModal] = useState({
    isOpen: false,
    mode: 'photo', // 'photo' | 'video'
  });

  // Safety override: user declares they cannot safely capture evidence
  const [safetyOverride, setSafetyOverride] = useState(false);
  // Camera/permission error message
  const [cameraError, setCameraError] = useState('');

  // Active language metadata and translation dictionary
  const currentLangMeta = getLanguage(lang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isCurrentRtl = isRTL(lang);

  // Accessibility ID
  const langSelectId = useId();

  // Save language selection to localStorage & AppContext
  const handleSelectLanguage = (newCode) => {
    if (LANGUAGES.some((l) => l.code === newCode)) {
      if (setLanguage) {
        setLanguage(newCode);
      }
      setLangModalOpen(false);
    }
  };

  // Cleanup speech recognition and synthesis on unmount
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

  // Update form fields and clear associated errors
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

  // Full GPS + Reverse Geocoding location detection
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setForm((prev) => ({
        ...prev,
        locationStatus: 'unsupported',
        locationError: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    setLocationLoading(true);
    setForm((prev) => ({
      ...prev,
      locationStatus: 'detecting',
      locationError: '',
    }));

    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude, accuracy } = pos;

      // Update coords immediately so map renders quickly
      setForm((prev) => ({
        ...prev,
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6),
        accuracy: accuracy ? Math.round(accuracy) : null,
        locationStatus: 'geocoding',
        locationError: '',
      }));

      // Reverse geocode with OpenStreetMap Nominatim
      let addressData = {
        street: null, area: null, city: null, district: null,
        state: null, postalCode: null, country: null, formattedAddress: null,
      };

      try {
        addressData = await reverseGeocode(latitude, longitude);
      } catch {
        // Geocoding fallback: raw GPS coordinates remain valid
      }

      setForm((prev) => ({
        ...prev,
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6),
        accuracy: accuracy ? Math.round(accuracy) : null,
        locationStatus: 'detected',
        locationError: '',
        ...addressData,
        // If geocoded, also populate locationAddress with formatted address
        locationAddress: addressData.formattedAddress ||
          prev.locationAddress ||
          `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      }));
    } catch (err) {
      const { code, message } = err || {};
      setForm((prev) => ({
        ...prev,
        locationStatus: code === 'DENIED' || code === 'GEOLOCATION_DENIED' ? 'denied' :
                        code === 'TIMEOUT' ? 'timeout' :
                        code === 'UNSUPPORTED' || code === 'GEOLOCATION_UNAVAILABLE' ? 'unsupported' : 'error',
        locationError: message || 'Could not detect location.',
      }));
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Map Click Location Selection Handler
  const handleMapLocationSelect = useCallback(async ({ lat, lng }) => {
    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) return;

    setLocationLoading(true);
    setForm((prev) => ({
      ...prev,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      locationStatus: 'geocoding',
      locationError: '',
    }));

    let addressData = {
      street: null, area: null, city: null, district: null,
      state: null, postalCode: null, country: null, formattedAddress: null,
    };

    try {
      addressData = await reverseGeocode(lat, lng);
    } catch {
      // Coordinates remain preserved
    }

    setForm((prev) => ({
      ...prev,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      locationStatus: 'detected',
      locationError: '',
      ...addressData,
      locationAddress: addressData.formattedAddress ||
        prev.locationAddress ||
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }));
    setLocationLoading(false);
  }, []);

  // Speech Recognition Handler
  const handleStartListening = () => {
    setSpeechError('');
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setSpeechError(t.speechUnsupported || 'Speech recognition not supported on this device.');
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
      recognition.lang = currentLangMeta.speechLocale || 'en-IN';

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
          setSpeechError(t.speechDenied || 'Microphone access denied.');
        } else if (event.error === 'no-speech') {
          setSpeechError(t.speakAgain || 'No speech heard. Please speak again.');
        } else {
          setSpeechError(t.speechUnsupported || 'Speech recognition error.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start failed:', err);
      setIsListening(false);
      setSpeechError(t.speechUnsupported || 'Could not start microphone.');
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

  // Helper: Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Category-aware evidence requirement logic — all categories require evidence (with safety override)
  const getEvidenceRequirement = (rawType = form.type) => {
    const norm = String(rawType || '').toLowerCase();
    const currentLangObj = TRANSLATIONS[lang] || TRANSLATIONS.en;

    if (norm.includes('road') || norm.includes('accident') || norm.includes('fire')) {
      return {
        level: 'required',
        title: currentLangObj.evidenceSectionRequired || '4. Photo / Video Evidence — REQUIRED',
        badge: currentLangObj.evidenceBadgeRequired || 'REQUIRED',
        safeMsg: currentLangObj.safetyAlertDanger || 'Do not put yourself in danger to capture evidence.',
      };
    }
    if (norm.includes('crime') || norm.includes('safety') || norm.includes('disaster') || norm.includes('flood') || norm.includes('natural')) {
      return {
        level: 'required_safe',
        title: currentLangObj.evidenceSectionRequiredSafe || '4. Photo / Video Evidence — REQUIRED WHEN SAFE',
        badge: currentLangObj.evidenceBadgeRequiredSafe || 'REQUIRED WHEN SAFE',
        safeMsg: currentLangObj.safetyAlertDanger || 'Do not put yourself in danger to capture evidence.',
      };
    }
    // Medical and all other types
    return {
      level: 'required',
      title: currentLangObj.evidenceSectionRequired || '4. Photo / Video Evidence — REQUIRED',
      badge: currentLangObj.evidenceBadgeRequired || 'REQUIRED',
      safeMsg: currentLangObj.safetyAlertDanger || 'Do not put yourself in danger to capture evidence.',
    };
  };

  const reqInfo = getEvidenceRequirement(form.type);

  // Dynamically compute evidence location verification against active incident coordinates
  const verifiedMediaList = mediaList.map((item) => {
    if (item.latitude && item.longitude && form.lat && form.lng) {
      const incLat = parseFloat(form.lat);
      const incLng = parseFloat(form.lng);
      const v = verifyEvidenceLocation({
        incidentLat: incLat,
        incidentLng: incLng,
        evidenceLat: item.latitude,
        evidenceLng: item.longitude,
        accuracy: item.accuracy,
      });
      return {
        ...item,
        incidentLatitude: incLat,
        incidentLongitude: incLng,
        distanceFromIncident: v.distance,
        locationVerified: v.verified,
        verificationStatus: v.status,
        verificationDetails: {
          ...(item.verificationDetails || {}),
          distanceMeters: v.distance,
          status: v.status,
          message: v.message,
        },
      };
    }
    return item;
  });

  // Handler for live camera capture (strictly live device camera, no file upload)
  const handleEvidenceCaptured = (evidenceData) => {
    setMediaError('');
    setCameraError('');
    if (errors.media) {
      setErrors((prev) => ({ ...prev, media: '' }));
    }

    setMediaList((prev) => {
      if (prev.length >= 3) return prev;
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: evidenceData.type,
          name: evidenceData.name,
          size: evidenceData.size,
          mimeType: evidenceData.mimeType,
          dataUrl: evidenceData.dataUrl,
          previewUrl: evidenceData.dataUrl,
          // Location & live capture verification metadata
          latitude: evidenceData.latitude,
          longitude: evidenceData.longitude,
          accuracy: evidenceData.accuracy,
          capturedAt: evidenceData.capturedAt,
          distanceFromIncident: evidenceData.distanceFromIncident,
          locationVerified: evidenceData.locationVerified,
          verificationStatus: evidenceData.verificationStatus,
          verificationDetails: evidenceData.verificationDetails,
          incidentLatitude: evidenceData.incidentLatitude,
          incidentLongitude: evidenceData.incidentLongitude,
        },
      ];
    });
  };

  const handleRemoveMedia = (mediaId) => {
    setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
    setMediaError('');
  };

  const handleRetakeMedia = (mediaId, isVideo = false) => {
    handleRemoveMedia(mediaId);
    setCameraError('');
    setLiveCameraModal({
      isOpen: true,
      mode: isVideo ? 'video' : 'photo',
    });
  };

  // Safety override handler
  const handleSafetyOverride = () => {
    setSafetyOverride(true);
    setMediaError('');
    setCameraError('');
    if (errors.media) {
      setErrors((prev) => ({ ...prev, media: '' }));
    }
  };

  // Form validation
  const validate = () => {
    const errs = {};

    if (!form.type) {
      errs.type = t.errSelectType || 'Please select the emergency type.';
    }

    if (!form.description.trim()) {
      errs.description = t.errDescription || 'Please describe what happened (at least 10 characters).';
    } else if (form.description.trim().length < 10) {
      errs.description = t.errDescription || 'Please describe what happened (at least 10 characters).';
    }

    // Evidence is required — unless safety override is active
    if (mediaList.length === 0 && !safetyOverride) {
      errs.media = t.errEvidenceRequired || 'Photo or video evidence is required. If unsafe to record, select "I cannot safely capture evidence".';
    } else if (!safetyOverride && verifiedMediaList.some((m) => !m.locationVerified)) {
      errs.media = 'All attached emergency evidence must be verified at the reported incident location before submitting.';
    }

    return errs;
  };

  // Submission handler
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const canonicalEmergencyType =
        EMERGENCY_TYPES.find((item) => item.value === form.type)?.label ||
        form.type;

      const description = form.description.trim();
      const latitude = form.lat ? parseFloat(form.lat) : null;
      const longitude = form.lng ? parseFloat(form.lng) : null;

      // Build rich location text for backward compat
      let locationText = 'Location not detected';
      if (form.formattedAddress) {
        locationText = form.formattedAddress;
        if (latitude && longitude) {
          locationText += ` (GPS: ${form.lat}, ${form.lng})`;
        }
      } else if (form.locationAddress.trim()) {
        locationText = form.locationAddress.trim();
        if (latitude && longitude) {
          locationText += ` (GPS: ${form.lat}, ${form.lng})`;
        }
      } else if (latitude && longitude) {
        locationText = `Lat: ${form.lat}, Lng: ${form.lng}`;
      }

      const mediaPayload = verifiedMediaList.map((m) => ({
        media_type: m.type,
        file_name: m.name,
        mime_type: m.mimeType,
        file_size: m.size,
        data_url: m.dataUrl,
        // Live evidence & location verification metadata
        evidenceType: m.type,
        latitude: m.latitude,
        longitude: m.longitude,
        accuracy: m.accuracy,
        capturedAt: m.capturedAt,
        distanceFromIncident: m.distanceFromIncident,
        locationVerified: m.locationVerified,
        verificationStatus: m.verificationStatus,
        verificationDetails: m.verificationDetails,
        incidentLatitude: m.incidentLatitude || latitude,
        incidentLongitude: m.incidentLongitude || longitude,
      }));

      // Append safety override note to description so coordinator is informed
      const finalDescription = safetyOverride && mediaList.length === 0
        ? `${description}\n\n[EVIDENCE NOT SAFELY AVAILABLE — Citizen confirmed it was unsafe to capture photo/video evidence at scene]`
        : description;

      // Full structured location model (backward-compatible)
      const locationPayload = {
        latitude,
        longitude,
        accuracy: form.accuracy || null,
        street: form.street || null,
        area: form.area || null,
        city: form.city || null,
        district: form.district || null,
        state: form.state || null,
        postalCode: form.postalCode || null,
        country: form.country || null,
        formattedAddress: form.formattedAddress || null,
      };

      const result = await addEmergency({
        type: canonicalEmergencyType,
        description: finalDescription,
        latitude,
        longitude,
        locationText,
        location: locationPayload,
        media: mediaPayload,
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

  // Read summary aloud in active language
  const handleReadSummary = () => {
    const typeLabel = t.types[form.type]?.spoken || t.types[form.type]?.label || form.type || 'Emergency';
    const locText =
      form.locationStatus === 'detected'
        ? t.locationCaptured
        : form.locationAddress || 'Not specified';
    const evidenceText =
      mediaList.length > 0
        ? `${mediaList.length} ${t.evidenceAvailable || 'evidence items'}`
        : t.noEvidence || 'No photo or video provided';
    const spokenText = `${t.reviewTitle || 'Review'}. ${t.summaryType || 'Type'}: ${typeLabel}. ${t.summaryLocation || 'Location'}: ${locText}. ${t.summaryDescription || 'Description'}: ${form.description || 'Not provided'}. ${t.evidenceReview || 'Evidence'}: ${evidenceText}.`;
    speakText(spokenText, lang);
  };

  return (
    <AppLayout
      title={reportingMode === 'simple' ? (t.headerTitle || 'Report Emergency') : 'Report Emergency'}
      subtitle={
        reportingMode === 'simple'
          ? (t.headerSubtitle || 'Fast Emergency Assistance')
          : 'Submit incident report for immediate triage and dispatch'
      }
    >
      <div
        className={`report-page-wrapper ${isCurrentRtl ? 'is-rtl' : ''}`}
        dir={isCurrentRtl ? 'rtl' : 'ltr'}
        lang={lang}
      >
        <div className="report-page-container">
          {/* Top Bar with Language Selector and Mode Switch */}
          <div className="report-top-bar">
            <BackButton fallback="/citizen" />

            <div className="report-mode-controls">
              {/* Language Selector Button */}
              <div className="lang-selector-container">
                <button
                  type="button"
                  className="lang-picker-btn"
                  onClick={() => (openLangModal ? openLangModal() : setLangModalOpen(true))}
                  aria-haspopup="dialog"
                  aria-expanded={langModalOpen}
                  aria-label={`${t.languageSelectorLabel}: ${currentLangMeta.nativeName}`}
                >
                  <span className="lang-icon" aria-hidden="true">🌐</span>
                  <span className="lang-name-native">{currentLangMeta.nativeName}</span>
                  <i className="bi bi-chevron-down lang-chevron" aria-hidden="true"></i>
                </button>

                {/* Accessible Hidden Select */}
                <select
                  id={langSelectId}
                  className="visually-hidden-accessible"
                  value={lang}
                  onChange={(e) => handleSelectLanguage(e.target.value)}
                  aria-label={t.languageSelectorLabel}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Switcher */}
              <div
                className="report-mode-toggle"
                role="group"
                aria-label="Reporting Mode Switcher"
              >
                <button
                  type="button"
                  className={`mode-toggle-btn ${reportingMode === 'simple' ? 'active' : ''}`}
                  onClick={() => setReportingMode('simple')}
                  aria-pressed={reportingMode === 'simple'}
                >
                  <i className="bi bi-person-arms-up me-1" aria-hidden="true"></i>
                  {t.simpleMode || 'Simple'}
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${reportingMode === 'standard' ? 'active' : ''}`}
                  onClick={() => setReportingMode('standard')}
                  aria-pressed={reportingMode === 'standard'}
                >
                  <i className="bi bi-card-checklist me-1" aria-hidden="true"></i>
                  {t.standardMode || 'Standard'}
                </button>
              </div>
            </div>
          </div>

          {/* 23-LANGUAGE SELECTION MODAL */}
          {langModalOpen && (
            <div
              className="lang-modal-backdrop"
              onClick={() => setLangModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={t.languageSelectorLabel}
            >
              <div
                className="lang-modal-dialog"
                onClick={(e) => e.stopPropagation()}
                dir="ltr"
              >
                <div className="lang-modal-header">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5" aria-hidden="true">🌐</span>
                    <h3 className="lang-modal-title m-0">{t.languageSelectorLabel}</h3>
                  </div>
                  <button
                    type="button"
                    className="lang-modal-close"
                    onClick={() => setLangModalOpen(false)}
                    aria-label="Close language selector"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                <div className="lang-modal-grid">
                  {LANGUAGES.map((item) => {
                    const isSelected = item.code === lang;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        className={`lang-option-card ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectLanguage(item.code)}
                        aria-pressed={isSelected}
                      >
                        <div className="lang-card-native">{item.nativeName}</div>
                        <div className="lang-card-english">{item.name}</div>
                        {isSelected && (
                          <div className="lang-card-check" aria-hidden="true">
                            <i className="bi bi-check-circle-fill"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FORM: Flow 1. Emergency Type -> 2. Location -> 3. What Happened? -> 4. Evidence -> 5. Review & Send */}
          <div className="report-main-flow" role="form" aria-label="Emergency Report Form">
            {/* Header / Intro */}
            <div className="report-header-banner">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="report-banner-icon" aria-hidden="true">🚨</div>
                  <div>
                    <h1 className="report-banner-title">{t.headerTitle || 'Report Emergency'}</h1>
                    <p className="report-banner-sub">{t.headerSubtitle || 'Direct connection to response coordination'}</p>
                  </div>
                </div>

                {reportingMode === 'simple' && (
                  <button
                    type="button"
                    className="btn-tts-listen"
                    onClick={() => speakText(t.instructionSpeech || 'Please select your emergency type, location, and describe what happened.', lang)}
                    title={t.listenInstructions || 'Listen to instructions'}
                    aria-label={t.listenInstructions || 'Listen to instructions'}
                  >
                    <i className="bi bi-volume-up-fill" aria-hidden="true"></i>
                    <span>{t.listenInstructions || 'Listen'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* =====================================================
                STEP 1: EMERGENCY TYPE
                ===================================================== */}
            <section className="clean-section-card" aria-labelledby="step-type-title">
              <div className="clean-section-header">
                <span className="step-badge">1</span>
                <h2 className="clean-section-title" id="step-type-title">
                  {t.typesTitle || 'Emergency Type'}
                </h2>
              </div>

              <div className="clean-section-body">
                <div className="type-buttons-grid" role="radiogroup" aria-label={t.typesTitle || 'Emergency Type'}>
                  {EMERGENCY_CARDS.map((card) => {
                    const isSelected = form.type === card.key;
                    const typeData = t.types[card.key] || {};
                    return (
                      <button
                        key={card.key}
                        type="button"
                        className={`type-visual-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setField('type', card.key)}
                        role="radio"
                        aria-checked={isSelected}
                        style={{
                          borderColor: isSelected ? card.color : '#26344D',
                          backgroundColor: isSelected ? '#18243B' : '#151F35',
                        }}
                      >
                        <span className="type-emoji" aria-hidden="true">{card.iconEmoji}</span>
                        <span className="type-title-text">{typeData.label || card.key}</span>
                        {isSelected && (
                          <span className="type-selected-mark" aria-hidden="true">
                            <i className="bi bi-check-circle-fill" style={{ color: card.color }}></i>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {errors.type && (
                  <div className="clean-inline-error mt-2" role="alert">
                    <i className="bi bi-exclamation-circle-fill me-1"></i>
                    <span>{errors.type}</span>
                  </div>
                )}
              </div>
            </section>

            {/* =====================================================
                STEP 2: LOCATION
                ===================================================== */}
            <section className="clean-section-card" aria-labelledby="step-location-title">
              <div className="clean-section-header">
                <span className="step-badge">2</span>
                <h2 className="clean-section-title" id="step-location-title">
                  📍 {t.locationSectionTitle || 'Emergency Location'}
                </h2>
              </div>

              <div className="clean-section-body">

                {/* OpenStreetMap + Leaflet Map */}
                <div className="location-map-wrapper mb-3">
                  <LeafletMap
                    latitude={form.lat ? parseFloat(form.lat) : null}
                    longitude={form.lng ? parseFloat(form.lng) : null}
                    height={350}
                    zoom={15}
                    showInfoBar={true}
                    showNoLocationState={true}
                    onMarkerDrop={handleMapLocationSelect}
                    draggable={true}
                    interactive={true}
                  />
                </div>

                {/* Use My Location button */}
                <button
                  type="button"
                  className="btn-location-action"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  aria-label={t.useMyLocation || 'Use My Location'}
                >
                  {locationLoading && form.locationStatus === 'detecting' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>{t.detectingLocation || 'Detecting your location…'}</span>
                    </>
                  ) : locationLoading && form.locationStatus === 'geocoding' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Reading address…</span>
                    </>
                  ) : form.locationStatus === 'detected' ? (
                    <>
                      <i className="bi bi-check-circle-fill text-success fs-5 me-2" aria-hidden="true"></i>
                      <span className="text-success fw-bold">
                        {t.locationCaptured || 'Your current location'}
                      </span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-geo-alt-fill text-warning fs-5 me-2" aria-hidden="true"></i>
                      <span>{t.useMyLocation || 'Use My Location (GPS)'}</span>
                    </>
                  )}
                </button>

                {/* Location error states */}
                {(form.locationStatus === 'error' || form.locationStatus === 'denied' ||
                  form.locationStatus === 'timeout' || form.locationStatus === 'unsupported') && (
                  <div className="clean-status-banner banner-warning mt-2" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    <span>
                      {form.locationError ||
                        (form.locationStatus === 'denied'
                          ? 'Location permission was not granted. Please allow location access.'
                          : form.locationStatus === 'unsupported'
                          ? 'Geolocation is not supported by this browser.'
                          : form.locationStatus === 'timeout'
                          ? 'Location detection timed out. Please try again.'
                          : (t.locationFailed || 'Could not fetch GPS. Please enter landmark or address below.'))}
                    </span>
                  </div>
                )}

                {/* Location Detected Card */}
                {form.locationStatus === 'detected' && form.lat && form.lng && (
                  <div className="location-detected-card mt-3" role="status" aria-live="polite">
                    <div className="location-detected-header">
                      <i className="bi bi-check-circle-fill text-success me-2" aria-hidden="true"></i>
                      <span className="fw-bold text-success">Location Detected ✓</span>
                    </div>

                    {/* Formatted address */}
                    {form.formattedAddress && (
                      <div className="location-formatted-address">
                        {form.street && <div className="loc-addr-line">{form.street}</div>}
                        {form.area && <div className="loc-addr-line">{form.area}</div>}
                        <div className="loc-addr-line">
                          {[form.city, form.state, form.postalCode].filter(Boolean).join(', ')}
                        </div>
                        {form.country && <div className="loc-addr-line">{form.country}</div>}
                      </div>
                    )}

                    {/* Coordinates */}
                    <div className="location-coords-row">
                      <div className="loc-coord-item">
                        <span className="loc-label">Latitude:</span>
                        <span className="loc-value" dir="ltr">{form.lat}</span>
                      </div>
                      <div className="loc-coord-item">
                        <span className="loc-label">Longitude:</span>
                        <span className="loc-value" dir="ltr">{form.lng}</span>
                      </div>
                      {form.accuracy && (
                        <div className="loc-coord-item">
                          <span className="loc-label">Accuracy:</span>
                          <span className="loc-value" dir="ltr">{form.accuracy} meters</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Address / Landmark input */}
                <div className="mt-3">
                  <label htmlFor="report-location-input" className="clean-field-label">
                    {t.enterNearbyLabel || 'Landmark or Additional Address Details'}
                  </label>
                  <input
                    id="report-location-input"
                    type="text"
                    className="clean-text-input"
                    placeholder={t.enterNearbyPlaceholder || 'e.g. Near City Hospital Gate 2'}
                    value={form.locationAddress}
                    onChange={(e) => setField('locationAddress', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* =====================================================
                STEP 3: WHAT HAPPENED?
                ===================================================== */}
            <section className="clean-section-card" aria-labelledby="step-desc-title">
              <div className="clean-section-header">
                <span className="step-badge">3</span>
                <h2 className="clean-section-title" id="step-desc-title">
                  {t.descriptionLabel || 'What Happened?'}
                </h2>
              </div>

              <div className="clean-section-body">
                {/* Voice button */}
                <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                  <span className="text-secondary small">
                    {reportingMode === 'simple' ? 'Speak or type what you see:' : 'Describe the situation:'}
                  </span>

                  <button
                    type="button"
                    className={`btn-voice-input ${isListening ? 'listening' : ''}`}
                    onClick={isListening ? handleStopListening : handleStartListening}
                    aria-label={isListening ? 'Stop recording voice' : 'Start speaking'}
                  >
                    <i className={`bi ${isListening ? 'bi-mic-fill text-danger' : 'bi-mic'}`} aria-hidden="true"></i>
                    <span>{isListening ? (t.listening || 'Listening...') : (t.startSpeaking || 'Tap to Speak')}</span>
                  </button>
                </div>

                {/* Voice Transcript Card */}
                {speechTranscript && (
                  <div className="voice-transcript-banner mb-3" role="region" aria-live="polite">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-warning small fw-bold">"{speechTranscript}"</span>
                      <button
                        type="button"
                        className="btn-use-voice"
                        onClick={handleApplyVoiceTranscript}
                      >
                        ✓ {t.useThis || 'Use This'}
                      </button>
                    </div>
                  </div>
                )}

                {speechError && (
                  <div className="clean-status-banner banner-warning mb-2" role="alert">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    <span>{speechError}</span>
                  </div>
                )}

                {/* Text area */}
                <textarea
                  id="report-desc-input"
                  className="clean-textarea"
                  rows={4}
                  placeholder={t.descriptionPlaceholder || 'Describe what happened, injuries, or hazards...'}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  maxLength={500}
                />

                <div className="d-flex justify-content-between align-items-center mt-1 text-secondary small">
                  <span>Minimum 10 characters</span>
                  <span>{form.description.length} / 500</span>
                </div>

                {errors.description && (
                  <div className="clean-inline-error mt-2" role="alert">
                    <i className="bi bi-exclamation-circle-fill me-1"></i>
                    <span>{errors.description}</span>
                  </div>
                )}
              </div>
            </section>

            {/* =====================================================
                STEP 4: PHOTO / VIDEO EVIDENCE
                ===================================================== */}
            <section className="clean-section-card" aria-labelledby="step-evidence-title">
              <div className="clean-section-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="step-badge">4</span>
                  <h2 className="clean-section-title m-0" id="step-evidence-title">
                    {reportingMode === 'simple'
                      ? (t.evidenceTitle || 'PHOTO / VIDEO EVIDENCE')
                      : reqInfo.title}
                  </h2>
                </div>
                <span className={`clean-tag ${
                  safetyOverride ? 'tag-override' : 'tag-required'
                }`}>
                  {safetyOverride
                    ? (t.evidenceNotSafelyAvailable || 'Not safely available')
                    : (t.evidenceBadgeRequired || 'REQUIRED')}
                </span>
              </div>

              <div className="clean-section-body">
                {/* Safety alert */}
                <div className="clean-safety-alert" role="note">
                  <i className="bi bi-shield-exclamation text-warning me-2" aria-hidden="true"></i>
                  <span>{reqInfo.safeMsg}</span>
                </div>

                {/* Safety override confirmed banner */}
                {safetyOverride && (
                  <div className="evidence-override-confirmed" role="status" aria-live="polite">
                    <i className="bi bi-shield-check text-success me-2" aria-hidden="true"></i>
                    <span>{t.safetyOverrideConfirmed || 'Confirmed: Evidence unavailable due to safety risk. Emergency response will not be delayed.'}</span>
                    <button
                      type="button"
                      className="btn-undo-override ms-2"
                      onClick={() => setSafetyOverride(false)}
                      aria-label="Undo safety override — I will now capture evidence"
                    >
                      <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>
                      Undo
                    </button>
                  </div>
                )}

                {/* Camera/permission error */}
                {cameraError && !safetyOverride && (
                  <div className="clean-status-banner banner-warning mb-3" role="alert">
                    <i className="bi bi-camera-video-off-fill me-1" aria-hidden="true"></i>
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Validation error */}
                {errors.media && !safetyOverride && (
                  <div className="clean-status-banner banner-danger mb-3" role="alert">
                    <i className="bi bi-exclamation-circle-fill me-1" aria-hidden="true"></i>
                    <span>{errors.media}</span>
                  </div>
                )}

                {/* Media error message */}
                {mediaError && (
                  <div className="clean-status-banner banner-danger mb-3" role="alert">
                    <i className="bi bi-exclamation-circle-fill me-1" aria-hidden="true"></i>
                    <span>{mediaError}</span>
                  </div>
                )}

                {/* Information Callout for Live Evidence Requirements */}
                {!safetyOverride && (
                  <div className="clean-status-banner banner-neutral mb-3" style={{ fontSize: '0.82rem' }}>
                    <i className="bi bi-camera-fill text-primary me-2 fs-6"></i>
                    <span>
                      <strong>Live Device Camera Only:</strong> Evidence must be captured live from your device camera. Your location is automatically recorded to verify proximity to the reported emergency.
                    </span>
                  </div>
                )}

                {/* Media Action Buttons — only TAKE PHOTO and RECORD VIDEO */}
                {!safetyOverride && (
                  mediaList.length < 3 ? (
                    <div className="media-buttons-row mb-3">
                      <button
                        type="button"
                        className="btn-media-action btn-media-photo"
                        onClick={() => {
                          setCameraError('');
                          setLiveCameraModal({ isOpen: true, mode: 'photo' });
                        }}
                        aria-label={t.takePhoto || 'Take Photo'}
                      >
                        <i className="bi bi-camera-fill" aria-hidden="true"></i>
                        <span>{t.takePhoto || 'TAKE PHOTO'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-media-action btn-media-video"
                        onClick={() => {
                          setCameraError('');
                          setLiveCameraModal({ isOpen: true, mode: 'video' });
                        }}
                        aria-label={t.recordVideo || 'Record Video'}
                      >
                        <i className="bi bi-camera-video-fill" aria-hidden="true"></i>
                        <span>{t.recordVideo || 'RECORD VIDEO'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="clean-status-banner banner-neutral mb-3">
                      <i className="bi bi-check-circle-fill text-info me-1" aria-hidden="true"></i>
                      <span>Maximum 3 files attached.</span>
                    </div>
                  )
                )}

                {/* Preview Cards */}
                {verifiedMediaList.length > 0 && (
                  <div className="evidence-grid-row">
                    {verifiedMediaList.map((item, idx) => (
                      <div key={item.id || idx} className="evidence-thumb-card">
                        <div className="evidence-thumb-preview">
                          {item.type === 'video' ? (
                            <video
                              src={item.previewUrl}
                              controls
                              muted
                              playsInline
                              preload="metadata"
                              className="thumb-media"
                              aria-label="Attached video"
                            />
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt={`Evidence ${idx + 1}`}
                              className="thumb-media"
                            />
                          )}
                          <span className="thumb-type-tag">
                            {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                          </span>
                        </div>

                        <div className="evidence-thumb-meta">
                          <div className="thumb-name text-truncate">{item.name}</div>
                          <div className="thumb-size">{formatFileSize(item.size)}</div>

                          {/* Location Verification Badge */}
                          <div className="mt-2">
                            {item.locationVerified ? (
                              <span
                                className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '9999px' }}
                              >
                                <i className="bi bi-check-circle-fill"></i>
                                <span>VERIFIED ({item.distanceFromIncident !== null ? `${Math.round(item.distanceFromIncident)}m` : '0m'})</span>
                              </span>
                            ) : item.verificationStatus === 'LOCATION_MISMATCH' ? (
                              <span
                                className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '9999px' }}
                              >
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                <span>MISMATCH ({item.distanceFromIncident !== null ? formatDistance(item.distanceFromIncident) : 'Outside'})</span>
                              </span>
                            ) : item.verificationStatus === 'LOW_ACCURACY' ? (
                              <span
                                className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '9999px' }}
                              >
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>LOW GPS ACCURACY</span>
                              </span>
                            ) : (
                              <span
                                className="badge bg-info-subtle text-info border border-info-subtle d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '9999px' }}
                              >
                                <i className="bi bi-geo-alt"></i>
                                <span>GPS CAPTURED</span>
                              </span>
                            )}

                            {item.latitude && item.longitude && (
                              <div
                                className="small text-secondary mt-1 font-monospace"
                                style={{ fontSize: '10.5px', lineHeight: 1.2 }}
                              >
                                📍 {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                                {item.accuracy ? ` (±${item.accuracy}m)` : ''}
                              </div>
                            )}
                          </div>

                          <div className="thumb-actions mt-2">
                            <button
                              type="button"
                              className="btn-thumb-action text-info"
                              onClick={() => handleRetakeMedia(item.id, item.type === 'video')}
                              title={t.retake || 'Retake'}
                            >
                              <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>
                              <span>{t.retake || 'Retake'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn-thumb-action text-danger"
                              onClick={() => handleRemoveMedia(item.id)}
                              title={t.removeMedia || 'Remove'}
                            >
                              <i className="bi bi-trash3 me-1" aria-hidden="true"></i>
                              <span>{t.removeMedia || 'Remove'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Safety Override — visible whenever override not yet active (regardless of media count) */}
                {!safetyOverride && (
                  <div className="evidence-safety-override-wrapper">
                    <div className="evidence-divider-label">
                      — {t.safeCaptureWarning || 'Only capture evidence if it is safe.'} —
                    </div>
                    <button
                      type="button"
                      className="btn-safety-override"
                      onClick={handleSafetyOverride}
                      aria-label={t.safetyOverrideBtn || 'I cannot safely capture evidence'}
                    >
                      <i className="bi bi-shield-x me-2" aria-hidden="true"></i>
                      {t.safetyOverrideBtn || 'I cannot safely capture evidence'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* =====================================================
                STEP 5: REVIEW & SEND
                ===================================================== */}
            <section className="clean-section-card review-card" aria-labelledby="step-review-title">
              <div className="clean-section-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="step-badge">5</span>
                  <h2 className="clean-section-title m-0" id="step-review-title">
                    {t.reviewTitle || 'Review & Send'}
                  </h2>
                </div>

                {reportingMode === 'simple' && (
                  <button
                    type="button"
                    className="btn-tts-listen"
                    onClick={handleReadSummary}
                    title="Listen to summary"
                    aria-label="Listen to summary"
                  >
                    <i className="bi bi-volume-up-fill me-1" aria-hidden="true"></i>
                    <span>{t.listenSummary || 'Listen to Summary'}</span>
                  </button>
                )}
              </div>

              <div className="clean-section-body">
                {/* Summary Box */}
                <div className="review-summary-box mb-3">
                  <div className="review-item">
                    <span className="review-label">{t.summaryType || 'Type'}:</span>
                    <span className="review-value fw-bold">
                      {t.types[form.type]?.label || form.type || 'Not selected'}
                    </span>
                  </div>

                  <div className="review-item">
                    <span className="review-label">{t.summaryLocation || 'Location'}:</span>
                    <span className="review-value">
                      {form.locationStatus === 'detected'
                        ? (form.formattedAddress
                            ? `${form.formattedAddress} (GPS: ${form.lat}, ${form.lng})`
                            : `GPS: ${form.lat}, ${form.lng}`)
                        : form.locationAddress || 'Not specified'}
                    </span>
                  </div>

                  <div className="review-item">
                    <span className="review-label">{t.summaryDescription || 'Description'}:</span>
                    <span className="review-value text-truncate-2">
                      {form.description || 'Not provided'}
                    </span>
                  </div>

                  <div className="review-item">
                    <span className="review-label">{t.evidenceReview || 'Evidence'}:</span>
                    <div className="review-value">
                      {verifiedMediaList.length > 0 ? (
                        <div className="d-flex flex-column gap-1">
                          <span className="fw-bold">
                            {verifiedMediaList.length} live {verifiedMediaList.length === 1 ? 'evidence item' : 'evidence items'} attached
                          </span>
                          {verifiedMediaList.map((m, idx) => (
                            <div key={m.id || idx} className="d-flex align-items-center gap-2 small text-secondary">
                              <span className="d-inline-flex align-items-center gap-1">
                                <i className={m.type === 'video' ? 'bi bi-camera-video-fill text-danger' : 'bi bi-camera-fill text-primary'}></i>
                                <span>{m.type === 'video' ? 'Video' : 'Photo'}</span>
                              </span>
                              <span>·</span>
                              <span className={`d-inline-flex align-items-center gap-1 fw-semibold ${m.locationVerified ? 'text-success' : 'text-danger'}`}>
                                <i className={`bi ${m.locationVerified ? 'bi-check-circle-fill' : 'bi-exclamation-octagon-fill'}`}></i>
                                <span>{m.locationVerified ? 'Verified at incident' : 'Location Mismatch'}</span>
                                {m.distanceFromIncident !== null ? ` (${Math.round(m.distanceFromIncident)}m away)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>{safetyOverride ? 'Evidence not safely available (declared)' : 'None attached'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="clean-status-banner banner-danger mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    <span>{errors.submit}</span>
                  </div>
                )}

                {/* Primary Prominent Submission Button */}
                <button
                  type="button"
                  className="btn-primary-send"
                  onClick={handleSubmit}
                  disabled={loading}
                  id="submit-emergency-btn"
                  aria-label="Send Emergency Report"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>{t.submittingReport || 'SENDING EMERGENCY REPORT...'}</span>
                    </>
                  ) : (
                    <span>🚨 SEND EMERGENCY REPORT</span>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* LIVE EMERGENCY CAMERA & LOCATION VERIFICATION MODAL */}
        <LiveCameraModal
          isOpen={liveCameraModal.isOpen}
          mode={liveCameraModal.mode}
          incidentLocation={{
            lat: form.lat,
            lng: form.lng,
            formattedAddress: form.formattedAddress || form.locationAddress,
          }}
          onCapture={handleEvidenceCaptured}
          onClose={() => setLiveCameraModal({ isOpen: false, mode: 'photo' })}
          onReviewIncidentLocation={() => {
            const step2 = document.getElementById('step-location-title');
            if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      </div>
    </AppLayout>
  );
}