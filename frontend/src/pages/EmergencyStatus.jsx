import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { BackButton } from '../components/BackButton';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import { MapView } from '../components/MapView';
import { DEMO_EMERGENCIES } from '../data/demoData';

const STAGES = [
  { key: 'REPORTED', label: 'Reported', icon: 'bi-broadcast-pin' },
  { key: 'ANALYZING', label: 'Analyzing', icon: 'bi-cpu-fill' },
  { key: 'VERIFIED', label: 'Verified', icon: 'bi-patch-check-fill' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'bi-send-check-fill' },
  { key: 'RESPONDERS_EN_ROUTE', label: 'Responders En Route', icon: 'bi-truck-front-fill' },
  { key: 'ARRIVED', label: 'Arrived', icon: 'bi-geo-alt-fill' },
  { key: 'RESOLVED', label: 'Resolved', icon: 'bi-check2-circle' },
];

function getStageIndex(statusStr) {
  const norm = String(statusStr || '').toUpperCase().replace(/[-\s]/g, '_');
  if (norm === 'REPORTED') return 0;
  if (norm === 'ANALYZING') return 1;
  if (norm === 'VERIFIED') return 2;
  if (norm === 'DISPATCHED') return 3;
  if (norm === 'RESPONDERS_EN_ROUTE' || norm === 'EN_ROUTE' || norm === 'ACCEPTED') return 4;
  if (norm === 'ARRIVED') return 5;
  if (norm === 'RESOLVED' || norm === 'COMPLETED') return 6;
  return 0;
}

export default function EmergencyStatus() {
  const { submittedEmergency, emergencies } = useApp();
  const emergency = submittedEmergency || emergencies[0] || DEMO_EMERGENCIES[0];

  const emergencyCode = emergency.emergency_code || emergency.id;
  // Only use real stored coordinates — no Delhi fallback
  const rawLat = emergency.latitude ?? emergency.location?.lat;
  const rawLng = emergency.longitude ?? emergency.location?.lng;
  const emergencyLat = rawLat !== undefined && rawLat !== null ? Number(rawLat) : null;
  const emergencyLng = rawLng !== undefined && rawLng !== null ? Number(rawLng) : null;
  const hasValidCoords = emergencyLat !== null && emergencyLng !== null &&
                         !isNaN(emergencyLat) && !isNaN(emergencyLng);

  let ai = emergency.ai_analysis || emergency.ai || emergency.analysis || null;
  if (typeof ai === "string") {
    try {
      ai = JSON.parse(ai);
    } catch {
      // ignore
    }
  }

  const mapMarkers = hasValidCoords ? [
    { lat: emergencyLat, lng: emergencyLng, type: 'emergency', label: `#${emergencyCode}` },
    ...(emergency.responders || []).map((r, i) => ({
      lat: emergencyLat + (i + 1) * 0.003,
      lng: emergencyLng + (i + 1) * 0.002,
      type: r.type === 'Ambulance' ? 'ambulance' : 'police',
      label: r.type,
      status: r.status,
      eta: r.eta,
    })),
  ] : [];

  const currentStageIdx = getStageIndex(emergency.status);

  return (
    <AppLayout title="Emergency Status" subtitle={`Tracking #${emergencyCode}`}>
      <BackButton fallback="/citizen" />

      {/* Header card with White Clay Surface */}
      <div className="clay-card mb-4">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Incident Reference #{emergencyCode}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>
              {emergency.type}
            </h1>
            <div className="d-flex gap-2 flex-wrap">
              <PriorityBadge priority={emergency.priority} />
              <StatusBadge status={emergency.status} />
            </div>
          </div>
          <div className="text-secondary small text-sm-end">
            <div>
              <i className="bi bi-geo-alt-fill text-danger me-1"></i>
              {emergency.location?.address || emergency.location_text || `${emergencyLat.toFixed(4)}, ${emergencyLng.toFixed(4)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Status Timeline Using Clay Stages */}
      <div className="clay-card mb-4" style={{ padding: '24px 28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>
          <i className="bi bi-signpost-split me-2 text-primary"></i>
          Incident Lifecycle Progression
        </h2>

        <div className="d-flex flex-column gap-2">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isActive = idx === currentStageIdx;

            return (
              <div key={stage.key} className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    flexShrink: 0,
                    background: isCompleted
                      ? '#16A34A'
                      : isActive
                      ? '#0284C7'
                      : '#FFFFFF',
                    color: isCompleted || isActive ? '#FFFFFF' : '#94A3B8',
                    border: isCompleted
                      ? '2px solid #16A34A'
                      : isActive
                      ? '2px solid #0284C7'
                      : '2px solid #CBD5E1',
                    boxShadow: isCompleted
                      ? 'var(--clay-shadow-green)'
                      : isActive
                      ? 'var(--clay-shadow-blue)'
                      : 'var(--clay-shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <i className={`bi ${isCompleted ? 'bi-check-lg' : stage.icon}`}></i>
                </div>

                <div
                  style={{
                    flex: 1,
                    background: isActive ? 'var(--er-blue-light, #F0F9FF)' : 'var(--er-surface, #FFFFFF)',
                    border: isActive ? '1.5px solid var(--er-blue-border, #BAE6FD)' : '1px solid var(--er-border, #E2E8F0)',
                    borderRadius: '14px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? 'var(--clay-shadow-md)' : 'var(--clay-shadow-sm)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isActive || isCompleted ? 700 : 500,
                        color: isActive ? '#0284C7' : isCompleted ? '#16A34A' : '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {stage.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: isCompleted ? '#DCFCE7' : isActive ? '#E0F2FE' : '#F1F5F9',
                      color: isCompleted ? '#166534' : isActive ? '#0369A1' : '#64748B',
                    }}
                  >
                    {isCompleted ? 'COMPLETED' : isActive ? 'ACTIVE' : 'UPCOMING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="row g-4">
        {/* Left column */}
        <div className="col-lg-5">
          {/* Responder status */}
          <div className="clay-card mb-4">
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              <i className="bi bi-broadcast text-danger me-2"></i>
              Responders
            </h2>

            {(emergency.responders || []).map((r) => {
              const icons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒' };
              const avatarClass = { Ambulance: 'ambulance', Police: 'police', 'Fire/Rescue': 'fire' };
              return (
                <div key={r.type} className="responder-card mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className={`responder-avatar ${avatarClass[r.type] || 'ambulance'}`}>
                      {icons[r.type] || '🔵'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{r.type}</div>
                      {r.eta && (
                        <div style={{ fontSize: 12, color: '#64748B' }}>ETA: {r.eta}</div>
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
                background: 'var(--er-amber-light, #FFFBEB)',
                border: '1px solid var(--er-amber-border, #FDE68A)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--clay-shadow-sm)',
              }}>
                <span style={{ fontSize: 20 }}>🤝</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--er-amber, #92400E)' }}>
                    Community Helpers
                  </div>
                  <div style={{ fontSize: 12, color: '#B45309' }}>
                    {emergency.helpers.accepted} accepted · {emergency.helpers.notified} notified
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          <AIAnalysisCard ai={ai} />
        </div>

        {/* Right column — Map */}
        <div className="col-lg-7">
          <div className="clay-card">
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              <i className="bi bi-map text-primary me-2"></i>
              Live Location
            </h2>
            <div className="map-container" style={{ height: '440px' }}>
              <MapView
                markers={mapMarkers}
                center={hasValidCoords ? [emergencyLat, emergencyLng] : null}
                height={440}
              />
            </div>
          </div>

          {/* Location info */}
          <div className="clay-card mt-4">
            <div className="row g-3">
              <div className="col-6">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  {emergency.location?.address || emergency.location_text ||
                    (hasValidCoords ? `${emergencyLat.toFixed(4)}, ${emergencyLng.toFixed(4)}` : 'Location not available')}
                </div>
              </div>
              <div className="col-6">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Area</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{emergency.location?.area || '—'}</div>
              </div>
              <div className="col-6">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Reported At</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  {emergency.reportedAt ? new Date(emergency.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </div>
              </div>
              <div className="col-6">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Priority</div>
                <div className="mt-1"><PriorityBadge priority={emergency.priority} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
