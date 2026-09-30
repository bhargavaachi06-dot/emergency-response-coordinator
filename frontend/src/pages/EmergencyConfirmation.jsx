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
  } = useApp();

  const emergency = submittedEmergency;

  const savedLang = (() => {
    try {
      return localStorage.getItem('citizenLanguage') || 'en';
    } catch {
      return 'en';
    }
  })();
  const t = TRANSLATIONS[savedLang] || TRANSLATIONS.en;

  // =====================================================
  // Safety check
  // =====================================================

  if (!emergency && !loading) {
    return (
      <AppLayout
        title="Emergency Received"
        subtitle="Emergency information"
      >
        <div className="row justify-content-center">
          <div className="col-lg-7 col-xl-6">

            <div className="section-card">
              <div className="section-card-body text-center py-5">

                <i
                  className="bi bi-exclamation-circle"
                  style={{
                    fontSize: 48,
                    color: "#dc2626",
                  }}
                ></i>

                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginTop: 16,
                  }}
                >
                  Emergency information not found
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  Please return to the dashboard and
                  submit the emergency again.
                </p>

                <button
                  className="btn-primary-custom"
                  onClick={() =>
                    navigate("/citizen")
                  }
                >
                  <i className="bi bi-house"></i>
                  Back to Dashboard
                </button>

              </div>
            </div>

          </div>
        </div>
      </AppLayout>
    );
  }

  if (!emergency) {
    return (
      <AppLayout
        title="Emergency Received"
        subtitle="Loading emergency information..."
      >
        <div className="text-center py-5">
          <span className="spinner-border"></span>
        </div>
      </AppLayout>
    );
  }

  // =====================================================
  // Backend data
  // =====================================================

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
      ? `Lat: ${latitude}, Lng: ${longitude}`
      : "Location not available");

  const createdAt =
    emergency.created_at ||
    emergency.createdAt ||
    emergency.reportedAt;

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

  let ai =
    emergency.ai_analysis ||
    emergency.ai ||
    emergency.analysis ||
    null;

  if (typeof ai === "string") {
    try {
      ai = JSON.parse(ai);
    } catch {
      // ignore
    }
  }

  // =====================================================
  // Status helpers
  // =====================================================

  const normalizedStatus =
    String(status).toUpperCase();

  const isAnalyzing =
    normalizedStatus === "ANALYZING";

  const isDispatched =
    [
      "DISPATCHED",
      "RESPONDERS_EN_ROUTE",
      "ARRIVED",
      "RESOLVED",
    ].includes(normalizedStatus);

  const isResponding =
    [
      "RESPONDERS_EN_ROUTE",
      "ARRIVED",
    ].includes(normalizedStatus);

  const isResolved =
    normalizedStatus === "RESOLVED";

  // =====================================================
  // Timeline
  // =====================================================

  const timelineSteps = [
    {
      label: "Emergency Reported",
      done: true,
    },
    {
      label: "AI Analysis",
      done:
        !isAnalyzing &&
        Boolean(ai),
      active:
        isAnalyzing,
    },
    {
      label: "Coordinator Review",
      done:
        isDispatched,
      active:
        !isDispatched &&
        !isAnalyzing,
    },
    {
      label: "Responders Dispatched",
      done:
        isDispatched,
    },
    {
      label: "Response",
      done:
        isResponding ||
        isResolved,
      active:
        isResponding,
    },
    {
      label: "Resolved",
      done:
        isResolved,
      active:
        false,
    },
  ];

  return (
    <AppLayout
      title="Emergency Received"
      subtitle="Your report has been received"
    >
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">
          <BackButton fallback="/citizen" />

          {/* =================================================
              Success Banner
          ================================================= */}

          <div
            style={{
              background:
                "linear-gradient(135deg, #166534 0%, #15803d 100%)",
              borderRadius: 14,
              padding: "24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
              color: "#fff",
            }}
          >

            <div
              style={{
                width: 52,
                height: 52,
                background:
                  "rgba(255,255,255,0.15)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <i className="bi bi-check-circle-fill"></i>
            </div>

            <div>

              <div
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  marginBottom: 4,
                }}
              >
                {t.confirmedTitle || "Emergency Report Received"}
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  opacity: 0.9,
                  lineHeight: 1.45,
                }}
              >
                {t.confirmedSubtitle} {t.coordinatorReviewing}
              </div>

            </div>
          </div>

          {/* =================================================
              Emergency Reference
          ================================================= */}

          <div className="section-card mb-4">

            <div className="section-card-header">

              <h2 className="section-card-title">
                <i className="bi bi-hash text-muted"></i>
                {t.emergencyReference || "Emergency Reference"}
              </h2>

              <span
                className={`badge-status ${
                  isResolved
                    ? "badge-resolved"
                    : isAnalyzing
                    ? "badge-analyzing"
                    : "badge-dispatched"
                }`}
              >
                {normalizedStatus.replaceAll(
                  "_",
                  " "
                )}
              </span>

            </div>

            <div className="section-card-body">

              <div
                style={{
                  textAlign: "center",
                  padding: "16px 0",
                  borderBottom:
                    "1px solid #f1f5f9",
                  marginBottom: 20,
                }}
              >

                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 6,
                  }}
                >
                  {t.emergencyReference || "Emergency Reference"}
                </div>

                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#0f172a",
                    fontFamily: "monospace",
                  }}
                >
                  {emergencyCode}
                </div>

              </div>

              <div className="row g-3">

                <div className="col-6">

                  <div className="info-label">
                    Type
                  </div>

                  <div className="info-value">
                    {emergencyType}
                  </div>

                </div>

                <div className="col-6">

                  <div className="info-label">
                    Reported At
                  </div>

                  <div className="info-value">

                    {createdAt
                      ? new Date(
                          createdAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}

                  </div>

                </div>

                <div className="col-12">

                  <div className="info-label">
                    Location
                  </div>

                  <div className="info-value">
                    {locationText}
                  </div>

                </div>

                <div className="col-12">

                  <div className="info-label">
                    Evidence / Media
                  </div>

                  <div className="info-value d-flex align-items-center gap-2">
                    {totalMedia > 0 ? (
                      <span className="badge bg-success text-white py-1 px-2" style={{ fontSize: '12px' }}>
                        {evidenceText}
                      </span>
                    ) : (
                      <span className="text-secondary" style={{ fontSize: '13px' }}>
                        {t.noEvidence || 'Photo or video not provided'}
                      </span>
                    )}
                  </div>

                </div>

                {emergency.description && (
                  <div className="col-12">
                    <div className="info-label">
                      Description
                    </div>
                    <div className="info-value text-secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                      {emergency.description}
                    </div>
                  </div>
                )}

                <div className="col-6">

                  <div className="info-label">
                    Severity
                  </div>

                  <div className="info-value">
                    {emergency.severity ||
                      "Pending AI analysis"}
                  </div>

                </div>

                <div className="col-6">

                  <div className="info-label">
                    Priority
                  </div>

                  <div className="info-value">
                    {emergency.priority ||
                      "Pending AI analysis"}
                  </div>

                </div>

                <div className="col-12 mt-3 pt-3 border-top">
                  <div className="p-3 rounded-2" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div className="d-flex align-items-start gap-2">
                      <i className="bi bi-person-check-fill text-info mt-1" aria-hidden="true"></i>
                      <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.45 }}>
                        <strong>{t.hitlNotice || 'Your emergency report has been received. A human coordinator will review the available information and coordinate the appropriate response.'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* =================================================
              AI Analysis
          ================================================= */}

          {ai && (
            <div className="mb-4">

              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 10,
                }}
              >
                AI Analysis Result
              </h2>

              <AIAnalysisCard ai={ai} />

              <div
                style={{
                  fontSize: 11.5,
                  color: "#64748b",
                  marginTop: 8,
                }}
              >
                <i className="bi bi-info-circle me-1"></i>
                AI provides decision support. Final
                emergency response decisions remain
                with the coordinator.
              </div>

            </div>
          )}

          {/* =================================================
              Timeline
          ================================================= */}

          <div className="section-card mb-4">

            <div className="section-card-header">

              <h2 className="section-card-title">
                <i className="bi bi-list-check text-muted"></i>
                {t.responseTimeline || "Response Timeline"}
              </h2>

            </div>

            <div className="section-card-body">

              <div className="timeline">

                {timelineSteps.map(
                  (step, index) => (
                    <div
                      key={step.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom:
                          index ===
                          timelineSteps.length - 1
                            ? 0
                            : 16,
                      }}
                    >

                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",
                          flexShrink: 0,

                          background:
                            step.done
                              ? "#16a34a"
                              : step.active
                              ? "#f59e0b"
                              : "#e2e8f0",

                          color:
                            step.done ||
                            step.active
                              ? "#fff"
                              : "#64748b",
                        }}
                      >
                        {step.done ? (
                          <i className="bi bi-check"></i>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight:
                              step.active ||
                              step.done
                                ? 700
                                : 500,
                            color:
                              step.active
                                ? "#b45309"
                                : step.done
                                ? "#166534"
                                : "#64748b",
                          }}
                        >
                          {step.label}
                        </div>

                        {step.active && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            In progress
                          </div>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          </div>

          {/* =================================================
              Track Emergency
          ================================================= */}

          <button
            className="btn-primary-custom w-100"
            style={{
              justifyContent: "center",
              fontSize: 15,
              padding: "13px",
            }}
            onClick={() =>
              navigate("/citizen/status")
            }
            id="track-emergency-btn"
          >
            <i className="bi bi-map"></i>
            {t.trackEmergency || "Track Emergency"}
          </button>

          <button
            className="btn-outline-custom w-100 mt-2"
            style={{
              justifyContent: "center",
            }}
            onClick={() =>
              navigate("/citizen")
            }
          >
            {t.back || "Back to Dashboard"}
          </button>

        </div>
      </div>
    </AppLayout>
  );
}