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
      {/* Profile & Availability White Clay Card */}
      <div
        className="clay-card mb-4"
        style={{
          background: 'var(--er-surface, #FFFFFF)',
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
            width: 52,
            height: 52,
            background: 'linear-gradient(145deg, #D97706 0%, #B45309 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: '#FFFFFF',
            boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)',
            flexShrink: 0,
          }}>
            🤝
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 2 }}>
              {currentUser?.name || 'Community Helper'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              Community Helper · First Aid Certified
            </div>
          </div>
        </div>

        {/* Availability toggle with Clay styling */}
        <div style={{
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: 'var(--clay-shadow-sm)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: helperAvailable ? '#16A34A' : '#64748B' }}>
              {helperAvailable ? '● Available for Alerts' : '○ Currently Unavailable'}
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
              Receive nearby assistance notifications
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

      {/* Skills in Clay Card */}
      <div className="clay-card mb-4">
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
          <i className="bi bi-star-fill text-warning me-2"></i>
          Verified Capabilities
        </h2>
        <div className="d-flex gap-2 flex-wrap">
          {['First Aid', 'CPR Certified', 'Basic Trauma Care'].map((skill) => (
            <span key={skill} style={{
              background: 'var(--er-amber-light, #FFFBEB)',
              border: '1px solid var(--er-amber-border, #FDE68A)',
              borderRadius: '9999px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--er-amber, #92400E)',
              boxShadow: 'var(--clay-shadow-sm)',
            }}>
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Nearby Emergency Alert in Tactile Clay Card */}
      {helperAvailable && (
        <div className="clay-card mb-4" style={{ border: '2px solid var(--er-red-border, #FECACA)', background: 'var(--er-surface, #FFFFFF)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="pulse-icon">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--er-red, #DC2626)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
              🚨 Emergency Near You
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--er-navy, #0F172A)', marginBottom: 4 }}>
              {NEARBY_EMERGENCY.type}
            </h2>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted, #64748B)', marginBottom: 16 }}>
              Approximately {NEARBY_EMERGENCY.location?.distance} away
            </div>

            <div style={{
              background: 'var(--surface-input, #F8FAFC)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: 16,
              textAlign: 'left',
              boxShadow: 'var(--clay-shadow-inset)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>
                Situation Summary
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-primary, #1E293B)', lineHeight: 1.5 }}>
                {NEARBY_EMERGENCY.description}
              </div>
            </div>

            <div style={{
              background: 'var(--er-amber-light, #FFFBEB)',
              border: '1px solid var(--er-amber-border, #FDE68A)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              boxShadow: 'var(--clay-shadow-sm)',
            }}>
              <i className="bi bi-info-circle-fill text-warning fs-5 flex-shrink-0"></i>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #92400E)' }}>
                Professional emergency responders have been notified and are en route.
                <strong> Can you provide safe assistance?</strong>
              </div>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="d-flex gap-3 flex-wrap">
              <button
                className="btn-emergency flex-grow-1"
                style={{ justifyContent: 'center', fontSize: 15, padding: '14px 24px', minHeight: '52px' }}
                onClick={() => navigate('/helper/active')}
                id="accept-help-btn"
              >
                <i className="bi bi-hand-thumbs-up-fill me-1"></i>
                I CAN HELP
              </button>
              <button
                className="btn-outline-custom flex-grow-1"
                style={{ justifyContent: 'center', fontSize: 14, padding: '14px 24px', minHeight: '52px' }}
                onClick={() => {}}
                id="decline-help-btn"
              >
                NOT AVAILABLE
              </button>
            </div>
          </div>
        </div>
      )}

      {!helperAvailable && (
        <div className="clay-card mb-4 text-center py-5">
          <i className="bi bi-bell-slash text-muted" style={{ fontSize: '42px' }}></i>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>
            You are set to unavailable
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Turn on availability above to receive nearby emergency alerts.
          </p>
        </div>
      )}

      {/* Safety note */}
      <div style={{
        background: 'var(--er-amber-light, #FFFBEB)',
        border: '1px solid var(--er-amber-border, #FDE68A)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: 'var(--clay-shadow-sm)',
      }}>
        <i className="bi bi-shield-fill-check text-warning fs-5 flex-shrink-0 mt-1"></i>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--er-amber, #92400E)', marginBottom: 2 }}>
            Safety First
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #B45309)', lineHeight: 1.55 }}>
            Only provide safe assistance within your skills and capabilities.
            Professional emergency responders remain the primary response team.
            Do not put yourself in danger.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
