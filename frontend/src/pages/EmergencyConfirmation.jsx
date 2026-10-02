import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { AppLayout } from "../layouts/AppLayout";
import { BackButton } from "../components/BackButton";
import { AIAnalysisCard } from "../components/AIAnalysisCard";
import { TRANSLATIONS } from "../data/translations";

export default function EmergencyConfirmation() {
  const navigate = useNavigate();

  const {
    submittedEmergency,
    loading,
    language,
  } = useApp();

  const emergency = submittedEmergency;

  const savedLang = language || (() => {
    try {
      return localStorage.getItem('citizenLanguage') || 'en';
    } catch {
      return 'en';
    }
  })();
  const t = TRANSLATIONS[savedLang] || TRANSLATIONS.en;

  if (!emergency && !loading) {
    return (
      <AppLayout title="Emergency Confirmation">
        <div className="row justify-content-center">
          <div className="col-lg-7 col-xl-6">
            <div className="clay-card text-center py-5">
              <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: 48 }}></i>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>
                Emergency information not found
              </h2>
              <p style={{ color: "#64748B", fontSize: 14 }}>
                Please return to the dashboard and submit the emergency again.
              </p>
              <button
                className="clay-button"
                onClick={() => navigate("/citizen")}
              >
                <i className="bi bi-house me-2"></i>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!emergency) {
    return (
      <AppLayout title="Emergency Confirmation" subtitle="Loading emergency record...">
        <div className="text-center py-5">
          <span className="spinner-border text-primary"></span>
        </div>
      </AppLayout>
    );
  }

  const emergencyCode =
    emergency.emergency_code ||
    emergency.emergencyCode ||
    emergency.id;

  const emergencyType =
    emergency.type || "Emergency";

  const status =
    emergency.status || "REPORTED";

  const latitude =
    emergency.latitude ??
    emergency.location?.lat;

  const longitude =
    emergency.longitude ??
    emergency.location?.lng;

  const locationText =
    emergency.location_text ||
    emergency.locationText ||
    (latitude && longitude
      ? `Lat: ${Number(latitude).toFixed(5)}, Lng: ${Number(longitude).toFixed(5)}`
      : "Location not available");

  const photosCount = Number(emergency.photos_count || (Array.isArray(emergency.media) ? emergency.media.filter(m => m.media_type === 'photo' || m.type === 'photo').length : 0));
  const videosCount = Number(emergency.videos_count || (Array.isArray(emergency.media) ? emergency.media.filter(m => m.media_type === 'video' || m.type === 'video').length : 0));
  const totalMedia = photosCount + videosCount;

  let evidenceText = t.noEvidence || "Photo or video not provided";
  if (totalMedia > 0) {
    const parts = [];
    if (photosCount > 0) parts.push(`📷 ${photosCount} ${photosCount === 1 ? (t.photoAdded || 'Photo') : 'Photos'}`);
    if (videosCount > 0) parts.push(`🎥 ${videosCount} ${videosCount === 1 ? (t.videoAdded || 'Video') : 'Videos'}`);
    evidenceText = parts.join(', ');
  }

  let ai = emergency.ai_analysis || emergency.ai || emergency.analysis || null;
  if (typeof ai === "string") {
    try {
      ai = JSON.parse(ai);
    } catch {
      // ignore
    }
  }

  const normalizedStatus = String(status).toUpperCase();
  const isAnalyzing = normalizedStatus === "ANALYZING";
  const isDispatched = ["DISPATCHED", "RESPONDERS_EN_ROUTE", "ARRIVED", "RESOLVED"].includes(normalizedStatus);
  const isResponding = ["RESPONDERS_EN_ROUTE", "ARRIVED"].includes(normalizedStatus);
  const isResolved = normalizedStatus === "RESOLVED";

  const timelineSteps = [
    { label: "Emergency Reported", done: true },
    { label: "AI Analysis", done: !isAnalyzing && Boolean(ai), active: isAnalyzing },
    { label: "Coordinator Review", done: isDispatched, active: !isDispatched && !isAnalyzing },
    { label: "Responders Dispatched", done: isDispatched },
    { label: "Response", done: isResponding || isResolved, active: isResponding },
    { label: "Resolved", done: isResolved, active: false },
  ];

  return (
    <AppLayout title="Emergency Confirmation" subtitle="Your report has been received">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">
          <BackButton fallback="/citizen" />

          {/* Calm Confirmation Experience: White Clay Central Card */}
          <div
            className="clay-card mb-4"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--er-green-border, #BBF7D0)',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: 'var(--clay-shadow-card)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top confirmation banner */}
            <div className="d-flex align-items-center gap-3 mb-4">
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'linear-gradient(145deg, #16A34A 0%, #15803D 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  color: '#FFFFFF',
                  boxShadow: 'var(--clay-shadow-green)',
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-check-circle-fill"></i>
              </div>

              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Emergency report submitted
                </h1>
                <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
                  {t.confirmedSubtitle || "Your emergency report has been received and routed for response."}
                </p>
              </div>
            </div>

            {/* Reference Number in Soft Sunken Groove */}
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                marginBottom: '24px',
                boxShadow: 'var(--clay-shadow-inset)',
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                {t.emergencyReference || "Incident Reference"}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                #{emergencyCode}
              </div>
            </div>

            {/* Incident Summary Rows */}
            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Emergency Type
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  {emergencyType}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-start pb-2 border-bottom">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Location
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', textAlign: 'right', maxWidth: '65%' }}>
                  {locationText}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Evidence Status
                </span>
                <span
                  style={{
                    background: totalMedia > 0 ? '#F0FDF4' : '#F1F5F9',
                    border: totalMedia > 0 ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                    color: totalMedia > 0 ? '#166534' : '#64748B',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  {evidenceText}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Submission Status
                </span>
                <span
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {normalizedStatus.replaceAll('_', ' ')}
                </span>
              </div>
            </div>

            {/* Human in the loop assurance */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#166534',
                lineHeight: 1.45,
              }}
            >
              <i className="bi bi-person-check-fill text-success fs-5"></i>
              <span>{t.hitlNotice || "A human coordinator is reviewing this report and coordinating appropriate responders."}</span>
            </div>
          </div>

          {/* AI Decision Support (if available) */}
          {ai && (
            <div className="mb-4">
              <AIAnalysisCard ai={ai} />
            </div>
          )}

          {/* Progress Timeline */}
          <div className="clay-card mb-4" style={{ background: '#FFFFFF', padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '18px' }}>
              <i className="bi bi-list-check me-2 text-primary"></i>
              {t.responseTimeline || "Response Timeline"}
            </h2>

            <div className="d-flex flex-column gap-3">
              {timelineSteps.map((step, index) => (
                <div key={step.label} className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: step.done ? "#16A34A" : step.active ? "#0284C7" : "#F1F5F9",
                      color: step.done || step.active ? "#FFFFFF" : "#64748B",
                      border: step.done ? "1px solid #16A34A" : step.active ? "1px solid #0284C7" : "1px solid #CBD5E1",
                      boxShadow: "var(--clay-shadow-sm)",
                    }}
                  >
                    {step.done ? <i className="bi bi-check fs-6"></i> : <span style={{ fontSize: 11, fontWeight: 700 }}>{index + 1}</span>}
                  </div>

                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: step.active || step.done ? 700 : 500, color: step.done ? '#166534' : step.active ? '#0284C7' : '#64748B' }}>
                      {step.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Navigation */}
          <button
            className="btn-primary-custom w-100"
            style={{ minHeight: '52px', fontSize: '15px' }}
            onClick={() => navigate("/citizen/status")}
            id="track-emergency-btn"
          >
            <i className="bi bi-map me-1"></i>
            {t.trackEmergency || "Track Emergency"}
          </button>

          <button
            className="btn-outline-custom w-100 mt-3"
            style={{ minHeight: '48px', fontSize: '14px' }}
            onClick={() => navigate("/citizen")}
          >
            {t.back || "Back to Dashboard"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}