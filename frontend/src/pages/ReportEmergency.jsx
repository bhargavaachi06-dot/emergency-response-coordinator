import { useState, useRef, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import { EMERGENCY_TYPES } from '../data/demoData';
import {
  LANGUAGES,
  TRANSLATIONS,
  getLanguage,
  isRTL,
  speakText,
} from '../data/translations';
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

  // Language state initialized from localStorage, defaulting to 'en'
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('citizenLanguage');
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // ignore storage access errors
    }
    return 'en';
  });

  // Modal drawer for selecting among 23 languages
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Form state shared between both modes
  const [form, setForm] = useState(INITIAL_FORM);
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

  // Dedicated media input references (Camera photos, video capture, and file selection)
  const photoCameraInputRef = useRef(null);
  const videoCameraInputRef = useRef(null);
  const filePickerInputRef = useRef(null);
  const stdPhotoCameraInputRef = useRef(null);
  const stdVideoCameraInputRef = useRef(null);
  const stdFilePickerInputRef = useRef(null);

  // Active language metadata and translation dictionary
  const currentLangMeta = getLanguage(lang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isCurrentRtl = isRTL(lang);

  // Unique IDs for accessibility
  const langSelectId = useId();

  // Save language selection to localStorage
  const handleSelectLanguage = (newCode) => {
    if (LANGUAGES.some((l) => l.code === newCode)) {
      setLang(newCode);
      setLangModalOpen(false);
      try {
        localStorage.setItem('citizenLanguage', newCode);
      } catch {
        // ignore storage error
      }
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
          setSpeechError(t.speechDenied);
        } else if (event.error === 'no-speech') {
          setSpeechError(t.speakAgain);
        } else {
          setSpeechError(t.speechUnsupported);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start failed:', err);
      setIsListening(false);
      setSpeechError(t.speechUnsupported);
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

  // Helper: Format file sizes cleanly
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Helper: Category-aware evidence requirement
  const getEvidenceRequirement = (rawType = form.type) => {
    const norm = String(rawType || '').toLowerCase();
    if (norm.includes('road') || norm.includes('accident')) {
      return {
        level: 'recommended',
        badgeText: t.evidenceRecommended || 'Photo or video recommended',
        note: t.evidenceHelpText || 'Photo or video can help the response team assess the situation.',
        isSafetyAlert: false,
      };
    }
    if (norm.includes('fire')) {
      return {
        level: 'recommended',
        badgeText: t.evidenceRecommended || 'Photo or video recommended',
        note: t.evidenceHelpText || 'Photo or video can help the response team assess the situation.',
        isSafetyAlert: false,
      };
    }
    if (norm.includes('crime') || norm.includes('safety')) {
      return {
        level: 'recommended_safe',
        badgeText: t.evidenceRecommended || 'Photo or video recommended',
        note: t.safeCaptureWarning || 'Only capture evidence if it is safe to do so. Do not put yourself or others in danger.',
        isSafetyAlert: true,
      };
    }
    if (norm.includes('disaster') || norm.includes('flood') || norm.includes('natural')) {
      return {
        level: 'recommended_safe',
        badgeText: t.evidenceRecommended || 'Photo or video recommended',
        note: t.safeCaptureWarning || 'Only capture evidence if it is safe to do so. Do not put yourself or others in danger.',
        isSafetyAlert: true,
      };
    }
    if (norm.includes('medical')) {
      return {
        level: 'optional',
        badgeText: t.evidenceOptional || 'Evidence optional',
        note: 'Prioritize getting medical help quickly. Never delay assistance to capture media.',
        isSafetyAlert: false,
      };
    }
    return {
      level: 'optional',
      badgeText: t.evidenceOptional || 'Evidence optional',
      note: t.evidenceHelpText || 'Photo or video can help the response team assess the situation.',
      isSafetyAlert: false,
    };
  };

  const reqInfo = getEvidenceRequirement(form.type);

  // Handler: Select media files (photos up to 10MB, videos up to 50MB, max 3 files)
  const handleFilesSelected = (filesList) => {
    setMediaError('');
    if (!filesList || filesList.length === 0) return;

    const incoming = Array.from(filesList);
    if (mediaList.length + incoming.length > 3) {
      setMediaError(`Maximum 3 evidence files allowed. You already have ${mediaList.length} and selected ${incoming.length}.`);
      return;
    }

    incoming.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        setMediaError(t.unsupportedFile || 'This file format is not supported.');
        return;
      }

      if (isImage && file.size > 10 * 1024 * 1024) {
        setMediaError(t.fileTooLarge || 'Photo is too large. Maximum size is 10 MB.');
        return;
      }

      if (isVideo && file.size > 50 * 1024 * 1024) {
        setMediaError(t.fileTooLarge || 'Video is too large. Maximum size is 50 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result;
        const newMedia = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: isVideo ? 'video' : 'image',
          name: file.name || (isVideo ? 'video_evidence.mp4' : 'photo_evidence.jpg'),
          size: file.size,
          mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          dataUrl: dataUrl,
          previewUrl: dataUrl,
        };

        setMediaList((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, newMedia];
        });
      };

      reader.onerror = () => {
        setMediaError(t.errGeneral || 'Failed to read media file.');
      };

      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (mediaId) => {
    setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
    setMediaError('');
  };

  const handleRetakeMedia = (mediaId, isVideo = false) => {
    handleRemoveMedia(mediaId);
    if (isVideo) {
      if (reportingMode === 'simple') {
        videoCameraInputRef.current?.click();
      } else {
        stdVideoCameraInputRef.current?.click();
      }
    } else {
      if (reportingMode === 'simple') {
        photoCameraInputRef.current?.click();
      } else {
        stdPhotoCameraInputRef.current?.click();
      }
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

  // Submission handler — Preserves 100% of existing canonical payload
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
      // Send CANONICAL English emergency category to the backend
      const canonicalEmergencyType =
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

      const mediaPayload = mediaList.map((m) => ({
        media_type: m.type,
        file_name: m.name,
        mime_type: m.mimeType,
        file_size: m.size,
        data_url: m.dataUrl,
      }));

      const result = await addEmergency({
        type: canonicalEmergencyType,
        description,
        latitude,
        longitude,
        locationText,
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

  // Read out summary in selected language
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
    const spokenText = `${t.reviewTitle}. ${t.summaryType}: ${typeLabel}. ${t.summaryLocation}: ${locText}. ${t.summaryDescription}: ${form.description || 'Not provided'}. ${t.evidenceReview}: ${evidenceText}.`;
    speakText(spokenText, lang);
  };

  // Step progress indicator for Standard Mode
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
      <div
        className={`report-page-wrapper ${isCurrentRtl ? 'is-rtl' : ''}`}
        dir={isCurrentRtl ? 'rtl' : 'ltr'}
        lang={lang}
      >
        <div className="report-page-container">
          {/* Top navigation row with back button, language selector and mode switch */}
          <div className="report-top-bar">
            <BackButton fallback="/citizen" />

            <div className="report-mode-controls">
              {/* Accessible Native-Script Language Selector Trigger */}
              <div className="lang-selector-container">
                <button
                  type="button"
                  className="lang-picker-btn"
                  onClick={() => setLangModalOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={langModalOpen}
                  aria-label={`${t.languageSelectorLabel}: ${currentLangMeta.nativeName}`}
                >
                  <span className="lang-icon" aria-hidden="true">🌐</span>
                  <span className="lang-name-native">{currentLangMeta.nativeName}</span>
                  <i className="bi bi-chevron-down lang-chevron" aria-hidden="true"></i>
                </button>

                {/* Direct quick accessible <select> for screen readers & quick selection */}
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

              {/* Mode Switcher Toggle */}
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
                  <i className="bi bi-person-arms-up me-1" aria-hidden="true"></i>
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
                  <i className="bi bi-card-checklist me-1" aria-hidden="true"></i>
                  {t.standardMode}
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================
              23-LANGUAGE SELECTION MODAL DRAWER
              ===================================================== */}
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

          {/* =====================================================
              SIMPLE MODE (ACCESSIBLE / VOICE / VISUAL)
              ===================================================== */}
          {reportingMode === 'simple' && (
            <div
              className="simple-report-flow"
              role="region"
              aria-label="Simple Emergency Reporting"
            >
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
              <section
                className="report-section-card simple-section-card"
                aria-labelledby="simple-type-heading"
              >
                <div className="report-section-header">
                  <h2 className="report-section-title" id="simple-type-heading">
                    <i className="bi bi-grid-fill text-info" aria-hidden="true"></i>
                    {t.typesTitle}
                  </h2>
                  <span className="text-secondary small">{t.typesSubtitle}</span>
                </div>

                <div className="report-section-body">
                  <div
                    className="simple-types-grid"
                    role="radiogroup"
                    aria-label={t.typesTitle}
                  >
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
              <section
                className="report-section-card simple-section-card"
                aria-labelledby="simple-voice-heading"
              >
                <div className="report-section-header">
                  <h2 className="report-section-title" id="simple-voice-heading">
                    <i className="bi bi-mic-fill text-danger" aria-hidden="true"></i>
                    {t.voiceSectionTitle}
                  </h2>
                  <button
                    type="button"
                    className="btn-tts-listen-inline"
                    onClick={() => speakText(t.instructionSpeech, lang)}
                    aria-label={t.listenInstructions}
                  >
                    <i className="bi bi-volume-up-fill" aria-hidden="true"></i>
                    <span>{t.listenInstructions}</span>
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

                  {/* Speech Transcript Output Card */}
                  {speechTranscript && (
                    <div
                      className="voice-transcript-card"
                      role="region"
                      aria-live="polite"
                    >
                      <div className="transcript-header">
                        <span className="transcript-label">{t.weHeard}</span>
                        <button
                          type="button"
                          className="btn-transcript-listen"
                          onClick={() => speakText(speechTranscript, lang)}
                          title="Listen to transcription"
                          aria-label="Listen to transcription"
                        >
                          <i className="bi bi-volume-up-fill"></i>
                        </button>
                      </div>
                      <blockquote className="transcript-text">
                        "{speechTranscript}"
                      </blockquote>
                      <div className="transcript-actions">
                        <button
                          type="button"
                          className="btn-use-transcript"
                          onClick={handleApplyVoiceTranscript}
                        >
                          <i className="bi bi-check-circle-fill me-1" aria-hidden="true"></i>
                          {t.useThis}
                        </button>
                        <button
                          type="button"
                          className="btn-retry-transcript"
                          onClick={handleStartListening}
                        >
                          <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>
                          {t.speakAgain}
                        </button>
                      </div>
                    </div>
                  )}

                  {speechError && (
                    <div className="alert-voice-notice" role="alert">
                      <i className="bi bi-info-circle-fill me-2" aria-hidden="true"></i>
                      <span>{speechError}</span>
                    </div>
                  )}

                  {/* Description Fallback Input */}
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
              <section
                className="report-section-card simple-section-card"
                aria-labelledby="simple-location-heading"
              >
                <div className="report-section-header">
                  <h2 className="report-section-title" id="simple-location-heading">
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
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        <span>{t.detectingLocation}</span>
                      </>
                    ) : form.locationStatus === 'detected' ? (
                      <>
                        <i className="bi bi-check-circle-fill text-success fs-5" aria-hidden="true"></i>
                        <span className="text-success fw-bold">{t.locationCaptured}</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-geo-fill fs-5 text-info" aria-hidden="true"></i>
                        <span>{t.useMyLocation}</span>
                      </>
                    )}
                  </button>

                  {form.locationStatus === 'error' && (
                    <div className="location-error-card mt-3" role="alert">
                      <div className="text-warning mb-2 fw-semibold">
                        <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true"></i>
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

              {/* SECTION 4: PHOTO + VIDEO EVIDENCE VERIFICATION */}
              <section
                className="report-section-card simple-section-card"
                aria-labelledby="simple-evidence-heading"
              >
                <div className="report-section-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-camera-reels-fill text-info fs-5" aria-hidden="true"></i>
                    <h2 className="report-section-title m-0" id="simple-evidence-heading">
                      {t.evidenceTitle || 'ADD PHOTO OR VIDEO'}
                    </h2>
                  </div>
                  {/* Category-aware requirement badge */}
                  <span
                    className={`badge ${
                      getEvidenceRequirement().level.startsWith('recommended')
                        ? 'bg-warning text-dark'
                        : 'bg-secondary text-light'
                    }`}
                    style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}
                  >
                    {getEvidenceRequirement().badgeText}
                  </span>
                </div>

                <div className="report-section-body">
                  <p className="text-secondary mb-3" style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    {getEvidenceRequirement().note}
                  </p>

                  {/* Safety Alert Warning Banner (Requirement 5) */}
                  <div
                    className="alert d-flex align-items-start gap-2 p-3 rounded-3 mb-3"
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FDE68A',
                      fontSize: '13.5px',
                    }}
                    role="alert"
                  >
                    <i className="bi bi-shield-exclamation fs-5 flex-shrink-0 text-warning" aria-hidden="true"></i>
                    <div>
                      <strong className="d-block mb-1 text-warning">
                        {t.safeCaptureWarning ? 'Safety Warning' : 'Safety Warning'}:
                      </strong>
                      <span>{t.safeCaptureWarning}</span>
                    </div>
                  </div>

                  {/* Media Error Message */}
                  {mediaError && (
                    <div
                      className="alert alert-danger d-flex align-items-center gap-2 p-3 rounded-3 mb-3"
                      style={{
                        background: 'rgba(220, 38, 38, 0.15)',
                        border: '1px solid rgba(220, 38, 38, 0.4)',
                        color: '#FCA5A5',
                        fontSize: '13.5px',
                      }}
                      role="alert"
                    >
                      <i className="bi bi-exclamation-triangle-fill text-danger fs-5" aria-hidden="true"></i>
                      <span>{mediaError}</span>
                    </div>
                  )}

                  {/* Evidence Action Buttons (TAKE PHOTO, RECORD VIDEO, CHOOSE FILE) */}
                  {mediaList.length < 3 ? (
                    <div className="evidence-buttons-grid mb-3">
                      <button
                        type="button"
                        className="btn-evidence-action"
                        onClick={() => photoCameraInputRef.current?.click()}
                        aria-label={t.takePhoto || 'TAKE PHOTO'}
                      >
                        <i className="bi bi-camera-fill action-icon" aria-hidden="true"></i>
                        <span className="action-text">📷 {t.takePhoto || 'TAKE PHOTO'}</span>
                        <span className="action-sub">Open camera</span>
                      </button>

                      <button
                        type="button"
                        className="btn-evidence-action"
                        onClick={() => videoCameraInputRef.current?.click()}
                        aria-label={t.recordVideo || 'RECORD VIDEO'}
                      >
                        <i className="bi bi-camera-video-fill action-icon text-danger" aria-hidden="true"></i>
                        <span className="action-text">🎥 {t.recordVideo || 'RECORD VIDEO'}</span>
                        <span className="action-sub">Record video</span>
                      </button>

                      <button
                        type="button"
                        className="btn-evidence-action"
                        onClick={() => filePickerInputRef.current?.click()}
                        aria-label={t.chooseFile || 'CHOOSE FILE'}
                      >
                        <i className="bi bi-folder2-open action-icon text-warning" aria-hidden="true"></i>
                        <span className="action-text">📁 {t.chooseFile || 'CHOOSE FILE'}</span>
                        <span className="action-sub">From device</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="alert alert-info py-2 px-3 mb-3"
                      style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #26344D', color: '#93c5fd', fontSize: '13px' }}
                    >
                      <i className="bi bi-check-circle-fill me-1 text-info"></i>
                      Maximum 3 evidence files added. Remove a file to replace it.
                    </div>
                  )}

                  {/* Hidden Native File Inputs for Camera / Video / File Picker */}
                  <input
                    ref={photoCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={videoCameraInputRef}
                    type="file"
                    accept="video/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={filePickerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {/* Previews List / Carousel */}
                  {mediaList.length > 0 && (
                    <div className="evidence-preview-list mt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-light" style={{ fontSize: '13.5px' }}>
                          {t.evidenceReview || 'Evidence Attached'} ({mediaList.length}/3)
                        </span>
                        <span className="badge bg-success text-white" style={{ fontSize: '11px' }}>
                          ✓ {t.evidenceReady || 'Ready'}
                        </span>
                      </div>

                      <div className="row g-3">
                        {mediaList.map((item, idx) => (
                          <div key={item.id || idx} className="col-12 col-md-6 col-lg-4">
                            <div className="evidence-card-item">
                              <div className="evidence-media-wrap">
                                {item.type === 'video' ? (
                                  <video
                                    src={item.previewUrl}
                                    controls
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="evidence-video-element"
                                    aria-label="Attached video evidence"
                                  />
                                ) : (
                                  <img
                                    src={item.previewUrl}
                                    alt={`Emergency evidence ${idx + 1}`}
                                    className="evidence-image-element"
                                  />
                                )}
                                <span className="evidence-type-tag">
                                  {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                                </span>
                              </div>

                              <div className="evidence-card-info">
                                <div className="evidence-filename text-truncate" title={item.name}>
                                  {item.name}
                                </div>
                                <div className="evidence-filesize text-muted">
                                  {formatFileSize(item.size)}
                                </div>

                                <div className="evidence-actions-row">
                                  <button
                                    type="button"
                                    className="btn-use-this-evidence"
                                    title="Evidence confirmed"
                                    aria-label="Confirm evidence ready"
                                  >
                                    <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
                                    {t.useThis || 'Use This'}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-retake-evidence"
                                    onClick={() => handleRetakeMedia(item.id, item.type === 'video')}
                                    title="Retake or re-select"
                                    aria-label={t.retake || 'Retake'}
                                  >
                                    <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>
                                    {t.retake || 'Retake'}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-remove-evidence"
                                    onClick={() => handleRemoveMedia(item.id)}
                                    title="Remove this media"
                                    aria-label={t.removeMedia || 'Remove'}
                                  >
                                    <i className="bi bi-trash3-fill me-1" aria-hidden="true"></i>
                                    {t.removeMedia || 'Remove'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Privacy note (Requirement 12) */}
                  <div className="evidence-privacy-note mt-3">
                    <i className="bi bi-shield-check text-secondary me-1" aria-hidden="true"></i>
                    <span>{t.mediaPrivacyNote}</span>
                  </div>
                </div>
              </section>

              {/* SECTION 5: PRE-SUBMISSION CONFIRMATION SUMMARY CARD */}
              <section
                className="simple-summary-card"
                aria-labelledby="summary-heading"
              >
                <div className="summary-card-top">
                  <div>
                    <h3 className="summary-card-title" id="summary-heading">
                      <i className="bi bi-shield-check text-success me-2" aria-hidden="true"></i>
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
                    <i className="bi bi-volume-up-fill me-1" aria-hidden="true"></i>
                    <span>{t.listenSummary}</span>
                  </button>
                </div>

                <div className="summary-grid">
                  <div className="summary-row">
                    <span className="summary-label">{t.summaryType}:</span>
                    <span className="summary-value">
                      {form.type
                        ? t.types[form.type]?.label || form.type
                        : '—'}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">{t.summaryLocation}:</span>
                    <span className="summary-value">
                      {form.locationStatus === 'detected'
                        ? t.locationCaptured
                        : form.locationAddress || '—'}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">{t.summaryDescription}:</span>
                    <span className="summary-value">
                      {form.description
                        ? form.description.length > 80
                          ? `${form.description.slice(0, 80)}...`
                          : form.description
                        : '—'}
                    </span>
                  </div>

                  <div className="summary-row">
                    <span className="summary-label">{t.evidenceReview || 'Evidence'}:</span>
                    <span className="summary-value">
                      {mediaList.length > 0 ? (
                        <span className="text-success fw-bold d-inline-flex align-items-center gap-2 flex-wrap">
                          <i className="bi bi-check-circle-fill"></i>
                          {mediaList.filter((m) => m.type === 'image').length > 0 && (
                            <span>
                              📷 {mediaList.filter((m) => m.type === 'image').length}{' '}
                              {mediaList.filter((m) => m.type === 'image').length === 1 ? 'Photo' : 'Photos'}
                            </span>
                          )}
                          {mediaList.filter((m) => m.type === 'video').length > 0 && (
                            <span>
                              🎥 {mediaList.filter((m) => m.type === 'video').length}{' '}
                              {mediaList.filter((m) => m.type === 'video').length === 1 ? 'Video' : 'Videos'}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">
                          {['road_accident', 'fire', 'crime', 'natural_disaster'].includes(form.type) ? (
                            <span className="text-warning-emphasis fw-medium" style={{ fontSize: '13px' }}>
                              <i className="bi bi-info-circle me-1"></i>
                              {t.noEvidenceSafeNote || 'No evidence provided. You can continue if you cannot safely provide it.'}
                            </span>
                          ) : (
                            <span>{t.noEvidence || 'No photo or video provided'}</span>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Submission Error Banner */}
                {errors.submit && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
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
                <i className="bi bi-shield-lock-fill text-info fs-5 me-2" aria-hidden="true"></i>
                <span>{t.hitlNotice}</span>
              </div>
            </div>
          )}

          {/* =====================================================
              STANDARD MODE (DETAILED OPERATIONAL REPORTING FORM)
              ===================================================== */}
          {reportingMode === 'standard' && (
            <div
              className="standard-report-flow"
              role="region"
              aria-label="Standard Emergency Reporting"
            >
              {/* Header Panel */}
              <header className="report-header-card" role="banner">
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

                  <div className="report-status-badge" role="status">
                    <span className="report-pulse-dot" aria-hidden="true"></span>
                    <span>{t.systemReady}</span>
                  </div>
                </div>
              </header>

              {/* Step Progress Indicator */}
              <div className="report-steps-bar" aria-label="Reporting Stages">
                <div className={`report-step-item ${isStep1Done ? 'completed' : 'active'}`}>
                  <span className="report-step-num">{isStep1Done ? '✓' : '1'}</span>
                  <span className="report-step-text">{t.summaryType}</span>
                </div>

                <div
                  className={`report-step-item ${
                    isStep2Done ? 'completed' : isStep1Done ? 'active' : ''
                  }`}
                >
                  <span className="report-step-num">{isStep2Done ? '✓' : '2'}</span>
                  <span className="report-step-text">{t.summaryLocation}</span>
                </div>

                <div
                  className={`report-step-item ${
                    isStep3Done ? 'completed' : isStep2Done ? 'active' : ''
                  }`}
                >
                  <span className="report-step-num">{isStep3Done ? '✓' : '3'}</span>
                  <span className="report-step-text">{t.summaryDescription}</span>
                </div>
              </div>

              {/* Form Container */}
              <form onSubmit={handleSubmit} noValidate>
                {/* 1. Emergency Type Selection */}
                <section className="report-section-card" aria-labelledby="std-type-title">
                  <div className="report-section-header">
                    <h2 className="report-section-title" id="std-type-title">
                      <i className="bi bi-grid-3x3-gap-fill text-danger" aria-hidden="true"></i>
                      {t.typesTitle}
                    </h2>
                    <span className="badge bg-danger text-light">Required</span>
                  </div>

                  <div className="report-section-body">
                    <div
                      className="report-types-grid"
                      role="radiogroup"
                      aria-label={t.typesTitle}
                    >
                      {EMERGENCY_TYPES.map((type) => {
                        const isSelected = form.type === type.value;
                        const translatedInfo = t.types[type.value] || {};
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
                            <div className="type-card-label">
                              {translatedInfo.label || type.label}
                            </div>
                            <p className="type-card-desc">
                              {translatedInfo.sublabel || 'Immediate dispatch support'}
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
                      {t.locationSectionTitle}
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
                          <span>{t.detectingLocation}</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-crosshair2 fs-5" aria-hidden="true"></i>
                          <span>{t.useMyLocation}</span>
                        </>
                      )}
                    </button>

                    {form.locationStatus === 'detected' && (
                      <div className="location-status-banner location-status-success" role="status">
                        <i className="bi bi-check-circle-fill"></i>
                        <span>
                          {t.locationCaptured} (GPS: {form.lat}, {form.lng})
                        </span>
                      </div>
                    )}

                    {form.locationStatus === 'error' && (
                      <div className="location-status-banner location-status-error" role="alert">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        <span>{t.locationFailed}</span>
                      </div>
                    )}

                    <div className="report-input-group mt-3">
                      <label className="report-label" htmlFor="std-location-address">
                        {t.enterNearbyLabel}
                      </label>
                      <input
                        id="std-location-address"
                        type="text"
                        className="report-input-dark"
                        placeholder={t.enterNearbyPlaceholder}
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
                      {t.descriptionLabel}
                    </h2>
                    <span className="badge bg-danger text-light">Required</span>
                  </div>

                  <div className="report-section-body">
                    <div className="report-input-group">
                      <label className="report-label" htmlFor="std-description">
                        {t.descriptionLabel} <span className="report-label-required">*</span>
                      </label>
                      <textarea
                        id="std-description"
                        className="report-textarea-dark"
                        rows={4}
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

                    {/* Photo + Video Evidence Verification Section */}
                    <div className="report-input-group">
                      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                        <label className="report-label m-0">
                          <i className="bi bi-camera-reels-fill text-info me-2" aria-hidden="true"></i>
                          {t.evidenceTitle || 'EVIDENCE (PHOTO / VIDEO)'}
                        </label>
                        <span
                          className={`badge ${
                            reqInfo.level === 'recommended'
                              ? 'bg-warning text-dark'
                              : 'bg-secondary text-light'
                          }`}
                          style={{ fontSize: '11px', padding: '5px 10px' }}
                        >
                          {reqInfo.badgeText}
                        </span>
                      </div>

                      <p className="text-secondary small mb-2">
                        {t.evidenceHelpText || 'Photo or video can help the response team assess the situation.'}
                      </p>

                      {/* Safety Message Banner */}
                      <div
                        className="alert alert-warning d-flex align-items-start gap-2 py-2 px-3 mb-3 rounded-2"
                        style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fde68a',
                          fontSize: '12.5px',
                        }}
                        role="alert"
                      >
                        <i className="bi bi-shield-exclamation text-warning fs-6 mt-1" aria-hidden="true"></i>
                        <div>
                          <strong>{t.safeCaptureWarning || 'Only take a photo or video if it is safe. Do not put yourself or others in danger.'}</strong>
                        </div>
                      </div>

                      {mediaError && (
                        <div
                          className="alert alert-danger py-2 px-3 mb-3 rounded-2 d-flex align-items-center justify-content-between"
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '13px' }}
                          role="alert"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
                            <span>{mediaError}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-close btn-close-white btn-sm"
                            aria-label="Close"
                            onClick={() => setMediaError('')}
                          ></button>
                        </div>
                      )}

                      {/* Action buttons (Take Photo / Record Video / Choose File) */}
                      {mediaList.length < 3 ? (
                        <div className="evidence-buttons-grid mb-3">
                          <button
                            type="button"
                            className="btn-evidence-action"
                            onClick={() => stdPhotoCameraInputRef.current?.click()}
                            aria-label={t.takePhoto || 'TAKE PHOTO'}
                          >
                            <i className="bi bi-camera-fill action-icon text-info" aria-hidden="true"></i>
                            <span className="action-text">📷 {t.takePhoto || 'TAKE PHOTO'}</span>
                            <span className="action-sub">Camera (Max 10MB)</span>
                          </button>

                          <button
                            type="button"
                            className="btn-evidence-action"
                            onClick={() => stdVideoCameraInputRef.current?.click()}
                            aria-label={t.recordVideo || 'RECORD VIDEO'}
                          >
                            <i className="bi bi-camera-video-fill action-icon text-danger" aria-hidden="true"></i>
                            <span className="action-text">🎥 {t.recordVideo || 'RECORD VIDEO'}</span>
                            <span className="action-sub">Camera (Max 50MB)</span>
                          </button>

                          <button
                            type="button"
                            className="btn-evidence-action"
                            onClick={() => stdFilePickerInputRef.current?.click()}
                            aria-label={t.chooseFile || 'CHOOSE FILE'}
                          >
                            <i className="bi bi-folder2-open action-icon text-warning" aria-hidden="true"></i>
                            <span className="action-text">📁 {t.chooseFile || 'CHOOSE FILE'}</span>
                            <span className="action-sub">Device storage</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="alert alert-info py-2 px-3 mb-3 rounded-2"
                          style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #26344D', color: '#93c5fd', fontSize: '13px' }}
                        >
                          <i className="bi bi-check-circle-fill me-1 text-info"></i>
                          Maximum 3 evidence files reached. Remove an item to add another.
                        </div>
                      )}

                      {/* Hidden inputs */}
                      <input
                        ref={stdPhotoCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <input
                        ref={stdVideoCameraInputRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <input
                        ref={stdFilePickerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />

                      {/* Standard Mode Media Cards */}
                      {mediaList.length > 0 && (
                        <div className="evidence-preview-list">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-semibold text-light" style={{ fontSize: '13px' }}>
                              {t.evidenceReview || 'Evidence Attached'} ({mediaList.length}/3)
                            </span>
                            <span className="badge bg-success text-white" style={{ fontSize: '11px' }}>
                              ✓ {t.evidenceReady || 'Ready'}
                            </span>
                          </div>

                          <div className="row g-3">
                            {mediaList.map((item, idx) => (
                              <div key={item.id || idx} className="col-12 col-md-6 col-lg-4">
                                <div className="evidence-card-item">
                                  <div className="evidence-media-wrap">
                                    {item.type === 'video' ? (
                                      <video
                                        src={item.previewUrl}
                                        controls
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="evidence-video-element"
                                        aria-label="Attached video evidence"
                                      />
                                    ) : (
                                      <img
                                        src={item.previewUrl}
                                        alt={`Emergency evidence ${idx + 1}`}
                                        className="evidence-image-element"
                                      />
                                    )}
                                    <span className="evidence-type-tag">
                                      {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                                    </span>
                                  </div>

                                  <div className="evidence-card-info">
                                    <div className="evidence-filename text-truncate" title={item.name}>
                                      {item.name}
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '11px' }}>
                                      <span>{formatFileSize(item.size)}</span>
                                      <span className="text-uppercase">{item.mimeType?.split('/')[1] || item.type}</span>
                                    </div>

                                    <div className="evidence-actions-row mt-2">
                                      <button
                                        type="button"
                                        className="btn-use-this-evidence"
                                        title="Confirmed ready for submission"
                                        aria-label="Confirm evidence ready"
                                      >
                                        <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
                                        {t.useThis || 'Use This'}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn-retake-evidence"
                                        onClick={() => handleRetakeMedia(item.id, item.type === 'video')}
                                        title="Retake or re-select"
                                        aria-label={t.retake || 'Retake'}
                                      >
                                        <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>
                                        {t.retake || 'Retake'}
                                      </button>

                                      <button
                                        type="button"
                                        className="btn-remove-evidence"
                                        onClick={() => handleRemoveMedia(item.id)}
                                        title="Remove this media"
                                        aria-label={t.removeMedia || 'Remove'}
                                      >
                                        <i className="bi bi-trash3-fill me-1" aria-hidden="true"></i>
                                        {t.removeMedia || 'Remove'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="evidence-privacy-note mt-2">
                        <i className="bi bi-shield-check text-success me-1" aria-hidden="true"></i>
                        <span>{t.mediaPrivacyNote || 'Only share media that is safe and appropriate to share. Visual evidence is used as decision support by human coordinators.'}</span>
                      </div>
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
                      <i className="bi bi-exclamation-triangle-fill fs-5" aria-hidden="true"></i>
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
                      <span>{t.submittingReport}</span>
                    </>
                  ) : (
                    <>
                      <span>🚨 {t.sendReport}</span>
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
                <p className="report-ai-info-text">{t.hitlNotice}</p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}