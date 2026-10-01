import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, ROLES } from '../context/AppContext';
import './Navigation.css';

const ROLE_LABELS = {
  [ROLES.CITIZEN]:     { label: 'Citizen',               icon: 'bi-person-fill',           color: '#38BDF8' },
  [ROLES.COORDINATOR]: { label: 'Coordinator',           icon: 'bi-person-badge-fill',      color: '#EF4444' },
  [ROLES.RESPONDER]:   { label: 'Professional Responder',icon: 'bi-heart-pulse-fill',       color: '#22C55E' },
  [ROLES.HELPER]:      { label: 'Community Helper',      icon: 'bi-people-fill',            color: '#F59E0B' },
};

/**
 * TopNavbar Component
 * Unified, professional top navigation bar for Emergency Response Coordinator
 */
export function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole, switchRole, currentUser, openLangModal, currentLangMeta, isAuthenticated, logout } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleInfo = ROLE_LABELS[currentRole] || ROLE_LABELS[ROLES.COORDINATOR];

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
          aria-label="Emergency Response Coordinator Home"
        >
          <div className="top-nav-brand-icon" aria-hidden="true">
            <i className="bi bi-shield-shaded"></i>
          </div>
          <span className="top-nav-brand-name">Emergency Response Coordinator</span>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="top-nav-center" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link-btn ${isActive('/') ? 'active' : ''}`}
            onClick={() => handleNavigate('/')}
            aria-label="Go to Home"
          >
            <i className="bi bi-house-door-fill" aria-hidden="true"></i>
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/citizen/report') ? 'active' : ''}`}
            onClick={() => handleNavigate('/citizen/report')}
            aria-label="Go to Report Emergency"
          >
            <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
            <span>Report Emergency</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/coordinator') ? 'active' : ''}`}
            onClick={() => handleNavigate('/coordinator')}
            aria-label="Go to Command Center"
          >
            <i className="bi bi-speedometer2" aria-hidden="true"></i>
            <span>Command Center</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${isActive('/citizen/history') ? 'active' : ''}`}
            onClick={() => handleNavigate('/citizen/history')}
            aria-label="Go to Emergency History"
          >
            <i className="bi bi-clock-history" aria-hidden="true"></i>
            <span>Emergency History</span>
          </button>
        </nav>

        {/* Right: Language Switcher, Auth Buttons / Role Badge, Mobile Toggle */}
        <div className="top-nav-right">
          {/* Language Selector Button */}
          <button
            type="button"
            className="top-nav-lang-btn"
            onClick={openLangModal}
            aria-label={`Current language: ${currentLangMeta?.nativeName || 'English'}. Click to change language.`}
            title="Change Language / भाषा बदलें"
          >
            <i className="bi bi-translate" aria-hidden="true"></i>
            <span>{currentLangMeta?.nativeName || 'English'}</span>
          </button>

          {/* Authentication State */}
          {isAuthenticated ? (
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
                <span>{currentUser?.name || currentUser?.email} ({roleInfo?.label || 'Citizen'})</span>
              </div>
              <button
                type="button"
                className="top-nav-logout-btn"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
          ) : (
            <div className="top-nav-auth-buttons">
              <button
                type="button"
                className="top-nav-login-btn"
                onClick={() => handleNavigate('/login')}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i>
                <span>Login</span>
              </button>
              <button
                type="button"
                className="top-nav-signup-btn"
                onClick={() => handleNavigate('/signup')}
              >
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="top-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="top-nav-mobile-menu" role="dialog" aria-label="Mobile Navigation Menu">
          <div className="top-nav-mobile-links">
            <button
              type="button"
              className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => handleNavigate('/')}
            >
              <i className="bi bi-house-door-fill me-2" aria-hidden="true"></i>
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/citizen/report') ? 'active' : ''}`}
              onClick={() => handleNavigate('/citizen/report')}
            >
              <i className="bi bi-exclamation-octagon-fill me-2 text-danger" aria-hidden="true"></i>
              <span>Report Emergency</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/coordinator') ? 'active' : ''}`}
              onClick={() => handleNavigate('/coordinator')}
            >
              <i className="bi bi-speedometer2 me-2 text-primary" aria-hidden="true"></i>
              <span>Command Center</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${isActive('/citizen/history') ? 'active' : ''}`}
              onClick={() => handleNavigate('/citizen/history')}
            >
              <i className="bi bi-clock-history me-2 text-info" aria-hidden="true"></i>
              <span>Emergency History</span>
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
              <span>Language ({currentLangMeta?.nativeName || 'English'})</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                className="mobile-nav-item text-danger"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right me-2" aria-hidden="true"></i>
                <span>Logout ({currentUser?.name || currentUser?.email})</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={() => handleNavigate('/login')}
                >
                  <i className="bi bi-box-arrow-in-right me-2 text-primary" aria-hidden="true"></i>
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={() => handleNavigate('/signup')}
                >
                  <i className="bi bi-person-plus-fill me-2 text-success" aria-hidden="true"></i>
                  <span>Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Legacy Sidebar export stub.
 * Permanently removes the large left sidebar from layout while preserving backwards compatibility.
 */
export function Sidebar() {
  return null;
}

export default TopNavbar;
