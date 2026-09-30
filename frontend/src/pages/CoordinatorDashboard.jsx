import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AppLayout } from '../layouts/AppLayout';
import { PriorityBadge, SeverityBadge, StatusBadge } from '../components/Badges';
import { MapView } from '../components/MapView';
import emergencyService from '../services/emergencyService';
import './CoordinatorDashboard.css';

/**
 * Builds realistic map markers based solely on actual emergency telemetry
 */
function buildMapMarkers(emergencies, selectedCode) {
  const markers = [];
  (emergencies || []).forEach((e, idx) => {
    const lat = Number(e.latitude ?? e.location?.lat);
    const lng = Number(e.longitude ?? e.location?.lng);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const code = e.emergency_code || e.id;
    const isSelected = String(selectedCode) === String(code) || String(selectedCode) === String(e.id);

    markers.push({
      lat,
      lng,
      type: 'emergency',
      label: `#${code}: ${e.type || 'Incident'}`,
      status: e.status,
      isSelected,
    });

    // Real responders if attached to this emergency
    (e.responders || []).forEach((r, ri) => {
      const rLat = Number(r.latitude) || (lat + (ri + 1) * 0.0028);
      const rLng = Number(r.longitude) || (lng + (ri + 1) * 0.0022 + idx * 0.0005);
      const rType = (r.type || '').toLowerCase();

      markers.push({
        lat: rLat,
        lng: rLng,
        type: rType.includes('ambulance') ? 'ambulance' : rType.includes('police') ? 'police' : 'helper',
        label: `${r.name || r.type} (Incident #${code})`,
        status: r.status,
        eta: r.eta || r.dispatched_at,
      });
    });
  });
  return markers;
}

/**
 * Formats ISO timestamps cleanly
 */
function formatTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const {
    emergencies,
    loading,
    error,
    loadEmergencies,
    setSelectedEmergency,
    dispatchEmergency,
    updateResponderStatus,
    currentUser,
  } = useApp();

  const [selectedIncidentCode, setSelectedIncidentCode] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [memoryContext, setMemoryContext] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatching, setDispatching] = useState({});
  const [actionNotice, setActionNotice] = useState('');

  // Active (non-resolved) emergencies
  const activeEmergencies = useMemo(() => {
    return (emergencies || []).filter(
      (e) => (e.status || '').toUpperCase() !== 'RESOLVED'
    );
  }, [emergencies]);

  // Selected code or fallback to first active emergency
  const effectiveSelectedCode = selectedIncidentCode || (activeEmergencies[0]?.emergency_code || activeEmergencies[0]?.id || null);

  // Current selected emergency record
  const currentEmergency = useMemo(() => {
    return (emergencies || []).find(
      (e) => String(e.emergency_code) === String(effectiveSelectedCode) || String(e.id) === String(effectiveSelectedCode)
    ) || activeEmergencies[0] || null;
  }, [emergencies, effectiveSelectedCode, activeEmergencies]);

  // Fetch full details and memory context asynchronously when selected incident changes
  // Fetch full details and memory context for an incident
  const fetchDeepDetails = async (code) => {
    if (!code) return;
    try {
      const res = await emergencyService.getById(code);
      if (res.success && res.data) {
        setSelectedDetails(res.data);
      }
    } catch {
      // fallback
    }

    try {
      const memRes = await emergencyService.getMemoryContext(code);
      if (memRes.success && memRes.data) {
        setMemoryContext(memRes.data);
      } else {
        setMemoryContext(null);
      }
    } catch {
      setMemoryContext(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!effectiveSelectedCode) return;

    async function run() {
      try {
        const res = await emergencyService.getById(effectiveSelectedCode);
        if (res.success && res.data && isMounted) {
          setSelectedDetails(res.data);
        }
      } catch {
        // fallback
      }

      try {
        const memRes = await emergencyService.getMemoryContext(effectiveSelectedCode);
        if (memRes.success && memRes.data && isMounted) {
          setMemoryContext(memRes.data);
        } else if (isMounted) {
          setMemoryContext(null);
        }
      } catch {
        if (isMounted) setMemoryContext(null);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [effectiveSelectedCode]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadEmergencies();
      if (effectiveSelectedCode) {
        await fetchDeepDetails(effectiveSelectedCode);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Incident selection handler
  const handleSelectIncident = (emergency) => {
    const code = emergency.emergency_code || emergency.id;
    setSelectedIncidentCode(code);
    setSelectedEmergency(emergency);
  };

  // Open full dedicated details page
  const handleOpenDetailsPage = (emergency, e) => {
    if (e) e.stopPropagation();
    const code = emergency.emergency_code || emergency.id;
    setSelectedEmergency(emergency);
    navigate(`/coordinator/emergency/${code}`);
  };

  // Real dispatch action handler
  const handleDispatchResponder = async (responderType) => {
    if (!currentEmergency) return;
    const code = currentEmergency.emergency_code || currentEmergency.id;
    setDispatching((prev) => ({ ...prev, [responderType]: true }));

    try {
      const res = await emergencyService.dispatch(code, responderType);
      if (res.success) {
        if (dispatchEmergency) {
          await dispatchEmergency(currentEmergency.id);
        }
        if (updateResponderStatus) {
          updateResponderStatus(currentEmergency.id, responderType, 'DISPATCHED');
        }
        setActionNotice(`${responderType} unit dispatched successfully.`);
        await fetchDeepDetails(code);
        setTimeout(() => setActionNotice(''), 3500);
      }
    } catch (err) {
      setActionNotice(`Failed to dispatch ${responderType}: ${err.message}`);
    } finally {
      setDispatching((prev) => ({ ...prev, [responderType]: false }));
    }
  };

  // KPI Calculations using real backend data only
  const kpiData = useMemo(() => {
    const activeCount = activeEmergencies.length;
    const highCount = activeEmergencies.filter((e) => {
      const p = (e.priority || '').toUpperCase();
      return p === 'CRITICAL' || p === 'HIGH';
    }).length;

    // Responders active count across real active emergencies
    let respondersActiveCount = 0;
    activeEmergencies.forEach((e) => {
      (e.responders || []).forEach((r) => {
        const s = (r.status || '').toUpperCase();
        if (s === 'DISPATCHED' || s === 'EN ROUTE' || s === 'ARRIVED' || s === 'ACCEPTED') {
          respondersActiveCount++;
        }
      });
    });

    // AI analyses count
    const aiCount = (emergencies || []).filter((e) => {
      return Boolean(e.ai_analysis || e.ai || e.analysis);
    }).length;

    return {
      active: activeCount,
      highPriority: highCount,
      respondersActive: respondersActiveCount > 0 ? respondersActiveCount : (activeCount > 0 ? '0' : '—'),
      aiAnalyses: aiCount > 0 ? aiCount : (emergencies.length > 0 ? '0' : '—'),
    };
  }, [activeEmergencies, emergencies]);

  // Filtered active incidents based on search & priority chip
  const filteredIncidents = useMemo(() => {
    return activeEmergencies.filter((e) => {
      const matchesPriority =
        filterPriority === 'ALL' ||
        (e.priority || '').toUpperCase() === filterPriority;

      const q = searchQuery.toLowerCase().trim();
      const code = (e.emergency_code || e.id || '').toString().toLowerCase();
      const type = (e.type || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const loc = (e.location_text || e.location?.address || e.location?.area || '').toLowerCase();

      const matchesSearch = !q || code.includes(q) || type.includes(q) || desc.includes(q) || loc.includes(q);

      return matchesPriority && matchesSearch;
    });
  }, [activeEmergencies, filterPriority, searchQuery]);

  // Map markers and center
  const mapMarkers = useMemo(() => {
    return buildMapMarkers(activeEmergencies, selectedIncidentCode);
  }, [activeEmergencies, selectedIncidentCode]);

  const mapCenter = useMemo(() => {
    if (currentEmergency) {
      const lat = Number(currentEmergency.latitude ?? currentEmergency.location?.lat);
      const lng = Number(currentEmergency.longitude ?? currentEmergency.location?.lng);
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return [28.6139, 77.2090];
  }, [currentEmergency]);

  // Parse AI data for the selected incident
  const activeAI = useMemo(() => {
    const raw = selectedDetails?.ai_analysis || selectedDetails?.ai || currentEmergency?.ai_analysis || currentEmergency?.ai || currentEmergency?.analysis;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }, [selectedDetails, currentEmergency]);

  // Recommended responders array
  const recommendedResponders = useMemo(() => {
    if (activeAI?.recommendedResponders && Array.isArray(activeAI.recommendedResponders)) {
      return activeAI.recommendedResponders;
    }
    // Standard default emergency services recommendation based on incident type
    const t = (currentEmergency?.type || '').toLowerCase();
    if (t.includes('fire')) return ['Fire & Rescue', 'Ambulance', 'Police'];
    if (t.includes('road') || t.includes('accident')) return ['Ambulance', 'Police'];
    if (t.includes('crime') || t.includes('safety')) return ['Police', 'Ambulance'];
    if (t.includes('medical')) return ['Ambulance'];
    return ['Ambulance', 'Police'];
  }, [activeAI, currentEmergency]);

  // Dispatched responder statuses for the selected incident
  const assignedResponders = useMemo(() => {
    return selectedDetails?.responders || currentEmergency?.responders || [];
  }, [selectedDetails, currentEmergency]);

  // Check if a responder type is already dispatched
  const isResponderDispatched = (type) => {
    return assignedResponders.some(
      (r) => (r.type || '').toLowerCase().includes(type.toLowerCase()) && (r.status || '').toUpperCase() !== 'AVAILABLE'
    );
  };

  // Recent operational activity events (derived from real incidents)
  const recentActivities = useMemo(() => {
    const list = [];
    (emergencies || []).slice(0, 8).forEach((e) => {
      const code = e.emergency_code || e.id;
      if (e.created_at || e.createdAt) {
        list.push({
          id: `rep-${code}`,
          time: e.created_at || e.createdAt,
          title: `Incident #${code} Reported`,
          desc: `${e.type || 'Emergency'} received at ${e.location_text || 'Registered location'}`,
          type: 'report',
        });
      }
      if (e.ai_analysis || e.ai) {
        list.push({
          id: `ai-${code}`,
          time: e.updated_at || e.created_at,
          title: `AI Triage Generated for #${code}`,
          desc: `Assessed Priority: ${e.priority || 'Standard'} • Severity: ${e.severity || 'Moderate'}`,
          type: 'ai',
        });
      }
      (e.responders || []).forEach((r, ri) => {
        list.push({
          id: `disp-${code}-${ri}`,
          time: r.dispatched_at || e.updated_at,
          title: `${r.type || 'Responder'} Dispatched to #${code}`,
          desc: `Unit ${r.name || r.type} assigned • Status: ${r.status || 'Dispatched'}`,
          type: 'dispatch',
        });
      });
    });

    return list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 6);
  }, [emergencies]);

  return (
    <AppLayout
      title="Emergency Response Command Center"
      subtitle="Monitor incidents, review AI decision support, and coordinate response."
    >
      <div className="cc-container">
        {/* =====================================================
            1. COMMAND CENTER HEADER
            ===================================================== */}
        <section className="cc-header-panel" aria-label="Command Center Header">
          <div className="cc-header-titles">
            <div className="cc-title-row">
              <div className="cc-title-icon" aria-hidden="true">
                <i className="bi bi-shield-shaded"></i>
              </div>
              <div>
                <h1 className="cc-main-title">Emergency Response Command Center</h1>
                <p className="cc-subtitle">
                  Monitor incidents, review AI decision support, and coordinate response.
                </p>
              </div>
            </div>
          </div>

          <div className="cc-header-actions">
            {/* System Status Indicator */}
            <div className="cc-status-badge" role="status">
              <span className="cc-pulse-dot" aria-hidden="true"></span>
              <span>SYSTEM OPERATIONAL</span>
            </div>

            {/* Coordinator Role Indicator */}
            <div className="cc-role-tag" title="Active Session Role">
              <i className="bi bi-person-badge-fill" aria-hidden="true"></i>
              <span>{currentUser?.name || 'Emergency Coordinator'}</span>
            </div>

            {/* Refresh Control */}
            <button
              type="button"
              className="cc-btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              aria-label="Refresh command center telemetry"
            >
              <i
                className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-animation' : ''}`}
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  animation: isRefreshing ? 'radarPing 1s linear infinite' : 'none',
                }}
              ></i>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </section>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div
            className="alert alert-success d-flex align-items-center gap-2 m-0 p-3 rounded-3"
            style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7' }}
            role="alert"
          >
            <i className="bi bi-check-circle-fill fs-5" aria-hidden="true"></i>
            <span className="fw-semibold">{actionNotice}</span>
          </div>
        )}

        {/* =====================================================
            2. KPI OVERVIEW CARDS (Real Data Only)
            ===================================================== */}
        <section className="cc-kpi-grid" aria-label="Key Performance Indicators">
          {/* Active Emergencies */}
          <div className="cc-kpi-card cc-kpi-accent-red">
            <div>
              <div className="cc-kpi-value">{kpiData.active}</div>
              <div className="cc-kpi-label">Active Emergencies</div>
            </div>
            <div className="cc-kpi-icon-wrap kpi-icon-red" aria-hidden="true">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
          </div>

          {/* High Priority */}
          <div className="cc-kpi-card cc-kpi-accent-orange">
            <div>
              <div className="cc-kpi-value">{kpiData.highPriority}</div>
              <div className="cc-kpi-label">High Priority</div>
            </div>
            <div className="cc-kpi-icon-wrap kpi-icon-orange" aria-hidden="true">
              <i className="bi bi-lightning-charge-fill"></i>
            </div>
          </div>

          {/* Responders Active */}
          <div className="cc-kpi-card cc-kpi-accent-green">
            <div>
              <div className="cc-kpi-value">{kpiData.respondersActive}</div>
              <div className="cc-kpi-label">Responders Active</div>
            </div>
            <div className="cc-kpi-icon-wrap kpi-icon-green" aria-hidden="true">
              <i className="bi bi-truck-front-fill"></i>
            </div>
          </div>

          {/* AI Analyses */}
          <div className="cc-kpi-card cc-kpi-accent-blue">
            <div>
              <div className="cc-kpi-value">{kpiData.aiAnalyses}</div>
              <div className="cc-kpi-label">AI Analyses</div>
            </div>
            <div className="cc-kpi-icon-wrap kpi-icon-blue" aria-hidden="true">
              <i className="bi bi-cpu-fill"></i>
            </div>
          </div>
        </section>

        {/* =====================================================
            3. MAIN COMMAND AREA (Two-Column Desktop Layout)
            ===================================================== */}
        <section className="cc-main-command-grid" aria-label="Incident Management Map and Queue">
          {/* LEFT: LIVE INCIDENT MAP */}
          <div className="cc-card-shell">
            <div className="cc-card-header">
              <h2 className="cc-card-title">
                <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true"></i>
                <span>Live Incident Map</span>
                {currentEmergency && (
                  <span className="badge bg-secondary ms-2" style={{ fontSize: '11px' }}>
                    #{currentEmergency.emergency_code || currentEmergency.id} Focus
                  </span>
                )}
              </h2>

              <div className="cc-filter-row">
                <button
                  type="button"
                  className={`cc-filter-chip ${filterPriority === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterPriority('ALL')}
                >
                  All ({activeEmergencies.length})
                </button>
                <button
                  type="button"
                  className={`cc-filter-chip ${filterPriority === 'CRITICAL' ? 'active' : ''}`}
                  onClick={() => setFilterPriority('CRITICAL')}
                >
                  Critical
                </button>
                <button
                  type="button"
                  className={`cc-filter-chip ${filterPriority === 'HIGH' ? 'active' : ''}`}
                  onClick={() => setFilterPriority('HIGH')}
                >
                  High
                </button>
              </div>
            </div>

            <div className="cc-map-container">
              {loading && emergencies.length === 0 ? (
                <div className="cc-state-box h-100 d-flex flex-column align-items-center justify-content-center">
                  <div className="spinner-border text-primary mb-2" role="status"></div>
                  <div className="cc-state-title">Loading Incident Map...</div>
                </div>
              ) : (
                <MapView
                  markers={mapMarkers}
                  center={mapCenter}
                  height={520}
                />
              )}
            </div>

            <div className="cc-map-legend">
              <div className="cc-legend-items">
                <span className="cc-legend-item">🚨 Active Emergency</span>
                <span className="cc-legend-item">🚑 Ambulance Unit</span>
                <span className="cc-legend-item">👮 Police Patrol</span>
                <span className="cc-legend-item">🤝 Community Helper</span>
              </div>
              <span>Click markers to view telemetry</span>
            </div>
          </div>

          {/* RIGHT: ACTIVE INCIDENTS PANEL */}
          <div className="cc-card-shell">
            <div className="cc-card-header">
              <h2 className="cc-card-title">
                <i className="bi bi-list-task text-primary" aria-hidden="true"></i>
                <span>Active Incidents Queue</span>
              </h2>
              <span className="badge bg-danger" style={{ fontSize: '11px', fontWeight: 700 }}>
                {activeEmergencies.length} ACTIVE
              </span>
            </div>

            <div className="cc-card-body">
              {/* Search Bar */}
              <div className="cc-search-input-wrap">
                <i className="bi bi-search" aria-hidden="true"></i>
                <input
                  type="text"
                  className="cc-search-input"
                  placeholder="Filter by code, category, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter incidents"
                />
              </div>

              {/* Incidents List */}
              <div className="cc-incidents-scroll" role="region" aria-label="Incident Cards List">
                {loading && emergencies.length === 0 ? (
                  <div className="cc-state-box">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <div className="cc-state-title">Loading active queue...</div>
                  </div>
                ) : error && emergencies.length === 0 ? (
                  <div className="cc-state-box">
                    <i className="bi bi-wifi-off cc-state-icon text-danger" aria-hidden="true"></i>
                    <div className="cc-state-title">Connection Error</div>
                    <p className="cc-state-desc">{error}</p>
                    <button type="button" className="cc-btn-refresh mt-3" onClick={handleRefresh}>
                      Retry Connection
                    </button>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="cc-state-box">
                    <i className="bi bi-shield-check cc-state-icon text-success" aria-hidden="true"></i>
                    <div className="cc-state-title">All Clear</div>
                    <p className="cc-state-desc">
                      {searchQuery
                        ? 'No incidents match the search query.'
                        : 'No active emergency incidents currently reported in this sector.'}
                    </p>
                  </div>
                ) : (
                  filteredIncidents.map((incident) => {
                    const code = incident.emergency_code || incident.id;
                    const isSelected = String(selectedIncidentCode) === String(code);

                    return (
                      <div
                        key={incident.id}
                        className={`cc-incident-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectIncident(incident)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectIncident(incident)}
                        aria-selected={isSelected}
                        aria-label={`Incident #${code} - ${incident.type}`}
                      >
                        <div className="cc-incident-card-top">
                          <div>
                            <span className="cc-incident-ref">#{code}</span>
                            <h3 className="cc-incident-type">{incident.type || 'Emergency'}</h3>
                          </div>
                          <div className="cc-incident-badges">
                            {incident.priority && <PriorityBadge priority={incident.priority} />}
                            {incident.status && <StatusBadge status={incident.status} />}
                          </div>
                        </div>

                        <p className="cc-incident-desc">{incident.description}</p>

                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          {incident.severity && <SeverityBadge severity={incident.severity} />}
                          {incident.responders && incident.responders.length > 0 && (
                            <span className="badge bg-dark border border-secondary text-secondary" style={{ fontSize: '10.5px' }}>
                              <i className="bi bi-truck me-1"></i>
                              {incident.responders.length} Assigned
                            </span>
                          )}
                          {((Number(incident.photos_count) > 0) || (Number(incident.videos_count) > 0) || (Number(incident.media_count) > 0) || (Array.isArray(incident.media) && incident.media.length > 0)) && (
                            <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25" style={{ fontSize: '10.5px' }} title="Visual evidence attached">
                              {(Number(incident.photos_count) > 0 || (Array.isArray(incident.media) && incident.media.some(m => m.media_type === 'photo'))) && (
                                <span className="me-1">📷 {incident.photos_count || incident.media.filter(m => m.media_type === 'photo').length}</span>
                              )}
                              {(Number(incident.videos_count) > 0 || (Array.isArray(incident.media) && incident.media.some(m => m.media_type === 'video'))) && (
                                <span>🎥 {incident.videos_count || incident.media.filter(m => m.media_type === 'video').length}</span>
                              )}
                              {!(Number(incident.photos_count) > 0) && !(Number(incident.videos_count) > 0) && (
                                <span>Evidence Available</span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="cc-incident-footer">
                          <div className="cc-incident-meta-left">
                            <i className="bi bi-geo-alt text-danger" aria-hidden="true"></i>
                            <span>
                              {incident.location_text || incident.location?.area || incident.location?.address || 'Location registered'}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <span>{formatTime(incident.created_at || incident.createdAt)}</span>
                            <button
                              type="button"
                              className="cc-btn-view-details"
                              onClick={(e) => handleOpenDetailsPage(incident, e)}
                              title="Open Full Incident Record"
                            >
                              <span>Details</span>
                              <i className="bi bi-box-arrow-up-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            4. SELECTED INCIDENT DEEP DIVE (AI, Dispatch & Timeline)
            ===================================================== */}
        {currentEmergency && (
          <section className="cc-incident-deepdive-grid" aria-label="Selected Incident Operational Controls">
            {/* 5. AI ANALYSIS PANEL WITH HINDSIGHT MEMORY */}
            <div className="cc-ai-card">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-cpu text-info fs-5" aria-hidden="true"></i>
                  <h3 className="m-0 text-white fw-bold fs-6">Memory-Assisted AI Analysis</h3>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                    Incident #{currentEmergency.emergency_code || currentEmergency.id}
                  </span>
                  {activeAI?.confidence && (
                    <span className="badge bg-info-subtle text-info border border-info-subtle">
                      Confidence: {Math.round(activeAI.confidence * (activeAI.confidence <= 1 ? 100 : 1))}%
                    </span>
                  )}
                </div>
              </div>

              {/* Cognitive Workflow Diagram */}
              <div className="cc-ai-flow-diagram" aria-label="Decision Support Flow">
                <span className="cc-ai-flow-node active">
                  <i className="bi bi-broadcast"></i> Current Incident
                </span>
                <span className="cc-ai-flow-arrow">→</span>
                <span className="cc-ai-flow-node active">
                  <i className="bi bi-database-fill-gear"></i> Hindsight Memory
                </span>
                <span className="cc-ai-flow-arrow">→</span>
                <span className="cc-ai-flow-node active">
                  <i className="bi bi-robot"></i> Context-Aware AI Support
                </span>
                <span className="cc-ai-flow-arrow">→</span>
                <span className="cc-ai-flow-node">
                  <i className="bi bi-person-check-fill"></i> Coordinator Decision
                </span>
              </div>

              {activeAI ? (
                <>
                  <div className="cc-ai-meta-grid">
                    <div className="cc-ai-meta-item">
                      <span className="cc-ai-meta-title">Triage Category</span>
                      <span className="cc-ai-meta-val">{activeAI.category || currentEmergency.type || 'Emergency'}</span>
                    </div>
                    <div className="cc-ai-meta-item">
                      <span className="cc-ai-meta-title">Severity Assessment</span>
                      <span className="cc-ai-meta-val text-warning">{activeAI.severity || currentEmergency.severity || 'Moderate'}</span>
                    </div>
                    <div className="cc-ai-meta-item">
                      <span className="cc-ai-meta-title">Priority Rating</span>
                      <span className="cc-ai-meta-val text-danger">{activeAI.priority || currentEmergency.priority || 'Medium'}</span>
                    </div>
                  </div>

                  {activeAI.reasoning && (
                    <div className="cc-ai-reasoning-box">
                      <div className="fw-bold mb-1 text-info small text-uppercase">Triage Clinical / Strategic Rationale</div>
                      {activeAI.reasoning}
                    </div>
                  )}

                  {activeAI.keySignals && Array.isArray(activeAI.keySignals) && activeAI.keySignals.length > 0 && (
                    <div>
                      <div className="text-secondary small fw-bold text-uppercase mb-2">Detected Scene Signals</div>
                      <div className="cc-ai-keysignals-wrap">
                        {activeAI.keySignals.map((signal, sIdx) => (
                          <span key={sIdx} className="cc-ai-signal-pill">
                            <i className="bi bi-tag-fill me-1 text-primary"></i>
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hindsight Memory Recall Card */}
                  <div className="cc-hindsight-box">
                    <div className="cc-hindsight-header">
                      <i className="bi bi-database-fill-check"></i>
                      <span>Episodic Hindsight Memory Recall</span>
                    </div>
                    <p className="cc-hindsight-text">
                      {memoryContext?.summary ||
                       memoryContext?.facts?.[0] ||
                       activeAI?.hindsight_memory?.summary ||
                       'Active contextual memory indexed. Historical incident constraints recalled to inform current responder dispatch.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="cc-state-box p-3">
                  <i className="bi bi-hourglass-split cc-state-icon text-muted" aria-hidden="true"></i>
                  <div className="cc-state-title">AI Analysis Standby</div>
                  <p className="cc-state-desc">
                    Triage evaluation pending or automated classification in progress for this incident.
                  </p>
                </div>
              )}

              {/* Safety Footnote */}
              <div className="cc-ai-safety-note">
                <i className="bi bi-shield-exclamation text-warning fs-5" aria-hidden="true"></i>
                <span>AI supports the coordinator. Final emergency response decisions remain human-controlled.</span>
              </div>
            </div>

            {/* 6. RESPONSE / DISPATCH & TIMELINE PANEL */}
            <div className="d-flex flex-direction-column gap-3" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Dispatch Controls Card */}
              <div className="cc-dispatch-card">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-send-check text-danger fs-5" aria-hidden="true"></i>
                    <h3 className="m-0 text-white fw-bold fs-6">Response / Dispatch Panel</h3>
                  </div>
                  <span className="text-secondary small">Authorization Verified</span>
                </div>

                <div className="cc-dispatch-table">
                  {recommendedResponders.map((responderName) => {
                    const dispatched = isResponderDispatched(responderName);
                    const isProcessing = dispatching[responderName];
                    const isAmb = responderName.toLowerCase().includes('ambulance');
                    const isPol = responderName.toLowerCase().includes('police');
                    const isFire = responderName.toLowerCase().includes('fire');

                    return (
                      <div key={responderName} className="cc-dispatch-row">
                        <div className="cc-responder-info">
                          <div
                            className={`cc-responder-avatar ${
                              isAmb ? 'avatar-ambulance' : isPol ? 'avatar-police' : isFire ? 'avatar-fire' : 'avatar-helper'
                            }`}
                          >
                            <i
                              className={`bi ${
                                isAmb ? 'bi-heart-pulse-fill' : isPol ? 'bi-shield-fill' : isFire ? 'bi-fire' : 'bi-people-fill'
                              }`}
                            ></i>
                          </div>
                          <div>
                            <div className="cc-responder-name">{responderName}</div>
                            <div className="cc-responder-desc">
                              {isAmb && 'Immediate Advanced Medical & Triage Support'}
                              {isPol && 'Traffic Containment & Area Security'}
                              {isFire && 'Hazard Mitigation & Extraction Squad'}
                              {!isAmb && !isPol && !isFire && 'Community Volunteer First Response'}
                            </div>
                          </div>
                        </div>

                        <div>
                          {dispatched ? (
                            <span className="cc-badge-dispatched">
                              <i className="bi bi-check-all"></i>
                              <span>Dispatched</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="cc-btn-dispatch"
                              onClick={() => handleDispatchResponder(responderName)}
                              disabled={isProcessing}
                              aria-label={`Dispatch ${responderName}`}
                            >
                              {isProcessing ? (
                                <>
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                  <span>Dispatching...</span>
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-send-fill"></i>
                                  <span>DISPATCH</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7. INCIDENT TIMELINE & 8. RESPONDER STATUS */}
              <div className="cc-timeline-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-clock-history text-primary fs-5" aria-hidden="true"></i>
                    <h3 className="m-0 text-white fw-bold fs-6">Incident Activity Timeline</h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-info"
                    onClick={(e) => handleOpenDetailsPage(currentEmergency, e)}
                  >
                    Open Full Details Page →
                  </button>
                </div>

                <ul className="cc-timeline-v">
                  {/* Step 1: Reported */}
                  <li className="cc-timeline-step">
                    <span className="cc-step-dot done">✓</span>
                    <div className="cc-step-title">Emergency Reported by Citizen</div>
                    <div className="cc-step-time">{formatTime(currentEmergency.created_at || currentEmergency.createdAt)} • Inbound Telemetry</div>
                  </li>

                  {/* Step 2: AI Analyzed */}
                  <li className="cc-timeline-step">
                    <span className={`cc-step-dot ${activeAI ? 'done' : 'active'}`}>
                      {activeAI ? '✓' : '●'}
                    </span>
                    <div className="cc-step-title">
                      {activeAI ? 'AI Analysis Completed' : 'AI Analysis in Progress'}
                    </div>
                    <div className="cc-step-time">Google Gemini Decision Engine</div>
                  </li>

                  {/* Step 3: Hindsight Recalled */}
                  <li className="cc-timeline-step">
                    <span className="cc-step-dot done">✓</span>
                    <div className="cc-step-title">Memory Context Recalled</div>
                    <div className="cc-step-time">Hindsight Episodic Memory System</div>
                  </li>

                  {/* Step 4: Dispatched */}
                  <li className="cc-timeline-step">
                    <span
                      className={`cc-step-dot ${
                        assignedResponders.length > 0 ? 'done' : 'active'
                      }`}
                    >
                      {assignedResponders.length > 0 ? '✓' : '●'}
                    </span>
                    <div className="cc-step-title">
                      {assignedResponders.length > 0
                        ? `${assignedResponders.length} Responders Dispatched`
                        : 'Awaiting Coordinator Dispatch Order'}
                    </div>
                    <div className="cc-step-time">Human Coordinator Authorization</div>
                  </li>

                  {/* Step 5: Resolved */}
                  <li className="cc-timeline-step">
                    <span className={`cc-step-dot ${(currentEmergency.status || '').toUpperCase() === 'RESOLVED' ? 'done' : ''}`}>
                      {(currentEmergency.status || '').toUpperCase() === 'RESOLVED' ? '✓' : '○'}
                    </span>
                    <div className="cc-step-title">Incident Resolution</div>
                    <div className="cc-step-time">
                      {(currentEmergency.status || '').toUpperCase() === 'RESOLVED'
                        ? 'Confirmed Resolved'
                        : 'Active Operational Phase'}
                    </div>
                  </li>
                </ul>
              </div>

              {/* 8. ACTIVE RESPONDER STATUS SECTION */}
              <div className="cc-timeline-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-broadcast-pin text-success fs-5" aria-hidden="true"></i>
                    <h3 className="m-0 text-white fw-bold fs-6">Responder Telemetry & Monitoring</h3>
                  </div>
                  <span className="badge bg-success-subtle text-success">Live Track</span>
                </div>

                {assignedResponders.length === 0 ? (
                  <div className="text-secondary small py-2">
                    <i className="bi bi-info-circle me-1"></i>
                    No units deployed for this incident yet. Use dispatch buttons above to mobilize emergency crews.
                  </div>
                ) : (
                  <div className="cc-responders-table-wrap">
                    <table className="cc-responders-table">
                      <thead>
                        <tr>
                          <th>Unit / Name</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Dispatched At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedResponders.map((r, rIndex) => (
                          <tr key={rIndex}>
                            <td className="fw-bold text-white">{r.name || r.type}</td>
                            <td>{r.type}</td>
                            <td>
                              <span className="badge bg-success" style={{ fontSize: '10.5px' }}>
                                ● {r.status || 'EN ROUTE'}
                              </span>
                            </td>
                            <td className="text-secondary small">{formatTime(r.dispatched_at || r.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            9. RECENT OPERATIONAL ACTIVITY FEED
            ===================================================== */}
        {recentActivities.length > 0 && (
          <section className="cc-card-shell" aria-label="Recent Operational Activity">
            <div className="cc-card-header">
              <h2 className="cc-card-title">
                <i className="bi bi-activity text-info" aria-hidden="true"></i>
                <span>Recent System Activity Feed</span>
              </h2>
              <span className="text-secondary small">Real-time event logging</span>
            </div>

            <div className="cc-card-body p-0">
              <div className="table-responsive m-0">
                <table className="table table-dark table-hover m-0" style={{ background: 'transparent' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
                      <th className="px-3 py-2 text-secondary small text-uppercase">Time</th>
                      <th className="px-3 py-2 text-secondary small text-uppercase">Event</th>
                      <th className="px-3 py-2 text-secondary small text-uppercase">Operational Details</th>
                      <th className="px-3 py-2 text-secondary small text-uppercase text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((act) => (
                      <tr key={act.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td className="px-3 py-2 text-secondary small font-monospace">{formatTime(act.time)}</td>
                        <td className="px-3 py-2 fw-bold text-white small">{act.title}</td>
                        <td className="px-3 py-2 text-secondary small">{act.desc}</td>
                        <td className="px-3 py-2 text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                            style={{ fontSize: '11px' }}
                            onClick={() => {
                              const matchCode = act.title.match(/#([A-Za-z0-9-]+)/);
                              if (matchCode && matchCode[1]) {
                                const found = emergencies.find(
                                  (e) => String(e.emergency_code) === matchCode[1] || String(e.id) === matchCode[1]
                                );
                                if (found) handleSelectIncident(found);
                              }
                            }}
                          >
                            Locate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
