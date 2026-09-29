// =====================================================
// Emergency Badges & Status Pills
// Modern command-center pills with iconography & high-contrast clarity
// =====================================================

/**
 * Normalizes input key to uppercase without spaces or dashes
 */
function normalizeKey(str) {
  if (!str) return '';
  return String(str).toUpperCase().replace(/[-\s]/g, '_');
}

/**
 * Priority Badge with text & iconography
 */
export function PriorityBadge({ priority }) {
  const norm = normalizeKey(priority);

  const configs = {
    CRITICAL: {
      className: 'badge-priority badge-critical',
      icon: 'bi-exclamation-octagon-fill',
      label: 'Critical',
    },
    HIGH: {
      className: 'badge-priority badge-high',
      icon: 'bi-exclamation-triangle-fill',
      label: 'High',
    },
    MEDIUM: {
      className: 'badge-priority badge-medium',
      icon: 'bi-dash-circle-fill',
      label: 'Medium',
    },
    LOW: {
      className: 'badge-priority badge-low',
      icon: 'bi-info-circle-fill',
      label: 'Low',
    },
  };

  const config = configs[norm] || {
    className: 'badge-priority badge-low',
    icon: 'bi-info-circle',
    label: priority || 'Low',
  };

  return (
    <span className={config.className} role="status">
      <i className={`bi ${config.icon}`} aria-hidden="true"></i>
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Severity Badge with text & iconography
 */
export function SeverityBadge({ severity }) {
  const norm = normalizeKey(severity);

  const configs = {
    CRITICAL: {
      className: 'badge-severity badge-severity-critical',
      icon: 'bi-lightning-fill',
      label: 'Critical',
    },
    SERIOUS: {
      className: 'badge-severity badge-severity-serious',
      icon: 'bi-exclamation-circle-fill',
      label: 'Serious',
    },
    MODERATE: {
      className: 'badge-severity badge-severity-moderate',
      icon: 'bi-shield-exclamation',
      label: 'Moderate',
    },
    LOW: {
      className: 'badge-severity badge-severity-low',
      icon: 'bi-shield-check',
      label: 'Low',
    },
  };

  const config = configs[norm] || {
    className: 'badge-severity badge-severity-low',
    icon: 'bi-shield',
    label: severity || 'Normal',
  };

  return (
    <span className={config.className} role="status">
      <i className={`bi ${config.icon}`} aria-hidden="true"></i>
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Modern Status Badge Pill supporting all lifecycle statuses
 */
export function StatusBadge({ status }) {
  const norm = normalizeKey(status);

  const statusConfigs = {
    REPORTED: {
      className: 'status-pill status-reported',
      icon: 'bi-broadcast-pin',
      label: 'Reported',
    },
    ANALYZING: {
      className: 'status-pill status-analyzing',
      icon: 'bi-cpu-fill',
      label: 'Analyzing',
      pulse: true,
    },
    VERIFIED: {
      className: 'status-pill status-verified',
      icon: 'bi-patch-check-fill',
      label: 'Verified',
    },
    DISPATCHED: {
      className: 'status-pill status-dispatched',
      icon: 'bi-send-check-fill',
      label: 'Dispatched',
    },
    RESPONDERS_EN_ROUTE: {
      className: 'status-pill status-en-route',
      icon: 'bi-truck-front-fill',
      label: 'En Route',
    },
    EN_ROUTE: {
      className: 'status-pill status-en-route',
      icon: 'bi-truck-front-fill',
      label: 'En Route',
    },
    ARRIVED: {
      className: 'status-pill status-arrived',
      icon: 'bi-geo-alt-fill',
      label: 'Arrived',
    },
    RESOLVED: {
      className: 'status-pill status-resolved',
      icon: 'bi-check2-circle',
      label: 'Resolved',
    },
    ACCEPTED: {
      className: 'status-pill status-accepted',
      icon: 'bi-person-check-fill',
      label: 'Accepted',
    },
    COMPLETED: {
      className: 'status-pill status-completed',
      icon: 'bi-check-all',
      label: 'Completed',
    },
    DECLINED: {
      className: 'status-pill status-declined',
      icon: 'bi-x-circle-fill',
      label: 'Declined',
    },
    WITHDRAWN: {
      className: 'status-pill status-withdrawn',
      icon: 'bi-arrow-counterclockwise',
      label: 'Withdrawn',
    },
    PENDING: {
      className: 'status-pill status-pending',
      icon: 'bi-hourglass-split',
      label: 'Pending',
    },
    ASSISTING: {
      className: 'status-pill status-assisting',
      icon: 'bi-people-fill',
      label: 'Assisting',
    },
  };

  const config = statusConfigs[norm] || {
    className: 'status-pill status-pending',
    icon: 'bi-circle-fill',
    label: status || 'Pending',
  };

  return (
    <span className={config.className} role="status">
      {config.pulse && <span className="status-pill-pulse" aria-hidden="true"></span>}
      <i className={`bi ${config.icon}`} aria-hidden="true"></i>
      <span>{config.label}</span>
    </span>
  );
}

export default StatusBadge;
