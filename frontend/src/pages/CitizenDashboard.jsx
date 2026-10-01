import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { AppLayout } from "../layouts/AppLayout";
import { StatCard } from "../components/StatCard";
import { EmergencyRow } from "../components/EmergencyCard";
import { EmptyState } from "../components/States";

export default function CitizenDashboard() {
  const navigate = useNavigate();

  const {
    currentUser,
    emergencies = [],
  } = useApp();

  // ---------------------------------------------
  // CITIZEN EMERGENCIES
  // ---------------------------------------------

  const myEmergencies =
    emergencies.slice(0, 3);

  const active =
    myEmergencies.filter(
      (e) =>
        String(e.status).toUpperCase() !==
        "RESOLVED"
    ).length;

  const resolved =
    myEmergencies.filter(
      (e) =>
        String(e.status).toUpperCase() ===
        "RESOLVED"
    ).length;

  const latestStatus =
    myEmergencies[0]?.status || null;



  return (
    <AppLayout title="Citizen Dashboard">

      {/* ----------------------------------------- */}
      {/* WELCOME */}
      {/* ----------------------------------------- */}

      <div className="page-header">
        <h1 className="page-title">
          Welcome,{" "}
          {currentUser?.name?.split(" ")[0] ||
            "Citizen"}{" "}
          👋
        </h1>

        <p className="page-subtitle">
          Report an emergency or track the
          status of your existing reports.
        </p>
      </div>

      {/* ----------------------------------------- */}
      {/* EMERGENCY CTA */}
      {/* ----------------------------------------- */}

      <div
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 14,
          padding: "28px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          border: "1px solid #334155",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color:
                "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 6,
            }}
          >
            Emergency Reporting
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 4,
            }}
          >
            Need to report an emergency?
          </div>

          <div
            style={{
              fontSize: 13.5,
              color:
                "rgba(255,255,255,0.55)",
            }}
          >
            Professional responders will be
            notified immediately after AI
            analysis.
          </div>
        </div>

        {/* --------------------------------------- */}
        {/* REPORT BUTTON */}
        {/* --------------------------------------- */}

        <Link
          to="/citizen/report"
          id="report-emergency-btn"
          aria-label="Report a new emergency"
          className="btn-emergency"
          style={{
            fontSize: 16,
            padding: "14px 32px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            pointerEvents: "auto",
            position: "relative",
            zIndex: 10,
          }}
        >
          <i className="bi bi-exclamation-triangle-fill"></i>

          REPORT EMERGENCY
        </Link>
      </div>

      {/* ----------------------------------------- */}
      {/* STAT CARDS */}
      {/* ----------------------------------------- */}

      <div className="row g-3 mb-4">

        <div className="col-sm-4">
          <StatCard
            value={active}
            label="Active Emergencies"
            icon="bi-exclamation-circle-fill"
            color="red"
          />
        </div>

        <div className="col-sm-4">
          <StatCard
            value={resolved}
            label="Resolved"
            icon="bi-check-circle-fill"
            color="green"
          />
        </div>

        <div className="col-sm-4">
          <StatCard
            value={
              latestStatus
                ? String(
                    latestStatus
                  ).replaceAll("_", " ")
                : "—"
            }
            label="Latest Status"
            icon="bi-broadcast"
            color="blue"
          />
        </div>

      </div>

      {/* ----------------------------------------- */}
      {/* RECENT EMERGENCIES */}
      {/* ----------------------------------------- */}

      <div className="section-card">

        <div className="section-card-header">

          <h2 className="section-card-title">
            <i className="bi bi-clock-history text-muted"></i>
            Recent Emergency Reports
          </h2>

          <button
            type="button"
            className="btn-outline-custom"
            style={{
              fontSize: 12,
              padding: "6px 14px",
            }}
            onClick={() =>
              navigate(
                "/citizen/history"
              )
            }
          >
            View All
          </button>

        </div>

        {myEmergencies.length === 0 ? (

          <EmptyState
            icon="bi-shield-check"
            title="No active emergencies"
            description="You have no emergency reports. Stay safe!"
          />

        ) : (

          <div
            className="section-card-body"
            style={{
              padding: "0",
            }}
          >

            <div className="table-responsive">

              <table
                className="table table-hover mb-0"
                style={{
                  fontSize: 13.5,
                }}
              >

                <thead
                  style={{
                    background: "#f8fafc",
                    fontSize: 11.5,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.5px",
                  }}
                >

                  <tr>

                    <th className="ps-4 py-3 border-0 text-muted fw-600">
                      ID
                    </th>

                    <th className="py-3 border-0 text-muted fw-600">
                      Type
                    </th>

                    <th className="py-3 border-0 text-muted fw-600">
                      Priority
                    </th>

                    <th className="py-3 border-0 text-muted fw-600">
                      Status
                    </th>

                    <th className="py-3 border-0 text-muted fw-600">
                      Reported
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {myEmergencies.map(
                    (emergency) => (
                      <EmergencyRow
                        key={emergency.id}
                        emergency={
                          emergency
                        }
                      />
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

      {/* ----------------------------------------- */}
      {/* SAFETY INFORMATION */}
      {/* ----------------------------------------- */}

      <div
        style={{
          background: "#eff6ff",
          border:
            "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "16px 18px",
          display: "flex",
          alignItems:
            "flex-start",
          gap: 12,
          marginTop: 24,
        }}
      >

        <i
          className="bi bi-info-circle-fill"
          style={{
            color: "#1d4ed8",
            fontSize: 18,
            flexShrink: 0,
            marginTop: 2,
          }}
        ></i>

        <div>

          <div
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              color: "#1e40af",
              marginBottom: 4,
            }}
          >
            Important Reminder
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#1d4ed8",
              lineHeight: 1.6,
            }}
          >
            For life-threatening emergencies,
            always call{" "}
            <strong>112</strong>{" "}
            (National Emergency Number)
            first. This platform assists in
            coordinating a faster response but
            does not replace official emergency
            services.
          </div>

        </div>

      </div>

    </AppLayout>
  );
}