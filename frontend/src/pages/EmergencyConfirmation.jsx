import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { AppLayout } from "../layouts/AppLayout";
import { AIAnalysisCard } from "../components/AIAnalysisCard";

export default function EmergencyConfirmation() {
  const navigate = useNavigate();

  const {
    submittedEmergency,
    loading,
  } = useApp();

  const emergency = submittedEmergency;

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

  let ai =
    emergency.ai_analysis ||
    emergency.ai ||
    emergency.analysis ||
    null;

  if (typeof ai === "string") {
    try {
      ai = JSON.parse(ai);
    } catch (e) {
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
                Emergency Report Received
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  opacity: 0.8,
                }}
              >
                Your emergency has been successfully
                registered with the response system.
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
                Emergency Reference
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
                  Emergency Reference
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
                Response Timeline
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
            Track Emergency
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
            Back to Dashboard
          </button>

        </div>
      </div>
    </AppLayout>
  );
}