import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { DEMO_EMERGENCIES, DEMO_RESPONDER } from '../data/demoData';

const STATUS_FLOW = ['pending', 'accepted', 'en-route', 'arrived', 'completed'];

const STATUS_ACTIONS = {
  pending:   { label: 'ACCEPT',    next: 'accepted',  btnClass: 'btn-primary-custom', icon: 'bi-check-lg' },
  accepted:  { label: 'EN ROUTE',  next: 'en-route',  btnClass: 'btn-primary-custom', icon: 'bi-truck' },
  'en-route':{ label: 'ARRIVED',   next: 'arrived',   btnClass: 'btn-primary-custom', icon: 'bi-geo-alt-fill' },
  arrived:   { label: 'COMPLETED', next: 'completed', btnClass: 'btn-primary-custom', icon: 'bi-check-circle-fill' },
  completed: { label: 'COMPLETED', next: null,        btnClass: 'btn-outline-custom',  icon: 'bi-check-circle-fill' },
};

function IncidentAssignment({ emergency, responderType }) {
  const [status, setStatus] = useState('en-route');

  const action = STATUS_ACTIONS[status];
  const progressIdx = STATUS_FLOW.indexOf(status);
  const responderIcons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };

  const handleAction = () => {
    if (action?.next) setStatus(action.next);
  };

  return (
    <div className="section-card mb-4">
      <div className="section-card-header">
        <div>
          <span className="emergency-id">#{emergency.id}</span>
          <div className="emergency-type mt-1">{emergency.type}</div>
        </div>
        <div className="d-flex gap-2">
          <PriorityBadge priority={emergency.priority} />
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="section-card-body">
        <div className="info-row">
          <span className="info-label">Location</span>
          <span className="info-value">{emergency.location?.address}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Description</span>
          <span className="info-value">{emergency.description}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Assignment</span>
          <span className="info-value">
            <span style={{ fontSize: 18 }}>{responderIcons[responderType] || '🔵'}</span>
            {' '}{responderType}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Response Progress</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_FLOW.slice(0, 5).map((s, i) => (
              <div
                key={s}
                style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: i <= progressIdx ? '#1d4ed8' : '#e2e8f0',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' }}>
            {status.replace('-', ' ')}
          </div>
        </div>

        {/* Action button */}
        {action?.next && (
          <button
            className={`${action.btnClass} w-100`}
            style={{ justifyContent: 'center', fontSize: 14, padding: '12px' }}
            onClick={handleAction}
            id={`status-btn-${emergency.id}`}
          >
            <i className={`bi ${action.icon}`}></i>
            {action.label}
          </button>
        )}
        {status === 'completed' && (
          <div style={{
            background: '#dcfce7', border: '1px solid #bbf7d0',
            borderRadius: 8, padding: '12px', textAlign: 'center',
            fontSize: 14, fontWeight: 700, color: '#166534',
          }}>
            <i className="bi bi-check-circle-fill me-2"></i>
            Incident Completed
          </div>
        )}
      </div>
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
      {/* Responder profile */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 14, padding: '20px 24px',
        marginBottom: 24, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 16,
        border: '1px solid #334155',
      }}>
        <div style={{
          width: 52, height: 52, background: '#dc2626',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}>
          🚑
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>
            {responder.name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
            {responder.crew}
          </div>
          <div className="d-flex gap-2">
            <span style={{
              background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
              color: '#4ade80', borderRadius: 20, padding: '3px 10px',
              fontSize: 11, fontWeight: 600,
            }}>
              ● ON DUTY
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '3px 10px',
              fontSize: 11,
            }}>
              {responder.type}
            </span>
          </div>
        </div>
      </div>

      {/* Assigned Incidents */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
          Assigned Incidents ({assigned.length})
        </h2>

        <div className="row g-4">
          {assigned.map((emergency) => (
            <div key={emergency.id} className="col-lg-6">
              <IncidentAssignment
                emergency={emergency}
                responderType={responder.type}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Safety note */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontSize: 13,
      }}>
        <i className="bi bi-shield-check-fill" style={{ color: '#1d4ed8', fontSize: 16, flexShrink: 0, marginTop: 1 }}></i>
        <div style={{ color: '#1e40af' }}>
          Update your status as you progress. Coordinators and the reporting citizen can track your location and ETA in real-time.
        </div>
      </div>
    </AppLayout>
  );
}
