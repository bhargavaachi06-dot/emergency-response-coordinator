import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';

export default function LandingPage() {
  const navigate = useNavigate();
  const { switchRole } = useApp();

  const handleRoleSelect = (role) => {
    switchRole(role);

    if (role === 'citizen') {
      navigate('/citizen');
    } else if (role === 'coordinator') {
      navigate('/coordinator');
    } else if (role === 'responder') {
      navigate('/responder');
    } else if (role === 'helper') {
      navigate('/helper');
    }
  };

  return (
    <AppLayout title="Emergency Response Coordinator">
      <div className="container py-5">

        {/* Header */}
        <div className="text-center mb-5">
          <div
            style={{
              width: 75,
              height: 75,
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <i
              className="bi bi-shield-fill-exclamation"
              style={{ fontSize: 38, color: '#dc2626' }}
            ></i>
          </div>

          <h1 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
            Emergency Response
            <br />
            <span style={{ color: '#dc2626' }}>Coordinator</span>
          </h1>

          <p
            style={{
              maxWidth: 650,
              margin: '0 auto',
              color: '#64748b',
              lineHeight: 1.7,
            }}
          >
            A smart emergency coordination platform connecting citizens,
            professional responders, and community helpers.
          </p>
        </div>

        {/* Role Selection */}
        <div
          className="card border-0 shadow-sm"
          style={{ borderRadius: 18, padding: 30 }}
        >
          <div className="text-center mb-4">
            <h2 style={{ fontWeight: 750, color: '#0f172a' }}>
              Choose Your Role
            </h2>
            <p className="text-muted mb-0">Select a role to continue.</p>
          </div>

          <div className="row g-4">

            {/* Citizen */}
            <div className="col-md-6 col-lg-3">
              <button
                type="button"
                id="role-citizen-btn"
                className="w-100 h-100 border rounded-4 bg-white p-4"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRoleSelect('citizen')}
              >
                <i
                  className="bi bi-person-fill"
                  style={{ fontSize: 35, color: '#dc2626' }}
                ></i>
                <h5 className="mt-3 fw-bold">Citizen</h5>
                <p className="text-muted small mb-0">
                  Report emergencies and track response status.
                </p>
              </button>
            </div>

            {/* Coordinator */}
            <div className="col-md-6 col-lg-3">
              <button
                type="button"
                id="role-coordinator-btn"
                className="w-100 h-100 border rounded-4 bg-white p-4"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRoleSelect('coordinator')}
              >
                <i
                  className="bi bi-broadcast-pin"
                  style={{ fontSize: 35, color: '#2563eb' }}
                ></i>
                <h5 className="mt-3 fw-bold">Coordinator</h5>
                <p className="text-muted small mb-0">
                  Monitor incidents and coordinate responses.
                </p>
              </button>
            </div>

            {/* Responder */}
            <div className="col-md-6 col-lg-3">
              <button
                type="button"
                id="role-responder-btn"
                className="w-100 h-100 border rounded-4 bg-white p-4"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRoleSelect('responder')}
              >
                <i
                  className="bi bi-truck"
                  style={{ fontSize: 35, color: '#16a34a' }}
                ></i>
                <h5 className="mt-3 fw-bold">Responder</h5>
                <p className="text-muted small mb-0">
                  Accept assignments and update response status.
                </p>
              </button>
            </div>

            {/* Community Helper */}
            <div className="col-md-6 col-lg-3">
              <button
                type="button"
                id="role-helper-btn"
                className="w-100 h-100 border rounded-4 bg-white p-4"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRoleSelect('helper')}
              >
                <i
                  className="bi bi-people-fill"
                  style={{ fontSize: 35, color: '#7c3aed' }}
                ></i>
                <h5 className="mt-3 fw-bold">Community Helper</h5>
                <p className="text-muted small mb-0">
                  Help nearby people during emergencies.
                </p>
              </button>
            </div>

          </div>
        </div>

        {/* Emergency Notice */}
        <div
          className="alert alert-warning mt-4"
          style={{ borderRadius: 10, fontSize: 13 }}
        >
          <i className="bi bi-info-circle-fill me-2"></i>
          <strong>Important:</strong> For life-threatening emergencies, always
          call <strong>112</strong> first. This platform helps coordinate
          emergency response and does not replace official emergency services.
        </div>

      </div>
    </AppLayout>
  );
}
