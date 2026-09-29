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

      {/* Active status banner */}
      <div style={{
        background: 'linear-gradient(135deg, #854d0e 0%, #d97706 100%)',
        borderRadius: 14, padding: '20px 24px',
        marginBottom: 24, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, background: 'rgba(255,255,255,0.15)',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 26, flexShrink: 0,
        }}>
          🤝
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Emergency #{EMERGENCY.id}
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
            You Are Actively Assisting
          </div>
          <StatusBadge status="assisting" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          {/* Emergency info */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-info-circle-fill text-muted"></i>
                Emergency Details
              </h2>
            </div>
            <div className="section-card-body">
              <div className="info-row">
                <span className="info-label">Type</span>
                <span className="info-value">{EMERGENCY.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Distance</span>
                <span className="info-value">Approximately {EMERGENCY.location?.distance}</span>
              </div>
              <div className="info-row">
                <span className="info-label">General Area</span>
                <span className="info-value">{EMERGENCY.location?.area}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Description</span>
                <span className="info-value">{EMERGENCY.description}</span>
              </div>
            </div>
          </div>

          {/* Professional responder status */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-broadcast text-danger"></i>
                Professional Responders
              </h2>
            </div>
            <div className="section-card-body">
              {EMERGENCY.responders.map((r) => {
                const icons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };
                return (
                  <div key={r.type} className="responder-card mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>{icons[r.type] || '🔵'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.type}</div>
                        {r.eta && <div style={{ fontSize: 12, color: '#64748b' }}>ETA: {r.eta}</div>}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                );
              })}
              <div style={{
                fontSize: 12.5, color: '#64748b', marginTop: 10,
                padding: '10px', background: '#f8fafc', borderRadius: 8,
              }}>
                Professional responders are the primary response team. Your assistance is supplementary.
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-list-check text-muted"></i>
                Your Response Timeline
              </h2>
            </div>
            <div className="section-card-body">
              <EmergencyTimeline steps={HELPER_TIMELINE} />
            </div>
          </div>

          {/* Withdraw */}
          <button
            className="btn-outline-custom w-100"
            style={{ justifyContent: 'center', fontSize: 14, padding: '12px', color: '#dc2626', borderColor: '#fecaca' }}
            onClick={handleWithdraw}
            disabled={withdrawing}
            id="withdraw-btn"
          >
            {withdrawing
              ? <span className="spinner-border spinner-border-sm"></span>
              : <i className="bi bi-x-circle-fill"></i>
            }
            Withdraw Assistance
          </button>
        </div>

        <div className="col-lg-6">
          {/* Safety guidance */}
          <div style={{
            background: '#fef9c3', border: '2px solid #fde68a',
            borderRadius: 14, padding: '20px',
          }}>
            <div className="d-flex align-items-center gap-10 mb-14" style={{ gap: 10, marginBottom: 14 }}>
              <i className="bi bi-shield-fill-check" style={{ color: '#d97706', fontSize: 22 }}></i>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#854d0e' }}>Safety Guidelines</div>
            </div>
            <ul style={{ padding: '0 0 0 16px', margin: 0, fontSize: 13.5, color: '#92400e', lineHeight: 2 }}>
              <li>Only provide assistance within your skills and training.</li>
              <li>Do not move injured persons unless there is immediate danger.</li>
              <li>Keep the scene clear for professional responders to work.</li>
              <li>Call 112 if the situation gets worse.</li>
              <li>Your personal safety comes first — withdraw if you feel unsafe.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
