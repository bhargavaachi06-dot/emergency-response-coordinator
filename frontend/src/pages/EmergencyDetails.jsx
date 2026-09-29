import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import { EmergencyTimeline } from '../components/EmergencyTimeline';
import { MapView } from '../components/MapView';
import emergencyService from '../services/emergencyService';

export default function EmergencyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { emergencies, updateResponderStatus, resolveEmergency } = useApp();

  const matched = emergencies.find(
    (e) => e.emergency_code === id || String(e.id) === String(id)
  );

  const [emergencyData, setEmergencyData] = useState(matched || null);
  const [loading, setLoading] = useState(!matched);
  const [error, setError] = useState(null);

  const [dispatching, setDispatching] = useState({});
  const [notifying, setNotifying]     = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [actionMsg, setActionMsg]     = useState('');

  const [memoryContext, setMemoryContext] = useState(null);

  // Fetch fresh emergency data from backend by emergency code or ID
  useEffect(() => {
    let isMounted = true;
    async function loadEmergency() {
      if (!id) return;
      try {
        const res = await emergencyService.getById(id);
        if (res.success && res.data && isMounted) {
          setEmergencyData(res.data);
        } else if (!matched && isMounted) {
          setError(res.error || 'Emergency not found');
        }
      } catch (err) {
        if (!matched && isMounted) {
          setError(err.message || 'Failed to load emergency');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadMemory() {
      if (!id) return;
      try {
        const memRes = await emergencyService.getMemoryContext(id);
        if (memRes.success && memRes.data && isMounted) {
          setMemoryContext(memRes.data);
        }
      } catch {
        // fail-safe
      }
    }

    loadEmergency();
    loadMemory();

    return () => {
      isMounted = false;
    };
  }, [id, matched]);

  const emergency = emergencyData || matched;

  if (loading && !emergency) {
    return (
      <AppLayout title="Incident Details" subtitle="Loading emergency record...">
        <div className="text-center py-5">
          <span className="spinner-border text-primary"></span>
          <div className="mt-2 text-muted">Retrieving incident data...</div>
        </div>
      </AppLayout>
    );
  }

  if (!emergency) {
    return (
      <AppLayout title="Incident Not Found" subtitle={`No emergency matching "${id}"`}>
        <div className="section-card text-center py-5">
          <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: 48 }}></i>
          <h3 className="mt-3 fw-bold">Emergency Not Found</h3>
          <p className="text-muted">Could not find an incident with code or ID: {id}</p>
          <button className="btn-primary-custom" onClick={() => navigate('/coordinator')}>
            Back to Command Center
          </button>
        </div>
      </AppLayout>
    );
  }

  const emergencyCode = emergency.emergency_code || emergency.id;
  const emergencyLat = Number(emergency.latitude ?? emergency.location?.lat ?? 28.6139);
  const emergencyLng = Number(emergency.longitude ?? emergency.location?.lng ?? 77.2090);

  let ai = emergency.ai_analysis || emergency.ai || emergency.analysis || null;
  if (typeof ai === 'string') {
    try {
      ai = JSON.parse(ai);
    } catch (e) {
      // ignore
    }
  }

  const handleDispatch = async (responderType) => {
    setDispatching((prev) => ({ ...prev, [responderType]: true }));
    await emergencyService.dispatch(emergencyCode, responderType);
    updateResponderStatus(emergency.id, responderType, 'dispatched');
    setActionMsg(`${responderType} dispatched successfully.`);
    setTimeout(() => setActionMsg(''), 3000);
    setDispatching((prev) => ({ ...prev, [responderType]: false }));
  };

  const handleNotifyHelpers = async () => {
    setNotifying(true);
    await emergencyService.notifyHelpers(emergencyCode);
    setActionMsg('Nearby community helpers have been notified.');
    setTimeout(() => setActionMsg(''), 3000);
    setNotifying(false);
  };

  const handleResolve = async () => {
    if (!window.confirm('Mark this emergency as resolved?')) return;
    setResolving(true);
    await emergencyService.resolve(emergencyCode);
    resolveEmergency(emergency.id);
    setResolving(false);
    navigate('/coordinator');
  };

  const mapMarkers = [
    { lat: emergencyLat, lng: emergencyLng, type: 'emergency', label: `#${emergencyCode}` },
    ...(emergency.responders || []).map((r, i) => ({
      lat: emergencyLat + (i + 1) * 0.003,
      lng: emergencyLng + (i + 1) * 0.002,
      type: r.type === 'Ambulance' ? 'ambulance' : 'police',
      label: r.type, status: r.status, eta: r.eta,
    })),
    {
      lat: emergencyLat + 0.001,
      lng: emergencyLng - 0.002,
      type: 'helper',
      label: 'Community Helper',
      status: 'assisting',
    },
  ];

  const responderIcons = { Ambulance: '🚑', Police: '👮', 'Fire/Rescue': '🚒', 'Fire & Rescue': '🚒' };
  const responderAvatarClass = { Ambulance: 'ambulance', Police: 'police', 'Fire/Rescue': 'fire', 'Fire & Rescue': 'fire' };

  return (
    <AppLayout
      title={`Emergency #${emergencyCode}`}
      subtitle={`${emergency.type || 'Incident'} · ${(emergency.priority || 'PENDING').toUpperCase()}`}
    >
      {/* Back */}
      <button
        className="btn-outline-custom mb-3"
        style={{ fontSize: 12 }}
        onClick={() => navigate('/coordinator')}
      >
        <i className="bi bi-arrow-left"></i>
        Back to Command Center
      </button>

      {/* Header card */}
      <div style={{
        background: emergency.priority === 'critical'
          ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 14, padding: '20px 24px',
        marginBottom: 24, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Emergency #{emergency.id}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            {emergency.type}
          </h1>
          <div className="d-flex gap-2 flex-wrap">
            <PriorityBadge priority={emergency.priority} />
            <StatusBadge status={emergency.status} />
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <div>Reported {new Date(emergency.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div>{emergency.location?.area}</div>
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{
          background: '#dcfce7', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13.5, color: '#166534', marginBottom: 16,
        }}>
          <i className="bi bi-check-circle-fill"></i>
          {actionMsg}
        </div>
      )}

      <div className="row g-4">
        {/* Left column */}
        <div className="col-lg-5">
          {/* Emergency info */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-info-circle-fill text-muted"></i>
                Emergency Information
              </h2>
            </div>
            <div className="section-card-body">
              <div className="info-row">
                <span className="info-label">Type</span>
                <span className="info-value">{emergency.type}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Description</span>
                <span className="info-value">{emergency.description}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">
                  {emergency.location_text || emergency.location?.address || (emergencyLat && emergencyLng ? `${emergencyLat.toFixed(4)}, ${emergencyLng.toFixed(4)}` : 'Not specified')}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Reported At</span>
                <span className="info-value">
                  {new Date(emergency.created_at || emergency.createdAt || emergency.reportedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Priority</span>
                <span className="info-value"><PriorityBadge priority={emergency.priority} /></span>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="mb-4">
            <AIAnalysisCard ai={ai} />
          </div>

          {/* Situational Memory Card (Hindsight Episodic Memory) */}
          <div className="section-card mb-4" style={{ border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <div className="section-card-header d-flex align-items-center justify-content-between">
              <h2 className="section-card-title mb-0">
                <span style={{ marginRight: 6 }}>🧠</span>
                Situational Memory
              </h2>
              {memoryContext?.available ? (
                <span className="badge" style={{
                  background: (memoryContext.memoryCount > 0) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                  color: (memoryContext.memoryCount > 0) ? '#d8b4fe' : '#94a3b8',
                  border: '1px solid rgba(168, 85, 247, 0.3)'
                }}>
                  {memoryContext.memoryCount} relevant {memoryContext.memoryCount === 1 ? 'memory' : 'memories'}
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                  Standby
                </span>
              )}
            </div>
            <div className="section-card-body">
              {memoryContext?.memories && memoryContext.memories.length > 0 ? (
                <ul className="mb-3" style={{ paddingLeft: '18px', fontSize: '12.5px', color: '#cbd5e1' }}>
                  {memoryContext.memories.map((mem, idx) => (
                    <li key={idx} className="mb-2" style={{ lineHeight: 1.5 }}>
                      {mem}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-3" style={{ fontSize: '12.5px' }}>
                  {memoryContext?.available
                    ? 'No prior historical incidents or scene constraints recorded near this location.'
                    : 'Hindsight episodic memory is operating in standby mode.'}
                </p>
              )}

              {/* Advisory Disclaimer */}
              <div style={{
                padding: '8px 12px',
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '11.5px',
                color: '#fde68a',
              }}>
                <i className="bi bi-info-circle text-warning" style={{ fontSize: 13, flexShrink: 0 }}></i>
                <span>Historical memory is advisory context. Current incident information and coordinator verification take priority.</span>
              </div>
            </div>
          </div>

          {/* Professional Responders */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-broadcast text-danger"></i>
                Professional Responders
              </h2>
            </div>
            <div className="section-card-body">
              {(emergency.responders || []).map((r) => (
                <div key={r.type} className="responder-card mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className={`responder-avatar ${responderAvatarClass[r.type] || 'ambulance'}`}>
                      {responderIcons[r.type] || '🔵'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.type}</div>
                      {r.eta && <div style={{ fontSize: 11.5, color: '#64748b' }}>ETA: {r.eta}</div>}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'pending' && (
                      <button
                        className="btn-primary-custom"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => handleDispatch(r.type)}
                        disabled={dispatching[r.type]}
                      >
                        {dispatching[r.type] ? <span className="spinner-border spinner-border-sm"></span> : 'Dispatch'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Dispatch buttons */}
              <div className="d-flex gap-2 flex-wrap mt-3">
                <button
                  className="btn-primary-custom"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                  onClick={() => handleDispatch('Ambulance')}
                  disabled={dispatching['Ambulance']}
                  id="dispatch-ambulance-btn"
                >
                  🚑 Dispatch Ambulance
                </button>
                <button
                  className="btn-primary-custom"
                  style={{ fontSize: 12, padding: '8px 14px', background: '#1d4ed8' }}
                  onClick={() => handleDispatch('Police')}
                  disabled={dispatching['Police']}
                  id="dispatch-police-btn"
                >
                  👮 Dispatch Police
                </button>
              </div>
            </div>
          </div>

          {/* Community Helpers */}
          <div className="section-card mb-4">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-people-fill" style={{ color: '#d97706' }}></i>
                Community Helpers
              </h2>
            </div>
            <div className="section-card-body">
              <div className="row g-2 mb-3">
                {[
                  { label: 'Found Nearby', value: emergency.helpers?.found || 0 },
                  { label: 'Notified',     value: emergency.helpers?.notified || 0 },
                  { label: 'Accepted',     value: emergency.helpers?.accepted || 0 },
                ].map((s) => (
                  <div key={s.label} className="col-4">
                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: '10px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="btn-outline-custom w-100"
                style={{ justifyContent: 'center', fontSize: 13 }}
                onClick={handleNotifyHelpers}
                disabled={notifying}
                id="notify-helpers-btn"
              >
                {notifying ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-bell-fill"></i>}
                Notify Nearby Helpers
              </button>

              {(emergency.helpers?.found || 0) === 0 && (
                <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                  No eligible helpers found nearby. Professional responders have been notified.
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

          {/* Resolve button */}
          <button
            className="btn-outline-custom w-100"
            style={{ justifyContent: 'center', fontSize: 14, borderColor: '#16a34a', color: '#16a34a', padding: '12px' }}
            onClick={handleResolve}
            disabled={resolving}
            id="mark-resolved-btn"
          >
            {resolving ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-check-circle-fill"></i>}
            Mark Emergency Resolved
          </button>
        </div>

        {/* Right column — Map */}
        <div className="col-lg-7">
          <div className="section-card" style={{ position: 'sticky', top: 20 }}>
            <div className="section-card-header">
              <h2 className="section-card-title">
                <i className="bi bi-map text-muted"></i>
                Live Map View
              </h2>
            </div>
            <MapView
              markers={mapMarkers}
              center={[emergency.location?.lat, emergency.location?.lng]}
              height={600}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
