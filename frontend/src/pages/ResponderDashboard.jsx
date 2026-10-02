import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { DEMO_RESPONDER } from '../data/demoData';

const STATUS_FLOW = ['dispatched', 'accepted', 'en-route', 'arrived', 'completed'];

const STATUS_ACTIONS = {
  dispatched: { label: 'ACCEPT DISPATCH', next: 'accepted',  color: '#0284C7', icon: 'bi-check-lg' },
  accepted:   { label: 'MARK EN ROUTE',  next: 'en-route',  color: '#D97706', icon: 'bi-truck' },
  'en-route': { label: 'MARK ARRIVED',   next: 'arrived',   color: '#0284C7', icon: 'bi-geo-alt-fill' },
  arrived:    { label: 'MARK COMPLETED', next: 'completed', color: '#16A34A', icon: 'bi-check-circle-fill' },
  completed:  { label: 'COMPLETED',      next: null,        color: '#64748B', icon: 'bi-check-circle-fill' },
};

function IncidentAssignment({ emergency, responderType }) {
  const [status, setStatus] = useState('en-route');

  const action = STATUS_ACTIONS[status] || STATUS_ACTIONS.dispatched;
  const progressIdx = STATUS_FLOW.indexOf(status);
  const responderIcons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };

  const handleAction = () => {
    if (action?.next) setStatus(action.next);
  };

  return (
    <div className="clay-card mb-4" style={{ padding: '24px' }}>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 pb-3 mb-3 border-bottom">
        <div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', fontFamily: 'monospace' }}>
            #{emergency.emergency_code || emergency.id}
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
            {emergency.type}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <PriorityBadge priority={emergency.priority} />
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="d-flex flex-column gap-3 mb-4">
        <div className="info-row">
          <span className="info-label" style={{ fontWeight: 700, color: '#64748B' }}>Location</span>
          <span className="info-value" style={{ fontWeight: 600, color: '#0F172A' }}>
            {emergency.location?.address || emergency.location_text || 'Coordinates available'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label" style={{ fontWeight: 700, color: '#64748B' }}>Instructions</span>
          <span className="info-value" style={{ color: '#334155' }}>
            {emergency.description || 'Proceed to incident location with emergency warning equipment.'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label" style={{ fontWeight: 700, color: '#64748B' }}>Assignment</span>
          <span className="info-value" style={{ fontWeight: 700, color: '#0F172A' }}>
            <span style={{ fontSize: 18 }}>{responderIcons[responderType] || '🔵'}</span>
            {' '}{responderType}
          </span>
        </div>
      </div>

      {/* Status progression tracker */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
          Status Progression: {status.replace('-', ' ')}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FLOW.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: i <= progressIdx ? '#16A34A' : '#E2E8F0',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
        <div className="d-flex justify-content-between mt-2 text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>
          <span>DISPATCHED</span>
          <span>ACCEPTED</span>
          <span>EN ROUTE</span>
          <span>ARRIVED</span>
          <span>COMPLETED</span>
        </div>
      </div>

      {/* Large tactile action button */}
      {action?.next && (
        <button
          className="clay-button w-100"
          style={{
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 800,
            padding: '14px 20px',
            minHeight: '52px',
            background: action.color === '#16A34A'
              ? 'linear-gradient(145deg, #16A34A 0%, #15803D 100%)'
              : action.color === '#D97706'
              ? 'linear-gradient(145deg, #D97706 0%, #B45309 100%)'
              : 'linear-gradient(145deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: 'var(--clay-shadow-md)',
          }}
          onClick={handleAction}
          id={`status-btn-${emergency.id}`}
        >
          <i className={`bi ${action.icon} me-2`}></i>
          {action.label}
        </button>
      )}

      {status === 'completed' && (
        <div style={{
          background: '#F0FDF4',
          border: '1.5px solid #BBF7D0',
          borderRadius: '14px',
          padding: '14px',
          textAlign: 'center',
          fontSize: '14.5px',
          fontWeight: 800,
          color: '#166534',
          boxShadow: 'var(--clay-shadow-sm)',
        }}>
          <i className="bi bi-check-circle-fill me-2"></i>
          Incident Response Completed
        </div>
      )}
    </div>
  );
}

export default function ResponderDashboard() {
  const { emergencies } = useApp();
  const responder = DEMO_RESPONDER;

  // Show first 2 emergencies as assigned to this responder
  const assigned = emergencies.slice(0, 2);

  return (
    <AppLayout title="Professional Responder" subtitle="Your assigned incidents">
      {/* Responder profile in White Clay Card */}
      <div
        className="clay-card mb-4"
        style={{
          background: '#FFFFFF',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div style={{
            width: 54,
            height: 54,
            background: 'linear-gradient(145deg, #DC2626 0%, #B91C1C 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: '#FFFFFF',
            boxShadow: 'var(--clay-shadow-red)',
            flexShrink: 0,
          }}>
            🚑
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0F172A', marginBottom: 2 }}>
              {responder.name}
            </div>
            <div style={{ fontSize: 13.5, color: '#64748B' }}>
              {responder.crew}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: 'var(--clay-shadow-sm)',
          }}>
            ● Unit On-Duty &amp; Dispatched
          </span>
        </div>
      </div>

      {/* Incident Assignments */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
          <i className="bi bi-card-checklist me-2 text-primary"></i>
          Active Assignments ({assigned.length})
        </h2>

        {assigned.map((emg) => (
          <IncidentAssignment
            key={emg.id}
            emergency={emg}
            responderType="Ambulance"
          />
        ))}
      </div>
    </AppLayout>
  );
}
