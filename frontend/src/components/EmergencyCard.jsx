import { PriorityBadge, StatusBadge } from './Badges';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (diff < 1) return 'Just now';
  if (diff === 1) return '1 min ago';
  if (diff < 60) return `${diff} mins ago`;
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function EmergencyCard({ emergency, selected, onClick }) {
  const typeIcons = {
    'Road Accident':     'bi-car-front-fill',
    'Medical Emergency': 'bi-heart-pulse-fill',
    'Fire':              'bi-fire',
    'Crime / Safety':    'bi-shield-exclamation',
    'Natural Disaster':  'bi-cloud-rain-heavy-fill',
    'Other':             'bi-question-circle-fill',
  };

  const icon = emergency.typeIcon || typeIcons[emergency.type] || 'bi-exclamation-circle-fill';

  return (
    <div
      className={`emergency-card ${selected ? 'selected' : ''}`}
      onClick={() => onClick && onClick(emergency)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(emergency)}
      aria-label={`Emergency ${emergency.id} - ${emergency.type}`}
    >
      <div className="d-flex align-items-start justify-content-between mb-2">
        <div>
          <span className="emergency-id">#{emergency.id}</span>
          <div className="emergency-type mt-1">{emergency.type}</div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--surface-input, #f1f5f9)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 17, color: 'var(--text-secondary, #475569)',
        }}>
          <i className={`bi ${icon}`}></i>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
        <PriorityBadge priority={emergency.priority} />
        <StatusBadge status={emergency.status} />
      </div>

      <div className="d-flex align-items-center justify-content-between">
        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="bi bi-geo-alt"></i>
          {emergency.location?.area || emergency.location?.address || emergency.location_text || 'Unknown location'}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)' }}>
          {timeAgo(emergency.reportedAt || emergency.created_at || emergency.createdAt)}
        </div>
      </div>

      {emergency.ai && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--border-color, #f1f5f9)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '12px', color: 'var(--text-muted, #64748b)',
        }}>
          <i className="bi bi-robot" style={{ color: '#6366f1' }}></i>
          AI: {emergency.ai.recommendedResponders?.join(' + ')}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted, #94a3b8)' }}>
            {emergency.ai.confidence}% confidence
          </span>
        </div>
      )}
    </div>
  );
}

// Table row version for history
export function EmergencyRow({ emergency }) {
  return (
    <tr>
      <td>
        <span style={{ fontWeight: 700, color: 'var(--text-primary, #1e293b)', fontSize: '13px' }}>
          #{emergency.emergency_code || emergency.id}
        </span>
      </td>
      <td>{emergency.type}</td>
      <td><PriorityBadge priority={emergency.priority} /></td>
      <td><StatusBadge status={emergency.status} /></td>
      <td style={{ fontSize: '12.5px', color: '#64748b' }}>
        {timeAgo(emergency.reportedAt || emergency.created_at || emergency.createdAt)}
      </td>
    </tr>
  );
}
