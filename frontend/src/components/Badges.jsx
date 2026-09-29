// Priority badge component
export function PriorityBadge({ priority }) {
  const classes = {
    critical: 'badge-critical',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
  };
  return (
    <span className={`badge-priority ${classes[priority] || 'badge-low'}`}>
      {priority}
    </span>
  );
}

// Status badge component
export function StatusBadge({ status }) {
  const classes = {
    analyzing:  'badge-analyzing',
    dispatched: 'badge-dispatched',
    'en-route': 'badge-en-route',
    arrived:    'badge-arrived',
    resolved:   'badge-resolved',
    pending:    'badge-pending',
    assisting:  'badge-dispatched',
  };
  const labels = {
    analyzing:  'Analyzing',
    dispatched: 'Dispatched',
    'en-route': 'En Route',
    arrived:    'Arrived',
    resolved:   'Resolved',
    pending:    'Pending',
    assisting:  'Assisting',
    accepted:   'Accepted',
  };
  return (
    <span className={`badge-status ${classes[status] || 'badge-pending'}`}>
      {labels[status] || status}
    </span>
  );
}
