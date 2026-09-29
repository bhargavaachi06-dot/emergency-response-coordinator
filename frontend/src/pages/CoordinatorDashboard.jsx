import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { StatCard } from '../components/StatCard';
import { EmergencyCard } from '../components/EmergencyCard';
import { MapView } from '../components/MapView';
import { EmptyState } from '../components/States';

function buildMapMarkers(emergencies) {
  const markers = [];
  emergencies.forEach((e, idx) => {
    if (!e.location?.lat) return;
    markers.push({ lat: e.location.lat, lng: e.location.lng, type: 'emergency', label: `#${e.id}` });
    (e.responders || []).forEach((r, ri) => {
      markers.push({
        lat: e.location.lat + (ri + 1) * 0.003 + idx * 0.005,
        lng: e.location.lng + (ri + 1) * 0.002 + idx * 0.005,
        type: r.type === 'Ambulance' ? 'ambulance' : r.type === 'Police' ? 'police' : 'helper',
        label: `${r.type} — ${e.id}`,
        status: r.status,
        eta: r.eta,
      });
    });
  });
  return markers;
}

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { emergencies, setSelectedEmergency } = useApp();

  const [selected, setSelected] = useState(null);

  const active   = emergencies.filter((e) => e.status !== 'resolved');
  const critical = active.filter((e) => e.priority === 'critical').length;
  const high     = active.filter((e) => e.priority === 'high').length;
  const medium   = active.filter((e) => e.priority === 'medium').length;

  const handleSelect = (emergency) => {
    setSelected(emergency);
    setSelectedEmergency(emergency);
  };

  const handleViewIncident = (emergency) => {
    setSelectedEmergency(emergency);
    const code = emergency.emergency_code || emergency.id;
    navigate(`/coordinator/emergency/${code}`);
  };

  const mapMarkers = buildMapMarkers(active);
  const mapCenter  = selected
    ? [selected.location?.lat, selected.location?.lng]
    : [28.6139, 77.2090];

  return (
    <AppLayout
      title="Emergency Response Command Center"
      subtitle="Live incident monitoring and coordination"
    >
      {/* Live indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 20, fontSize: 13, color: '#64748b',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
          display: 'inline-block', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)',
        }}></span>
        Live Monitoring Active
        <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>
        Last updated: just now
      </div>

      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard value={active.length.toString().padStart(2, '0')} label="Active Emergencies" icon="bi-exclamation-circle-fill" color="red" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard value={critical.toString().padStart(2, '0')} label="Critical" icon="bi-fire" color="red" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard value={high.toString().padStart(2, '0')} label="High Priority" icon="bi-arrow-up-circle-fill" color="orange" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard value={medium.toString().padStart(2, '0')} label="Medium Priority" icon="bi-dash-circle-fill" color="amber" />
        </div>
      </div>

      {/* Main layout */}
      <div className="incident-layout">
        {/* Incident list panel */}
        <div className="incident-list-panel">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Active Incidents
            </h2>
            <span style={{
              background: '#fee2e2', color: '#dc2626',
              fontSize: 11, fontWeight: 700, padding: '3px 8px',
              borderRadius: 20, border: '1px solid #fecaca',
            }}>
              {active.length} ACTIVE
            </span>
          </div>

          {active.length === 0 ? (
            <div className="section-card">
              <EmptyState
                icon="bi-shield-check"
                title="No active emergencies"
                description="All clear. No incidents currently active."
              />
            </div>
          ) : (
            active.map((e) => (
              <div key={e.id}>
                <EmergencyCard
                  emergency={e}
                  selected={selected?.id === e.id}
                  onClick={handleSelect}
                />
                {/* Quick actions shown when selected */}
                {selected?.id === e.id && (
                  <div className="mb-2 mt-1 px-1">
                    <button
                      className="btn-primary-custom w-100"
                      style={{ justifyContent: 'center', fontSize: 13 }}
                      onClick={() => handleViewIncident(e)}
                      id={`view-incident-${e.id}`}
                    >
                      <i className="bi bi-eye-fill"></i>
                      View Full Incident
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Map panel */}
        <div className="incident-map-panel">
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-map text-muted"></i>
                Live Incident Map
                {selected && (
                  <span className="badge-priority badge-critical ms-2">
                    #{selected.id} Selected
                  </span>
                )}
              </h2>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                🚨 Emergency &nbsp; 🚑 Ambulance &nbsp; 👮 Police &nbsp; 🤝 Helper
              </div>
            </div>
            <div style={{ padding: 0 }}>
              <MapView
                markers={mapMarkers}
                center={mapCenter}
                height={520}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
