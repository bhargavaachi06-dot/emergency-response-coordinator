import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopNavbar } from '../components/Navigation';
import './LandingPage.css';

const EMERGENCY_TYPES = [
  {
    key: 'medical',
    label: 'Medical',
    icon: 'bi-heart-pulse-fill',
    color: '#DC2626',
    desc: 'Cardiac, injuries, acute health events',
  },
  {
    key: 'road_accident',
    label: 'Road Accident',
    icon: 'bi-car-front-fill',
    color: '#EA580C',
    desc: 'Collisions, rollovers, highway pileups',
  },
  {
    key: 'fire',
    label: 'Fire',
    icon: 'bi-fire',
    color: '#F59E0B',
    desc: 'Structural fires, smoke, gas leaks',
  },
  {
    key: 'crime',
    label: 'Crime / Safety',
    icon: 'bi-shield-exclamation',
    color: '#38BDF8',
    desc: 'Assault, threats, security emergencies',
  },
  {
    key: 'natural_disaster',
    label: 'Flood / Disaster',
    icon: 'bi-cloud-rain-heavy-fill',
    color: '#0284C7',
    desc: 'Flooding, storm damage, severe collapse',
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'bi-question-circle-fill',
    color: '#94A3B8',
    desc: 'Unclassified urgent assistance',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { switchRole, isAuthenticated } = useApp();

  const handleReportEmergency = (typeKey) => {
    switchRole('citizen');
    if (typeKey) {
      navigate('/citizen/report', { state: { preselectedType: typeKey } });
    } else {
      navigate('/citizen/report');
    }
  };

  const handleOpenCommandCenter = () => {
    switchRole('coordinator');
    navigate('/coordinator');
  };

  return (
    <div className="landing-container">
      {/* Unified Top Navigation */}
      <TopNavbar />

      {/* Main Content */}
      <main className="landing-content" id="main-content">
        <div className="container py-4">
          {/* =====================================================
              1. HERO SECTION
              ===================================================== */}
          <section className="landing-hero" aria-labelledby="hero-title">
            <div className="hero-kicker">
              <i className="bi bi-shield-shaded me-2 text-danger" aria-hidden="true"></i>
              <span>Intelligent Operations & Coordination Platform</span>
            </div>

            <h1 className="hero-title" id="hero-title">
              Emergency Response Coordinator
            </h1>

            <p className="hero-description">
              Report emergencies, understand incidents, and coordinate responders from one intelligent command center.
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => handleReportEmergency()}
                aria-label="Report an Emergency"
              >
                <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
                <span>Report Emergency</span>
              </button>

              <button
                type="button"
                className="btn-hero-secondary"
                onClick={handleOpenCommandCenter}
                aria-label="Open Command Center"
              >
                <i className="bi bi-speedometer2" aria-hidden="true"></i>
                <span>Open Command Center</span>
              </button>
            </div>

            {/* Authentication prompt for unauthenticated users */}
            {!isAuthenticated && (
              <div className="hero-auth-card">
                <div className="auth-card-info">
                  <span className="auth-card-title">
                    <i className="bi bi-shield-check text-success me-2"></i>
                    Secure Citizen &amp; Responder Access
                  </span>
                  <span className="auth-card-sub">
                    Sign in to track reports, receive dispatch notifications, and access response history.
                  </span>
                </div>
                <div className="auth-card-buttons">
                  <button
                    type="button"
                    className="btn-landing-login"
                    onClick={() => navigate("/login")}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    <span>Login</span>
                  </button>
                  <button
                    type="button"
                    className="btn-landing-signup"
                    onClick={() => navigate("/signup")}
                  >
                    <i className="bi bi-person-plus-fill me-1"></i>
                    <span>Create Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Supporting Points */}
            <div className="hero-supporting-points" aria-label="Core Capabilities">
              <div className="supporting-point-pill">
                <i className="bi bi-cpu-fill text-info" aria-hidden="true"></i>
                <span>AI Decision Support</span>
              </div>
              <div className="supporting-point-pill">
                <i className="bi bi-database-fill-check text-primary" aria-hidden="true"></i>
                <span>Persistent Memory</span>
              </div>
              <div className="supporting-point-pill">
                <i className="bi bi-person-check-fill text-success" aria-hidden="true"></i>
                <span>Human-in-the-Loop</span>
              </div>
            </div>
          </section>

          {/* =====================================================
              2. COMPACT EMERGENCY TYPE SECTION
              ===================================================== */}
          <section className="landing-types-section" aria-labelledby="types-section-title">
            <div className="section-head-compact">
              <h2 className="section-head-title" id="types-section-title">
                <i className="bi bi-grid-fill text-danger me-2" aria-hidden="true"></i>
                Select Emergency Category
              </h2>
              <span className="section-head-sub">Instant citizen reporting with triage categorization</span>
            </div>

            <div className="types-grid-compact" role="list">
              {EMERGENCY_TYPES.map((type) => (
                <div
                  key={type.key}
                  className="type-card-compact"
                  role="listitem"
                  onClick={() => handleReportEmergency(type.key)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleReportEmergency(type.key)}
                  aria-label={`Report ${type.label} emergency`}
                >
                  <div
                    className="type-icon-box"
                    style={{
                      background: `${type.color}18`,
                      color: type.color,
                      borderColor: `${type.color}35`,
                    }}
                    aria-hidden="true"
                  >
                    <i className={`bi ${type.icon}`}></i>
                  </div>
                  <div className="type-meta">
                    <h3 className="type-name">{type.label}</h3>
                    <p className="type-desc">{type.desc}</p>
                  </div>
                  <i className="bi bi-chevron-right type-arrow" aria-hidden="true"></i>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================
              3. ONE SHORT HUMAN-IN-THE-LOOP STATEMENT
              ===================================================== */}
          <section className="landing-hitl-section" aria-label="Governance & Safety">
            <div className="hitl-banner-compact">
              <div className="hitl-icon" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </div>
              <p className="hitl-text">
                AI supports emergency decisions. Final response actions remain under human coordinator control.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Clean Operations Footer */}
      <footer className="landing-footer-compact" role="contentinfo">
        <div className="container">
          <div className="footer-inner-compact">
            <div className="footer-brand">
              <i className="bi bi-broadcast text-danger me-2" aria-hidden="true"></i>
              <span>Emergency Response Coordinator</span>
            </div>
            <div className="footer-meta">
              <span>Mission-Critical Public Safety Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
