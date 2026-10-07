import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopNavbar } from '../components/Navigation';
import EmergencyContactsSection from '../components/EmergencyContacts';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { switchRole, isAuthenticated, t = {} } = useApp();

  const emergencyTypes = [
    {
      key: 'medical',
      label: t.typeMedicalTitle || t.types?.medical?.label || 'Medical',
      desc: t.typeMedicalDesc || t.types?.medical?.sublabel || 'Cardiac, injuries, acute health events',
      icon: 'bi-heart-pulse-fill',
      color: '#DC2626',
    },
    {
      key: 'road_accident',
      label: t.typeAccidentTitle || t.types?.road_accident?.label || 'Road Accident',
      desc: t.typeAccidentDesc || t.types?.road_accident?.sublabel || 'Collisions, rollovers, highway pileups',
      icon: 'bi-car-front-fill',
      color: '#EA580C',
    },
    {
      key: 'fire',
      label: t.typeFireTitle || t.types?.fire?.label || 'Fire',
      desc: t.typeFireDesc || t.types?.fire?.sublabel || 'Structural fires, smoke, gas leaks',
      icon: 'bi-fire',
      color: '#F59E0B',
    },
    {
      key: 'crime',
      label: t.typeCrimeTitle || t.types?.crime?.label || 'Crime / Safety',
      desc: t.typeCrimeDesc || t.types?.crime?.sublabel || 'Assault, threats, security emergencies',
      icon: 'bi-shield-exclamation',
      color: '#38BDF8',
    },
    {
      key: 'natural_disaster',
      label: t.typeDisasterTitle || t.types?.natural_disaster?.label || 'Flood / Disaster',
      desc: t.typeDisasterDesc || t.types?.natural_disaster?.sublabel || 'Flooding, storm damage, severe collapse',
      icon: 'bi-cloud-rain-heavy-fill',
      color: '#0284C7',
    },
    {
      key: 'other',
      label: t.typeOtherTitle || t.types?.other?.label || 'Other Help',
      desc: t.typeOtherDesc || t.types?.other?.sublabel || 'Unclassified urgent assistance',
      icon: 'bi-question-circle-fill',
      color: '#94A3B8',
    },
  ];

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
              <span>{t.heroKicker || 'Intelligent Operations & Coordination Platform'}</span>
            </div>

            <h1 className="hero-title" id="hero-title">
              {t.heroTitle || t.appName || 'Emergency Response Coordinator'}
            </h1>

            <p className="hero-description">
              {t.heroDesc || 'Report emergencies, understand incidents, and coordinate responders from one intelligent command center.'}
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => handleReportEmergency()}
                aria-label={t.heroReportBtn || 'Report an Emergency'}
              >
                <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
                <span>{t.heroReportBtn || 'Report Emergency'}</span>
              </button>

              <button
                type="button"
                className="btn-hero-secondary"
                onClick={handleOpenCommandCenter}
                aria-label={t.heroCommandBtn || 'Open Command Center'}
              >
                <i className="bi bi-speedometer2" aria-hidden="true"></i>
                <span>{t.heroCommandBtn || 'Open Command Center'}</span>
              </button>
            </div>

            {/* Authentication prompt for unauthenticated users */}
            {!isAuthenticated && (
              <div className="hero-auth-card">
                <div className="auth-card-info">
                  <span className="auth-card-title">
                    <i className="bi bi-shield-check text-success me-2"></i>
                    {t.authCardTitle || 'Secure Citizen & Responder Access'}
                  </span>
                  <span className="auth-card-sub">
                    {t.authCardSub || 'Sign in to track reports, receive dispatch notifications, and access response history.'}
                  </span>
                </div>
                <div className="auth-card-buttons">
                  <button
                    type="button"
                    className="btn-landing-login"
                    onClick={() => navigate("/login")}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    <span>{t.authCardLogin || t.login || 'Login'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-landing-signup"
                    onClick={() => navigate("/signup")}
                  >
                    <i className="bi bi-person-plus-fill me-1"></i>
                    <span>{t.authCardSignup || t.signUp || 'Create Account'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Supporting Points */}
            <div className="hero-supporting-points" aria-label="Core Capabilities">
              <div className="supporting-point-pill">
                <i className="bi bi-cpu-fill text-info" aria-hidden="true"></i>
                <span>{t.pointAiDecision || 'AI Decision Support'}</span>
              </div>
              <div className="supporting-point-pill">
                <i className="bi bi-database-fill-check text-primary" aria-hidden="true"></i>
                <span>{t.pointMemory || 'Persistent Memory'}</span>
              </div>
              <div className="supporting-point-pill">
                <i className="bi bi-person-check-fill text-success" aria-hidden="true"></i>
                <span>{t.pointHitl || 'Human-in-the-Loop'}</span>
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
                {t.typesSectionTitle || 'Select Emergency Category'}
              </h2>
              <span className="section-head-sub">
                {t.typesSectionSubtitle || 'Instant citizen reporting with triage categorization'}
              </span>
            </div>

            <div className="types-grid-compact" role="list">
              {emergencyTypes.map((type) => (
                <div
                  key={type.key}
                  className="type-card-compact"
                  role="listitem"
                  onClick={() => handleReportEmergency(type.key)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleReportEmergency(type.key)}
                  aria-label={`${type.label} emergency`}
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
              3. EMERGENCY CONTACTS (DIRECT HELPLINES)
              ===================================================== */}
          <EmergencyContactsSection />

          {/* =====================================================
              4. ONE SHORT HUMAN-IN-THE-LOOP STATEMENT
              ===================================================== */}
          <section className="landing-hitl-section" aria-label="Governance & Safety">
            <div className="hitl-banner-compact">
              <div className="hitl-icon" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </div>
              <p className="hitl-text">
                {t.hitlBannerText || t.hitlNotice || 'AI supports emergency decisions. Final response actions remain under human coordinator control.'}
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
              <span>{t.footerBrand || t.appName || 'Emergency Response Coordinator'}</span>
            </div>
            <div className="footer-meta">
              <span>{t.footerTagline || 'Mission-Critical Public Safety Platform'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
