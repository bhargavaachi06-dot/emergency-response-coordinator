
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { DEMO_EMERGENCIES } from '../data/demoData';

const NEARBY_EMERGENCY = DEMO_EMERGENCIES[0];

export default function HelperDashboard() {
  const navigate = useNavigate();
  const { currentUser, helperAvailable, setHelperAvailable } = useApp();

  return (
    <AppLayout title="Community Helper" subtitle="Provide safe assistance in your area">
      {/* Profile & Availability */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 14, padding: '20px 24px',
        marginBottom: 24, color: '#fff',
        border: '1px solid #334155',
      }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-14">
            <div style={{
              width: 50, height: 50, background: '#d97706',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22,
            }}>
              🤝
            </div>
            <div style={{ marginLeft: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                Community Helper · First Aid Certified
              </div>
            </div>
          </div>

          {/* Availability toggle */}
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Availability Status
            </div>
            <div className="d-flex align-items-center gap-10" style={{ gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: helperAvailable ? '#4ade80' : '#94a3b8' }}>
                  {helperAvailable ? '● Available' : '○ Unavailable'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  For nearby emergency alerts
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle availability">
                <input
                  type="checkbox"
                  checked={helperAvailable}
                  onChange={(e) => setHelperAvailable(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="section-card mb-4">
        <div className="section-card-header">
          <h2 className="section-card-title">
            <i className="bi bi-star-fill" style={{ color: '#d97706' }}></i>
            My Skills
          </h2>
        </div>
        <div className="section-card-body">
          <div className="d-flex gap-2 flex-wrap">
            {['First Aid', 'CPR Certified', 'Basic Trauma Care'].map((skill) => (
              <span key={skill} style={{
                background: '#fef9c3', border: '1px solid #fde68a',
                borderRadius: 20, padding: '5px 14px',
                fontSize: 13, fontWeight: 600, color: '#854d0e',
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Nearby Emergency Alert */}
      {helperAvailable && (
        <div className="helper-alert-card mb-4">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="pulse-icon">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
              🚨 Emergency Near You
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              {NEARBY_EMERGENCY.type}
            </h2>
            <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 16 }}>
              Approximately {NEARBY_EMERGENCY.location?.distance} away
            </div>

            <div style={{
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                Situation
              </div>
              <div style={{ fontSize: 13.5, color: '#1e293b' }}>
                {NEARBY_EMERGENCY.description}
              </div>
            </div>

            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
            }}>
              <i className="bi bi-info-circle-fill" style={{ color: '#ea580c', flexShrink: 0 }}></i>
              <div style={{ fontSize: 12.5, color: '#9a3412' }}>
                Professional emergency responders have been notified and are en route.
                <strong> Can you provide safe assistance?</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div className="d-flex gap-2">
              <button
                className="btn-emergency"
                style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '14px' }}
                onClick={() => navigate('/helper/active')}
                id="accept-help-btn"
              >
                🤝 I CAN HELP
              </button>
              <button
                className="btn-outline-custom"
                style={{ flex: 1, justifyContent: 'center', fontSize: 14 }}
                onClick={() => {}} // Decline — just stays on dashboard
                id="decline-help-btn"
              >
                NOT AVAILABLE
              </button>
            </div>
          </div>
        </div>
      )}

      {!helperAvailable && (
        <div className="section-card mb-4">
          <div className="section-card-body">
            <div className="state-box" style={{ padding: '32px 0' }}>
              <i className="bi bi-bell-slash state-icon text-muted"></i>
              <div className="state-title">You are set to unavailable</div>
              <div className="state-desc">
                Turn on availability above to receive nearby emergency alerts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety note */}
      <div style={{
        background: '#fef9c3', border: '1px solid #fde68a',
        borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <i className="bi bi-shield-fill-check" style={{ color: '#d97706', fontSize: 18, flexShrink: 0, marginTop: 2 }}></i>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#854d0e', marginBottom: 3 }}>
            Safety First
          </div>
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
            Only provide safe assistance within your skills and capabilities.
            Professional emergency responders remain the primary response team.
            Do not put yourself in danger.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
