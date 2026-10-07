import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, ROLES } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import './Navigation.css';

/**
 * TopNavbar Component
 * Unified, responsive, multilingual top navigation bar for Emergency Response Coordinator
 */
export function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentRole,
    switchRole,
    currentUser,
    openLangModal,
    currentLangMeta,
    isAuthenticated,
    logout,
    t = {},
  } = useApp();
  const { openSettings } = useSettings();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabels = {
    [ROLES.CITIZEN]:     { label: t.userRoleCitizen || 'Citizen',                icon: 'bi-person-fill',            color: '#38BDF8' },
    [ROLES.COORDINATOR]: { label: t.userRoleCoordinator || 'Coordinator',        icon: 'bi-person-badge-fill',       color: '#EF4444' },
    [ROLES.RESPONDER]:   { label: t.userRoleResponder || 'Professional Responder',icon: 'bi-heart-pulse-fill',        color: '#22C55E' },
    [ROLES.HELPER]:      { label: t.userRoleHelper || 'Community Helper',         icon: 'bi-people-fill',             color: '#F59E0B' },
  };

  const roleInfo = roleLabels[currentRole] || roleLabels[ROLES.COORDINATOR];

  // Helper to determine active state of navigation links
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/citizen/report') {
      return (
        location.pathname === '/citizen/report' ||
        location.pathname === '/report' ||
        location.pathname === '/report-emergency'
      );
    }
    if (path === '/coordinator') {
      return (
        location.pathname.startsWith('/coordinator') ||
        location.pathname.startsWith('/command-center') ||
        location.pathname === '/dashboard'
      );
    }
    if (path === '/citizen/history') {
      return (
        location.pathname === '/citizen/history' ||
        location.pathname === '/history'
      );
    }
    return location.pathname === path;
  };

  // Safe navigation handler preserving role switching permissions
  const handleNavigate = (path) => {
    setMobileMenuOpen(false);

    if (path === '/coordinator') {
      if (switchRole && currentRole !== ROLES.COORDINATOR) {
        switchRole(ROLES.COORDINATOR);
      }
      navigate('/coordinator');
    } else if (path === '/citizen/report') {
      if (switchRole && currentRole !== ROLES.CITIZEN) {
        switchRole(ROLES.CITIZEN);
      }
      navigate('/citizen/report');
    } else {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="top-navbar-root" role="banner">
      <div className="top-navbar-container">
        {/* Left: Logo & Application Name */}
        <div
          className="top-nav-brand"
          onClick={() => handleNavigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/')}
          aria-label={t.appName || "Emergency Response Coordinator"}
        >
          <div className="top-nav-brand-icon" aria-hidden="true">
            <i className="bi bi-shield-shaded"></i>
          </div>
          <span className="top-nav-brand-name">{t.appName || "Emergency Response Coordinator"}</span>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="top-nav-center" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link-btn ${isActive('/') ? 'active' : ''}`}
            onClick={() => handleNavigate('/')}
            aria-label={t.navHome || "Home"}
          >
            <i className="bi bi-house-door-fill" aria-hidden="true"></i>
            <span>{t.navHome || "Home"}</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/citizen/report') ? 'active' : ''}`}
            onClick={() => handleNavigate('/citizen/report')}
            aria-label={t.navReport || "Report Emergency"}
          >
            <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
            <span>{t.navReport || "Report Emergency"}</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/coordinator') ? 'active' : ''}`}
            onClick={() => handleNavigate('/coordinator')}
            aria-label={t.navCommand || "Command Center"}
          >
            <i className="bi bi-speedometer2" aria-hidden="true"></i>
            <span>{t.navCommand || "Command Center"}</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/citizen/history') ? 'active' : ''}`}
            onClick={() => handleNavigate('/citizen/history')}
            aria-label={t.navHistory || "Emergency History"}
          >
            <i className="bi bi-clock-history" aria-hidden="true"></i>
            <span>{t.navHistory || "Emergency History"}</span>
          </button>
        </nav>

        {/* Right: Language Switcher, Settings, Auth Cluster, Mobile Toggle */}
        <div className="top-nav-right">
          {/* Language Selector Button */}
          <button
            type="button"
            className="top-nav-lang-btn"
            onClick={openLangModal}
            aria-label={`Current language: ${currentLangMeta?.nativeName || 'English'}. Click to change language.`}
            title={t.navLanguage || "Change Language / भाषा बदलें"}
          >
            <i className="bi bi-translate" aria-hidden="true"></i>
            <span>{currentLangMeta?.nativeName || 'English'}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            className="top-nav-settings-btn"
            onClick={openSettings}
            aria-label={t.navSettings || "Settings"}
            title={t.navSettings || "Settings"}
          >
            <i className="bi bi-gear-fill" aria-hidden="true"></i>
            <span>{t.navSettings || "Settings"}</span>
          </button>

          {/* Authentication State */}
          {isAuthenticated && (
            <div className="top-nav-user-cluster">
              <div
                className="top-nav-role-badge"
                title={`Logged in: ${currentUser?.email || currentUser?.name}`}
                aria-label={`User: ${currentUser?.name}`}
              >
                {currentUser?.profile_photo ? (
                  <img
                    src={currentUser.profile_photo}
                    alt={currentUser.name}
                    className="top-nav-avatar"
                  />
                ) : (
                  <span className="top-nav-role-dot" aria-hidden="true"></span>
                )}
                <span>{currentUser?.name || currentUser?.email} ({roleInfo?.label})</span>
              </div>
              <button
                type="button"
                className="top-nav-logout-btn"
                onClick={handleLogout}
                title={t.navLogout || "Logout"}
                aria-label={t.navLogout || "Logout"}
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="top-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? (t.closeMenu || 'Close Navigation Menu') : (t.openMenu || 'Open Navigation Menu')}
            aria-expanded={mobileMenuOpen}
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="top-nav-mobile-menu" role="dialog" aria-label={t.navMenu || "Mobile Navigation Menu"}>
          <div className="top-nav-mobile-links">
            <button
              type="button"
              className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => handleNavigate('/')}
            >
              <i className="bi bi-house-door-fill me-2" aria-hidden="true"></i>
              <span>{t.navHome || "Home"}</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/citizen/report') ? 'active' : ''}`}
              onClick={() => handleNavigate('/citizen/report')}
            >
              <i className="bi bi-exclamation-octagon-fill me-2 text-danger" aria-hidden="true"></i>
              <span>{t.navReport || "Report Emergency"}</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/coordinator') ? 'active' : ''}`}
              onClick={() => handleNavigate('/coordinator')}
            >
              <i className="bi bi-speedometer2 me-2 text-primary" aria-hidden="true"></i>
              <span>{t.navCommand || "Command Center"}</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/citizen/history') ? 'active' : ''}`}
              onClick={() => handleNavigate('/citizen/history')}
            >
              <i className="bi bi-clock-history me-2 text-info" aria-hidden="true"></i>
              <span>{t.navHistory || "Emergency History"}</span>
            </button>

            <button
              type="button"
              className="mobile-nav-item mobile-lang-item"
              onClick={() => {
                setMobileMenuOpen(false);
                openLangModal();
              }}
            >
              <i className="bi bi-translate me-2 text-warning" aria-hidden="true"></i>
              <span>{(t.navLanguage || 'Language')} ({currentLangMeta?.nativeName || 'English'})</span>
            </button>

            <button
              type="button"
              className="mobile-nav-item mobile-settings-item"
              onClick={() => {
                setMobileMenuOpen(false);
                openSettings();
              }}
            >
              <i className="bi bi-gear-fill me-2 text-primary" aria-hidden="true"></i>
              <span>{t.navSettings || "Settings"}</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                className="mobile-nav-item text-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-2" aria-hidden="true"></i>
                <span>{(t.navLogout || "Logout")} ({currentUser?.name || currentUser?.email})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Sidebar() {
  return null;
}

export default TopNavbar;
