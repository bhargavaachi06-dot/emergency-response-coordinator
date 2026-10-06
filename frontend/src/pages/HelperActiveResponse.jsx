import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import { EmergencyTimeline } from '../components/EmergencyTimeline';
import { StatusBadge } from '../components/Badges';
import { DEMO_EMERGENCIES } from '../data/demoData';

const EMERGENCY = DEMO_EMERGENCIES[0];

const HELPER_TIMELINE = [
  { label: 'Alert Received', done: true,  time: '15:32' },
  { label: 'Help Accepted',  done: true,  time: '15:33' },
  { label: 'Assisting',      done: false, active: true },
  { label: 'Completed',      done: false },
];

export default function HelperActiveResponse() {
  const navigate = useNavigate();
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw assistance?')) return;
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      navigate('/helper');
    }, 1000);
  };

  return (
    <AppLayout title="Active Response" subtitle="You are currently assisting">
      <BackButton fallback="/helper" />

      {/* Active status banner in White Clay Card */}
      <div
        className="clay-card mb-4"
        style={{
          background: 'var(--er-surface, #FFFFFF)',
          border: '1.5px solid var(--er-amber-border, #FDE68A)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          boxShadow: 'var(--clay-shadow-card)',
        }}
      >
        <div style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(145deg, #D97706 0%, #B45309 100%)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          color: '#FFFFFF',
          boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)',
          flexShrink: 0,
        }}>
          🤝
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            Incident Reference #{EMERGENCY.id}
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 }}>
            You Are Actively Assisting
          </h1>
          <StatusBadge status="assisting" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          {/* Emergency info */}
          <div className="clay-card mb-4">
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              <i className="bi bi-info-circle-fill text-primary me-2"></i>
              Incident Details
            </h2>
            <div className="d-flex flex-column gap-3">
              <div className="info-row">
                <span className="info-label" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Type</span>
                <span className="info-value" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{EMERGENCY.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label" style={{ fontWeight: 700, color: '#64748B' }}>Distance</span>
                <span className="info-value">Approximately {EMERGENCY.location?.distance}</span>
              </div>
              <div className="info-row">
                <span className="info-label" style={{ fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>General Area</span>
                <span className="info-value">{EMERGENCY.location?.area}</span>
              </div>
              <div className="info-row">
                <span className="info-label" style={{ fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Description</span>
                <span className="info-value" style={{ color: 'var(--text-secondary, #334155)' }}>{EMERGENCY.description}</span>
              </div>
            </div>
          </div>

          {/* Professional responder status */}
          <div className="clay-card mb-4">
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              <i className="bi bi-broadcast text-danger me-2"></i>
              Professional Responders
            </h2>
            {EMERGENCY.responders.map((r) => {
              const icons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };
              return (
                <div key={r.type} className="responder-card mb-2">
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: 22 }}>{icons[r.type] || '🔵'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary, #0F172A)' }}>{r.type}</div>
                      {r.eta && <div className="text-secondary" style={{ fontSize: 12 }}>ETA: {r.eta}</div>}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              );
            })}
            <div style={{
              fontSize: 12.5, color: 'var(--text-muted, #64748B)', marginTop: 12,
              padding: '12px 14px', background: 'var(--surface-input, #F8FAFC)', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)',
            }}>
              Professional responders are the primary response team. Your assistance is supplementary.
            </div>
          </div>

          {/* Timeline */}
          <div className="clay-card mb-4">
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0F172A)', marginBottom: '16px' }}>
              <i className="bi bi-list-check text-muted me-2"></i>
              Your Response Timeline
            </h2>
            <EmergencyTimeline steps={HELPER_TIMELINE} />
          </div>

          {/* Withdraw Button */}
          <button
            className="btn-outline-custom w-100"
            style={{ justifyContent: 'center', fontSize: 14, padding: '12px', color: '#DC2626', borderColor: '#FECACA' }}
            onClick={handleWithdraw}
            disabled={withdrawing}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw Assistance'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
