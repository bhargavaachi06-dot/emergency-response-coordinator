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
    openLangModal,
  } = useApp();

  const myEmergencies = emergencies.slice(0, 3);

  const active = myEmergencies.filter(
    (e) => String(e.status).toUpperCase() !== "RESOLVED"
  ).length;

  const resolved = myEmergencies.filter(
    (e) => String(e.status).toUpperCase() === "RESOLVED"
  ).length;

  const latestStatus = myEmergencies[0]?.status || null;

  return (
    <AppLayout title="Citizen Dashboard">
      {/* Welcome Header */}
      <div className="page-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="page-title">
            Welcome, {currentUser?.name?.split(" ")[0] || "Citizen"} 👋
          </h1>
          <p className="page-subtitle">
            Report an emergency, check response status, or view past records.
          </p>
        </div>

        <button
          type="button"
          className="clay-button"
          style={{ fontSize: '13px', padding: '8px 16px', minHeight: '40px' }}
          onClick={openLangModal}
        >
          <i className="bi bi-translate text-primary"></i>
          Language Settings
        </button>
      </div>

      {/* Emergency CTA Banner - White Clay Card */}
      <div
        className="clay-card mb-4"
        style={{
          background: "var(--er-surface, #FFFFFF)",
          border: "2px solid var(--er-red-border, #FECACA)",
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
          boxShadow: "0 10px 28px rgba(220, 38, 38, 0.08), var(--clay-shadow-card)",
        }}
      >
        <div style={{ maxWidth: '580px' }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: "#DC2626",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 4,
            }}
          >
            🚨 Immediate Assistance
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: 4,
            }}
          >
            Need to report an emergency?
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#64748B",
              lineHeight: 1.5,
            }}
          >
            Responders and emergency coordinators are notified immediately upon report verification.
          </div>
        </div>

        <Link
          to="/citizen/report"
          id="report-emergency-btn"
          aria-label="Report a new emergency"
          className="btn-emergency"
          style={{
            fontSize: 16,
            padding: "14px 32px",
            minHeight: "52px",
          }}
        >
          <i className="bi bi-exclamation-octagon-fill"></i>
          REPORT EMERGENCY
        </Link>
      </div>

      {/* Stat Cards Row */}
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
                ? String(latestStatus).replaceAll("_", " ")
                : "—"
            }
            label="Latest Status"
            icon="bi-broadcast"
            color="blue"
          />
        </div>
      </div>

      {/* Recent Emergencies Table Card */}
      <div className="clay-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--er-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            <i className="bi bi-clock-history text-primary me-2"></i>
            Recent Emergency Reports
          </h2>

          <button
            type="button"
            className="btn-outline-custom"
            style={{
              fontSize: 12.5,
              padding: "6px 14px",
              minHeight: "36px",
            }}
            onClick={() => navigate("/citizen/history")}
          >
            View All History
          </button>
        </div>

        {myEmergencies.length === 0 ? (
          <EmptyState
            icon="bi-shield-check"
            title="No active emergencies"
            description="You have no emergency reports. Stay safe!"
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0" style={{ fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th className="ps-4 py-3 border-0">ID</th>
                  <th className="py-3 border-0">Type</th>
                  <th className="py-3 border-0">Priority</th>
                  <th className="py-3 border-0">Status</th>
                  <th className="py-3 border-0">Reported</th>
                </tr>
              </thead>
              <tbody>
                {myEmergencies.map((e) => (
                  <EmergencyRow key={e.id} emergency={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}