
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { BackButton } from '../components/BackButton';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import { EmergencyTimeline } from '../components/EmergencyTimeline';
import { MapView } from '../components/MapView';
import { DEMO_EMERGENCIES } from '../data/demoData';

export default function EmergencyStatus() {
  const { submittedEmergency, emergencies } = useApp();
  const emergency = submittedEmergency || emergencies[0] || DEMO_EMERGENCIES[0];

  const emergencyCode = emergency.emergency_code || emergency.id;
  const emergencyLat = Number(emergency.latitude ?? emergency.location?.lat ?? 28.6139);
  const emergencyLng = Number(emergency.longitude ?? emergency.location?.lng ?? 77.2090);

  let ai = emergency.ai_analysis || emergency.ai || emergency.analysis || null;
  if (typeof ai === "string") {
    try {
      ai = JSON.parse(ai);
    } catch {
      // ignore
    }
  }

  const mapMarkers = [
    { lat: emergencyLat, lng: emergencyLng, type: 'emergency', label: `#${emergencyCode}` },
    ...(emergency.responders || []).map((r, i) => ({
      lat: emergencyLat + (i + 1) * 0.003,
      lng: emergencyLng + (i + 1) * 0.002,
      type: r.type === 'Ambulance' ? 'ambulance' : 'police',
      label: r.type,
      status: r.status,
      eta: r.eta,
    })),
  ];

  return (
    <AppLayout title="Emergency Status" subtitle={`Tracking #${emergencyCode}`}>
      <BackButton fallback="/citizen" />

      {/* Header card */}
      <div className="section-card mb-4">
        <div className="section-card-body">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                #{emergency.id}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {emergency.type}
              </h1>
              <div className="d-flex gap-2 flex-wrap">
                <PriorityBadge priority={emergency.priority} />
                <StatusBadge status={emergency.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left column */}
        <div className="col-lg-5">
          {/* Responder status */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-broadcast text-danger"></i>
                Responders
              </h2>
            </div>
            <div className="section-card-body">
              {(emergency.responders || []).map((r) => {
                const icons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };
                const avatarClass = { Ambulance: 'ambulance', Police: 'police', 'Fire/Rescue': 'fire' };
                return (
                  <div key={r.type} className="responder-card">
                    <div className="d-flex align-items-center gap-10">
                      <div className={`responder-avatar ${avatarClass[r.type] || 'ambulance'}`} style={{ gap: 0 }}>
                        {icons[r.type] || '🔵'}
                      </div>
                      <div style={{ marginLeft: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.type}</div>
                        {r.eta && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>ETA: {r.eta}</div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                );
              })}

              {/* Community helpers */}
              {emergency.helpers && (
                <div style={{
                  background: '#fef9c3', border: '1px solid #fde68a',
                  borderRadius: 8, padding: '10px 14px', marginTop: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>🤝</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#854d0e' }}>
                      Community Helpers
                    </div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>
                      {emergency.helpers.accepted} accepted · {emergency.helpers.notified} notified
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-list-check text-muted"></i>
                Response Timeline
              </h2>
            </div>
            <div className="section-card-body">
              <EmergencyTimeline steps={emergency.timeline || []} />
            </div>
          </div>

          {/* AI Analysis */}
          <AIAnalysisCard ai={ai} />
        </div>

        {/* Right column — Map */}
        <div className="col-lg-7">
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-map text-muted"></i>
                Live Location
              </h2>
            </div>
            <div className="section-card-body" style={{ padding: '0 0 0 0' }}>
              <MapView
                markers={mapMarkers}
                center={[emergency.location?.lat, emergency.location?.lng]}
                height={480}
              />
            </div>
          </div>

          {/* Location info */}
          <div className="section-card mt-4">
            <div className="section-card-body">
              <div className="row g-3">
                <div className="col-6">
                  <div className="info-label">Location</div>
                  <div className="info-value">{emergency.location?.address}</div>
                </div>
                <div className="col-6">
                  <div className="info-label">Area</div>
                  <div className="info-value">{emergency.location?.area || '—'}</div>
                </div>
                <div className="col-6">
                  <div className="info-label">Reported At</div>
                  <div className="info-value">
                    {new Date(emergency.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="col-6">
                  <div className="info-label">Priority</div>
                  <div className="info-value"><PriorityBadge priority={emergency.priority} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
