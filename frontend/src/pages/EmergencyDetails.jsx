import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, StatusBadge, SeverityBadge } from '../components/Badges';
import { EmergencyTimeline } from '../components/EmergencyTimeline';
import { MapView } from '../components/MapView';
import { BackButton } from '../components/BackButton';
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
  const [notifying, setNotifying] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const [memoryContext, setMemoryContext] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [coordinatorVerdict, setCoordinatorVerdict] = useState('');
  const [verdictNotice, setVerdictNotice] = useState('');

  // Fetch emergency and memory context
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
        // ignore
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
          <div className="mt-2 text-secondary">Retrieving incident telemetry...</div>
        </div>
      </AppLayout>
    );
  }

  if (!emergency) {
    return (
      <AppLayout title="Incident Not Found" subtitle={`No emergency matching "${id}"`}>
        <div className="clean-section-card text-center py-5">
          <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: 48 }}></i>
          <h2 className="mt-3 fw-bold text-dark">Emergency Not Found</h2>
          <p className="text-secondary">{error || `Could not find incident #${id}`}</p>
          <button className="btn-emergency mt-3" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={() => navigate('/coordinator')}>
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
    } catch {
      // ignore
    }
  }

  const mediaList = Array.isArray(emergency.media) ? emergency.media : [];
  const activeMedia = mediaList[activeMediaIndex] || mediaList[0] || null;
  const evidenceAssessment = ai?.evidenceAssessment || null;

  const handleDispatch = async (responderType) => {
    setDispatching((prev) => ({ ...prev, [responderType]: true }));
    try {
      await emergencyService.dispatch(emergencyCode, responderType);
      updateResponderStatus(emergency.id, responderType, 'dispatched');
      setActionMsg(`${responderType} dispatched successfully.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(`Failed to dispatch ${responderType}: ${err.message}`);
    } finally {
      setDispatching((prev) => ({ ...prev, [responderType]: false }));
    }
  };

  const handleNotifyHelpers = async () => {
    setNotifying(true);
    try {
      await emergencyService.notifyHelpers(emergencyCode);
      setActionMsg('Nearby community helpers have been notified.');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(`Failed to notify helpers: ${err.message}`);
    } finally {
      setNotifying(false);
    }
  };

  const handleResolve = async () => {
    if (!window.confirm('Mark this emergency as resolved?')) return;
    setResolving(true);
    try {
      await emergencyService.resolve(emergencyCode);
      resolveEmergency(emergency.id);
      navigate('/coordinator');
    } catch (err) {
      setActionMsg(`Failed to resolve incident: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const mapMarkers = [
    { lat: emergencyLat, lng: emergencyLng, type: 'emergency', label: `#${emergencyCode}` },
    ...(emergency.responders || []).map((r, i) => ({
      lat: emergencyLat + (i + 1) * 0.003,
      lng: emergencyLng + (i + 1) * 0.002,
      type: (r.type || '').toLowerCase().includes('ambulance') ? 'ambulance' : 'police',
      label: r.name || r.type,
      status: r.status,
      eta: r.eta,
    })),
  ];

  return (
    <AppLayout
      title={`Incident #${emergencyCode}`}
      subtitle={`${emergency.type || 'Emergency'} · Public Safety Record`}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
        {/* Navigation row */}
        <div className="mb-3">
          <BackButton fallback="/coordinator" />
        </div>

        {/* Action Notice */}
        {actionMsg && (
          <div className="alert-emergency d-flex align-items-center gap-2 p-3 rounded-3 mb-3" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#166534' }}>
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <span>{actionMsg}</span>
          </div>
        )}

        {/* =====================================================
            1. INCIDENT HEADER & 2. STATUS
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-header-title">
          <div className="clean-section-body p-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <span className="text-primary fw-bold font-monospace small text-uppercase">
                  Incident Reference #{emergencyCode}
                </span>
                <h1 className="text-dark fw-bold m-0 mt-1 fs-3" id="inc-header-title">
                  {emergency.type}
                </h1>
                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                  {emergency.severity && <SeverityBadge severity={emergency.severity} />}
                  <PriorityBadge priority={emergency.priority} />
                  <StatusBadge status={emergency.status} />
                </div>
              </div>

              <div className="text-secondary small text-end">
                <div>
                  <i className="bi bi-clock me-1"></i>
                  Reported: {(emergency.created_at || emergency.createdAt || emergency.reportedAt)
                    ? new Date(emergency.created_at || emergency.createdAt || emergency.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Recently'}
                </div>
                <div className="mt-1">
                  <i className="bi bi-calendar-event me-1"></i>
                  {(emergency.created_at || emergency.createdAt)
                    ? new Date(emergency.created_at || emergency.createdAt).toLocaleDateString()
                    : 'Today'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            3. LOCATION & MAP
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-location-title">
          <div className="clean-section-header">
            <i className="bi bi-geo-alt-fill text-danger fs-5"></i>
            <h2 className="clean-section-title" id="inc-location-title">Location</h2>
          </div>
          <div className="clean-section-body p-3">
            <div className="mb-3 text-dark fw-bold" style={{ fontSize: '15px' }}>
              <i className="bi bi-pin-map-fill text-danger me-2"></i>
              {emergency.location_text || emergency.location?.address || `${emergencyLat.toFixed(5)}, ${emergencyLng.toFixed(5)}`}
            </div>
            <div className="rounded-3 overflow-hidden border border-secondary border-opacity-25" style={{ height: '340px' }}>
              <MapView markers={mapMarkers} center={[emergencyLat, emergencyLng]} height={340} />
            </div>
          </div>
        </section>

        {/* =====================================================
            4. DESCRIPTION
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-desc-title">
          <div className="clean-section-header">
            <i className="bi bi-card-text text-info fs-5"></i>
            <h2 className="clean-section-title" id="inc-desc-title">Description</h2>
          </div>
          <div className="clean-section-body p-3">
            <p className="text-dark m-0" style={{ fontSize: '15px', lineHeight: 1.65 }}>
              {emergency.description || 'No detailed description provided by the reporting citizen.'}
            </p>
          </div>
        </section>

        {/* =====================================================
            5. EVIDENCE (Photo Gallery, Video Player, File Info)
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-evidence-title">
          <div className="clean-section-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-camera-reels-fill text-primary fs-5"></i>
              <h2 className="clean-section-title m-0" id="inc-evidence-title">
                PHOTO / VIDEO EVIDENCE
              </h2>
            </div>
            <span className={`badge ${mediaList.length > 0 ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '9999px' }}>
              {mediaList.length > 0 ? `${mediaList.length} File${mediaList.length > 1 ? 's' : ''}` : 'No Media'}
            </span>
          </div>

          <div className="clean-section-body p-3">
            {mediaList.length > 0 ? (
              <div>
                {/* Active Media Viewer */}
                {activeMedia && (
                  <div className="p-3 rounded-3 mb-3" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', boxShadow: 'var(--clay-shadow-sm)' }}>
                    <div className="d-flex align-items-center justify-content-between px-2 py-1 mb-2 text-secondary small">
                      <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '70%', fontSize: '13.5px' }}>
                        {activeMedia.media_type === 'video' ? '🎥 ' : '📷 '}
                        {activeMedia.file_name || `Evidence #${activeMediaIndex + 1}`}
                      </span>
                      <span className="badge bg-light text-primary border border-primary-subtle text-uppercase" style={{ fontSize: '11px' }}>
                        {activeMedia.media_type || 'Media'}
                      </span>
                    </div>

                    <div className="text-center" style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeMedia.media_type === 'video' ? (
                        <video
                          key={activeMedia.data_url || activeMedia.id}
                          src={activeMedia.data_url}
                          controls
                          muted
                          playsInline
                          preload="metadata"
                          style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '12px' }}
                        />
                      ) : (
                        <img
                          key={activeMedia.data_url || activeMedia.id}
                          src={activeMedia.data_url}
                          alt={activeMedia.file_name || 'Emergency visual evidence'}
                          style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', borderRadius: '12px' }}
                        />
                      )}
                    </div>

                    {/* File Information */}
                    <div className="d-flex align-items-center justify-content-between px-2 pt-2 text-secondary" style={{ fontSize: '12px' }}>
                      <span>Size: {activeMedia.file_size ? `${(activeMedia.file_size / 1024).toFixed(1)} KB` : 'Standard'}</span>
                      <span>MIME: {activeMedia.mime_type || (activeMedia.media_type === 'video' ? 'video/mp4' : 'image/jpeg')}</span>
                    </div>
                  </div>
                )}

                {/* Thumbnail Strip */}
                {mediaList.length > 1 && (
                  <div className="d-flex gap-2 overflow-auto pb-1 mb-2">
                    {mediaList.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        onClick={() => setActiveMediaIndex(idx)}
                        role="button"
                        tabIndex={0}
                        style={{
                          width: '74px',
                          height: '58px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: activeMediaIndex === idx ? '2.5px solid #0284C7' : '1.5px solid #CBD5E1',
                          background: '#F1F5F9',
                          cursor: 'pointer',
                          flexShrink: 0,
                          position: 'relative',
                          boxShadow: 'var(--clay-shadow-sm)',
                        }}
                      >
                        {m.media_type === 'video' ? (
                          <div className="w-100 h-100 d-flex align-items-center justify-content-center text-danger fs-5">
                            🎥
                          </div>
                        ) : (
                          <img
                            src={m.data_url}
                            alt={`Thumbnail ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-secondary small py-2">
                <i className="bi bi-camera-video-off me-1"></i>
                No photo or video evidence was submitted with this report.
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            6. AI ASSESSMENT (Decision Support & Memory)
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-ai-title">
          <div className="clean-section-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-cpu text-primary fs-5"></i>
              <h2 className="clean-section-title m-0" id="inc-ai-title">AI Assessment</h2>
            </div>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '9999px' }}>
              Decision Support
            </span>
          </div>

          <div className="clean-section-body p-3">
            {ai ? (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                  <div>
                    <span className="text-secondary small d-block">Triage Evaluation</span>
                    <span className="text-dark fw-bold fs-5">{ai.category || emergency.type}</span>
                  </div>
                  {ai.confidence && (
                    <div>
                      <span className="text-secondary small d-block">Confidence</span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-6">
                        {Math.round(ai.confidence * (ai.confidence <= 1 ? 100 : 1))}%
                      </span>
                    </div>
                  )}
                </div>

                {ai.reasoning && (
                  <div className="p-3 rounded-3 mb-3" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', fontSize: '14px', color: '#1E293B', boxShadow: 'var(--clay-shadow-inset)' }}>
                    <div className="text-primary fw-bold small text-uppercase mb-1">Operational Assessment:</div>
                    {ai.reasoning}
                  </div>
                )}

                {/* Evidence Assessment Evaluation */}
                {evidenceAssessment && (
                  <div className="p-3 rounded-3 mb-3" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', fontSize: '13.5px', boxShadow: 'var(--clay-shadow-inset)' }}>
                    <div className="text-warning fw-bold small text-uppercase mb-2">Visual Evidence Assessment:</div>
                    <div className="d-flex gap-3 mb-2 flex-wrap">
                      <span><strong>Consistency:</strong> {evidenceAssessment.consistency || 'Assessed'}</span>
                      <span><strong>Quality:</strong> {evidenceAssessment.evidenceQuality || 'Standard'}</span>
                    </div>
                    {Array.isArray(evidenceAssessment.visualObservations) && evidenceAssessment.visualObservations.length > 0 && (
                      <ul className="m-0 ps-3 text-secondary">
                        {evidenceAssessment.visualObservations.map((obs, idx) => (
                          <li key={idx}>{obs}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Memory Context */}
                <div className="p-3 rounded-3" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', fontSize: '13.5px', boxShadow: 'var(--clay-shadow-inset)' }}>
                  <div className="text-primary fw-bold small text-uppercase mb-1">
                    <i className="bi bi-database-fill-check me-1"></i>
                    Hindsight Memory Context:
                  </div>
                  <p className="text-secondary m-0">
                    {memoryContext?.summary ||
                      memoryContext?.facts?.[0] ||
                      ai?.hindsight_memory?.summary ||
                      'Historical incident patterns and dispatch precedents indexed for response support.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-secondary small py-2">
                <i className="bi bi-hourglass-split me-1"></i>
                AI analysis has not completed for this incident record.
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            7. HUMAN COORDINATOR REVIEW (Clearly Separated)
            ===================================================== */}
        <section className="clean-section-card mb-3" style={{ borderLeft: '5px solid #16A34A' }} aria-labelledby="inc-human-title">
          <div className="clean-section-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-person-check-fill text-success fs-5"></i>
              <h2 className="clean-section-title m-0" id="inc-human-title">
                Human Coordinator Review
              </h2>
            </div>
            <span className="badge bg-success" style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '9999px' }}>
              Final Authority
            </span>
          </div>

          <div className="clean-section-body p-3">
            <p className="text-secondary small mb-3">
              Review evidence and AI decision support. Final response actions remain strictly under human control.
            </p>

            {verdictNotice && (
              <div className="alert alert-success py-2 px-3 mb-3 rounded-3 small fw-bold">
                ✓ {verdictNotice}
              </div>
            )}

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn btn-sm ${coordinatorVerdict === 'verified' ? 'btn-success' : 'btn-outline-success'}`}
                style={{ borderRadius: '12px', padding: '8px 16px', fontWeight: 600 }}
                onClick={() => {
                  setCoordinatorVerdict('verified');
                  setVerdictNotice('Evidence verified consistent by coordinator.');
                  setTimeout(() => setVerdictNotice(''), 3500);
                }}
              >
                <i className="bi bi-check2-all me-1"></i>
                Verify Evidence Consistent
              </button>

              <button
                type="button"
                className={`btn btn-sm ${coordinatorVerdict === 'unclear' ? 'btn-warning text-dark' : 'btn-outline-warning'}`}
                style={{ borderRadius: '12px', padding: '8px 16px', fontWeight: 600 }}
                onClick={() => {
                  setCoordinatorVerdict('unclear');
                  setVerdictNotice('Flagged for field verification by arriving units.');
                  setTimeout(() => setVerdictNotice(''), 3500);
                }}
              >
                <i className="bi bi-question-circle me-1"></i>
                Flag for Field Confirmation
              </button>

              <button
                type="button"
                className={`btn btn-sm ${coordinatorVerdict === 'authorized' ? 'btn-info text-dark' : 'btn-outline-info'}`}
                style={{ borderRadius: '12px', padding: '8px 16px', fontWeight: 600 }}
                onClick={() => {
                  setCoordinatorVerdict('authorized');
                  setVerdictNotice('Coordinator confirmed dispatch authorization.');
                  setTimeout(() => setVerdictNotice(''), 3500);
                }}
              >
                <i className="bi bi-shield-check me-1"></i>
                Authorize Response Units
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            8. RESPONDERS & DISPATCH
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-responders-title">
          <div className="clean-section-header">
            <i className="bi bi-truck-front-fill text-danger fs-5"></i>
            <h2 className="clean-section-title" id="inc-responders-title">Responders</h2>
          </div>

          <div className="clean-section-body p-3">
            {/* Active responders list */}
            {(emergency.responders || []).length > 0 ? (
              <div className="mb-3">
                <div className="text-secondary small fw-bold text-uppercase mb-2">Deployed Units:</div>
                <div className="d-flex flex-column gap-2">
                  {emergency.responders.map((r, ri) => (
                    <div key={ri} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', boxShadow: 'var(--clay-shadow-sm)' }}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="fs-4">
                          {(r.type || '').toLowerCase().includes('ambulance') ? '🚑' : '👮'}
                        </span>
                        <div>
                          <div className="fw-bold text-dark">{r.name || r.type}</div>
                          {r.eta && <div className="text-secondary" style={{ fontSize: '12px' }}>ETA: {r.eta}</div>}
                        </div>
                      </div>
                      <StatusBadge status={r.status || 'Dispatched'} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-secondary small mb-3">No responders currently deployed.</div>
            )}

            {/* Quick Dispatch Actions */}
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="clay-button"
                style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 18px', fontWeight: 700 }}
                onClick={() => handleDispatch('Ambulance')}
                disabled={dispatching['Ambulance']}
              >
                🚑 Dispatch Ambulance
              </button>
              <button
                type="button"
                className="clay-button"
                style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 18px', fontWeight: 700 }}
                onClick={() => handleDispatch('Police')}
                disabled={dispatching['Police']}
              >
                👮 Dispatch Police
              </button>
              <button
                type="button"
                className="clay-button"
                style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '10px 18px', fontWeight: 700 }}
                onClick={handleNotifyHelpers}
                disabled={notifying}
              >
                🤝 Notify Community Helpers
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            9. TIMELINE & RESOLUTION
            ===================================================== */}
        <section className="clean-section-card mb-3" aria-labelledby="inc-timeline-title">
          <div className="clean-section-header">
            <i className="bi bi-clock-history text-primary fs-5"></i>
            <h2 className="clean-section-title" id="inc-timeline-title">Timeline</h2>
          </div>

          <div className="clean-section-body p-3">
            <EmergencyTimeline steps={emergency.timeline || []} />

            <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-end">
              <button
                type="button"
                className="btn btn-outline-success"
                style={{ borderRadius: '14px', padding: '10px 20px', fontWeight: 700 }}
                onClick={handleResolve}
                disabled={resolving || (emergency.status || '').toUpperCase() === 'RESOLVED'}
              >
                {resolving ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-check-circle-fill me-1"></i>
                )}
                {(emergency.status || '').toUpperCase() === 'RESOLVED' ? 'Incident Resolved' : 'Mark Emergency Resolved'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
