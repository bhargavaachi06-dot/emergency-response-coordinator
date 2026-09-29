import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, ROLES } from '../context/AppContext';

// Role definitions for the sidebar nav
const ROLE_NAVS = {
  [ROLES.CITIZEN]: [
    { label: 'Dashboard',         icon: 'bi-house-fill',           path: '/citizen' },
    { label: 'Report Emergency',  icon: 'bi-exclamation-triangle-fill', path: '/citizen/report' },
    { label: 'My Emergencies',    icon: 'bi-clock-history',         path: '/citizen/history' },
  ],
  [ROLES.COORDINATOR]: [
    { label: 'Command Center',    icon: 'bi-speedometer2',          path: '/coordinator' },
    { label: 'All Incidents',     icon: 'bi-list-ul',               path: '/coordinator/emergencies' },
  ],
  [ROLES.RESPONDER]: [
    { label: 'My Assignments',    icon: 'bi-clipboard2-pulse-fill', path: '/responder' },
  ],
  [ROLES.HELPER]: [
    { label: 'Helper Dashboard',  icon: 'bi-people-fill',           path: '/helper' },
    { label: 'Nearby Alert',      icon: 'bi-bell-fill',             path: '/helper/alert' },
  ],
};

const ROLE_LABELS = {
  [ROLES.CITIZEN]:     { label: 'Citizen',              icon: 'bi-person-fill',          color: '#1d4ed8' },
  [ROLES.COORDINATOR]: { label: 'Coordinator',           icon: 'bi-person-badge-fill',     color: '#dc2626' },
  [ROLES.RESPONDER]:   { label: 'Professional Responder',icon: 'bi-heart-pulse-fill',      color: '#16a34a' },
  [ROLES.HELPER]:      { label: 'Community Helper',      icon: 'bi-people-fill',           color: '#d97706' },
};

export function Sidebar() {
  const { currentRole, setCurrentRole, currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = ROLE_NAVS[currentRole] || [];
  const roleInfo = ROLE_LABELS[currentRole];

  const handleRoleSwitch = (role) => {
    setCurrentRole(role);
    // Navigate to the role's home page
    const paths = {
      [ROLES.CITIZEN]:     '/citizen',
      [ROLES.COORDINATOR]: '/coordinator',
      [ROLES.RESPONDER]:   '/responder',
      [ROLES.HELPER]:      '/helper',
    };
    navigate(paths[role]);
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="bi bi-broadcast" style={{ color: '#fff' }}></i>
        </div>
        <div className="brand-name">Emergency Response</div>
        <div className="brand-sub">Coordinator</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={`bi ${item.icon}`}></i>
            {item.label}
          </button>
        ))}

        {/* Role switcher */}
        <div className="sidebar-section-label" style={{ marginTop: 16 }}>Switch Role</div>
        {Object.entries(ROLE_LABELS).map(([role, info]) => (
          <button
            key={role}
            className={`sidebar-item ${currentRole === role ? 'active' : ''}`}
            onClick={() => handleRoleSwitch(role)}
          >
            <i className={`bi ${info.icon}`}></i>
            {info.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: 2 }}>
          {currentUser?.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block'
          }}></span>
          {roleInfo?.label}
        </div>
      </div>
    </aside>
  );
}

export function TopNavbar({ title, subtitle }) {
  const { currentRole } = useApp();
  const roleInfo = ROLE_LABELS[currentRole];
  const navigate = useNavigate();

  return (
    <header className="top-navbar">
      <div>
        <div className="navbar-brand-text">{title || 'Emergency Response Coordinator'}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div className="d-flex align-items-center gap-3">
        {/* Role indicator — rendered only when valid roleInfo is present */}
        {roleInfo?.label && (
          <div
            className="role-pill-badge"
            title={`Active Mode: ${roleInfo.label}`}
            aria-label={`Active role: ${roleInfo.label}`}
          >
            <i className={`bi ${roleInfo.icon}`} style={{ color: roleInfo.color }} aria-hidden="true"></i>
            <span>{roleInfo.label}</span>
          </div>
        )}

        {/* Emergency button shortcut */}
        <button
          className="btn-emergency btn-emergency-nav"
          onClick={() => navigate('/citizen/report')}
          aria-label="Report emergency incident"
        >
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          <span>Report</span>
        </button>
      </div>
    </header>
  );
}
