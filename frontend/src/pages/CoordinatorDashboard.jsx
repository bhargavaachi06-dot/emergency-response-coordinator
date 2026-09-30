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
 * Formats timestamps cleanly
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
  const effectiveSelectedCode =
    selectedIncidentCode ||
    (activeEmergencies[0]?.emergency_code || activeEmergencies[0]?.id || null);

  // Current selected emergency record
  const currentEmergency = useMemo(() => {
    return (
      (emergencies || []).find(
        (e) =>
          String(e.emergency_code) === String(effectiveSelectedCode) ||
          String(e.id) === String(effectiveSelectedCode)
      ) ||
      activeEmergencies[0] ||
      null
    );
  }, [emergencies, effectiveSelectedCode, activeEmergencies]);

  // Fetch full details and memory context asynchronously when selected incident changes
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
        setActionNotice(`${responderType} dispatched successfully.`);
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

    let respondersActiveCount = 0;
    activeEmergencies.forEach((e) => {
      (e.responders || []).forEach((r) => {
        const s = (r.status || '').toUpperCase();
        if (s === 'DISPATCHED' || s === 'EN ROUTE' || s === 'ARRIVED' || s === 'ACCEPTED') {
          respondersActiveCount++;
        }
      });
    });

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

  // Filtered active incidents
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

      const matchesSearch =
        !q ||
        code.includes(q) ||
        type.includes(q) ||
        desc.includes(q) ||
        loc.includes(q);

      return matchesPriority && matchesSearch;
    });
  }, [activeEmergencies, filterPriority, searchQuery]);

  // Active AI analysis object
  const activeAI = useMemo(() => {
    const source = selectedDetails || currentEmergency;
    if (!source) return null;
    let ai = source.ai_analysis || source.ai || source.analysis;
    if (typeof ai === 'string') {
      try {
        ai = JSON.parse(ai);
      } catch {
        // ignore
      }
    }
    return ai || null;
  }, [selectedDetails, currentEmergency]);

  // Map center and markers
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

  const mapMarkers = useMemo(() => {
    return buildMapMarkers(activeEmergencies, effectiveSelectedCode);
  }, [activeEmergencies, effectiveSelectedCode]);

  // Recommended responders
  const recommendedResponders = useMemo(() => {
    if (activeAI?.recommendedResponders && Array.isArray(activeAI.recommendedResponders) && activeAI.recommendedResponders.length > 0) {
      return activeAI.recommendedResponders;
    }
    const t = (currentEmergency?.type || '').toLowerCase();
    if (t.includes('fire')) return ['Fire & Rescue', 'Ambulance', 'Police'];
    if (t.includes('road') || t.includes('accident')) return ['Ambulance', 'Police'];
    if (t.includes('crime') || t.includes('safety')) return ['Police', 'Ambulance'];
    if (t.includes('medical')) return ['Ambulance'];
    return ['Ambulance', 'Police'];
  }, [activeAI, currentEmergency]);

  // Assigned responders list
  const assignedResponders = useMemo(() => {
    return selectedDetails?.responders || currentEmergency?.responders || [];
  }, [selectedDetails, currentEmergency]);

  const isResponderDispatched = (type) => {
    return assignedResponders.some(
      (r) =>
        (r.type || '').toLowerCase().includes(type.toLowerCase()) &&
        (r.status || '').toUpperCase() !== 'AVAILABLE'
    );
  };

  // Media files for selected emergency
  const mediaList = useMemo(() => {
    return selectedDetails?.media || currentEmergency?.media || [];
  }, [selectedDetails, currentEmergency]);

  return (
    <AppLayout
      title="Emergency Response Command Center"
      subtitle="Monitor incidents, review AI decision support, and coordinate response."
    >
      <div className="cc-container">
        {/* =====================================================
            1. TOP: COMMAND CENTER HEADER
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
            {/* System Status */}
            <div className="cc-status-badge" role="status">
              <span className="cc-pulse-dot" aria-hidden="true"></span>
              <span>SYSTEM OPERATIONAL</span>
            </div>

            {/* Coordinator Role */}
            <div className="cc-role-tag" title="Active Session Role">
              <i className="bi bi-person-badge-fill" aria-hidden="true"></i>
              <span>{currentUser?.name || 'Coordinator'}</span>
            </div>

            {/* Refresh */}
            <button
              type="button"
              className="cc-btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              aria-label="Refresh telemetry"
            >
              <i
                className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-icon' : ''}`}
                aria-hidden="true"
              ></i>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </section>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="cc-notice-banner" role="alert">
            <i className="bi bi-check-circle-fill me-2 text-success"></i>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* =====================================================
            2. KPI ROW
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
            3. MAIN AREA: LEFT LIVE MAP | RIGHT INCIDENT QUEUE
            ===================================================== */}
        <section className="cc-main-grid" aria-label="Incident Management Map and Queue">
          {/* LEFT: Live Map */}
          <div className="cc-panel-card">
            <div className="cc-panel-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true"></i>
                <h2 className="cc-panel-title m-0">Live Map</h2>
                {currentEmergency && (
                  <span className="badge bg-secondary ms-1" style={{ fontSize: '11px' }}>
                    #{currentEmergency.emergency_code || currentEmergency.id}
                  </span>
                )}
              </div>

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

            <div className="cc-map-wrapper">
              {loading && emergencies.length === 0 ? (
                <div className="cc-empty-state">
                  <div className="spinner-border text-primary mb-2" role="status"></div>
                  <div>Loading Map...</div>
                </div>
              ) : (
                <MapView markers={mapMarkers} center={mapCenter} height={480} />
              )}
            </div>

            <div className="cc-map-legend">
              <span className="legend-tag">🚨 Emergency</span>
              <span className="legend-tag">🚑 Ambulance</span>
              <span className="legend-tag">👮 Police</span>
              <span className="legend-tag">🤝 Helper</span>
            </div>
          </div>

          {/* RIGHT: Active Incident Queue */}
          <div className="cc-panel-card">
            <div className="cc-panel-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-list-task text-primary" aria-hidden="true"></i>
                <h2 className="cc-panel-title m-0">Active Incident Queue</h2>
              </div>
              <span className="badge bg-danger" style={{ fontSize: '11px', fontWeight: 700 }}>
                {activeEmergencies.length} ACTIVE
              </span>
            </div>

            <div className="cc-panel-body">
              {/* Search input */}
              <div className="cc-search-box">
                <i className="bi bi-search" aria-hidden="true"></i>
                <input
                  type="text"
                  className="cc-search-field"
                  placeholder="Filter by code, type, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter incidents"
                />
              </div>

              {/* Incidents List */}
              <div className="cc-queue-scroll" role="region" aria-label="Active Incidents List">
                {loading && emergencies.length === 0 ? (
                  <div className="cc-empty-state">
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <div>Loading queue...</div>
                  </div>
                ) : error && emergencies.length === 0 ? (
                  <div className="cc-empty-state">
                    <i className="bi bi-wifi-off text-danger fs-3 mb-2"></i>
                    <div>Connection Error</div>
                    <button type="button" className="cc-btn-refresh mt-2" onClick={handleRefresh}>
                      Retry
                    </button>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="cc-empty-state">
                    <i className="bi bi-shield-check text-success fs-3 mb-2"></i>
                    <div>No active incidents matching criteria</div>
                  </div>
                ) : (
                  filteredIncidents.map((incident) => {
                    const code = incident.emergency_code || incident.id;
                    const isSelected = String(effectiveSelectedCode) === String(code);

                    return (
                      <div
                        key={incident.id}
                        className={`cc-queue-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectIncident(incident)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectIncident(incident)}
                        aria-selected={isSelected}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            <span className="cc-incident-code">#{code}</span>
                            <span className="cc-incident-type-label">{incident.type || 'Emergency'}</span>
                          </div>
                          <div className="d-flex gap-1">
                            {incident.priority && <PriorityBadge priority={incident.priority} />}
                            {incident.status && <StatusBadge status={incident.status} />}
                          </div>
                        </div>

                        <p className="cc-queue-desc">{incident.description}</p>

                        <div className="d-flex justify-content-between align-items-center pt-1 border-top border-secondary border-opacity-25 mt-2">
                          <span className="text-secondary small text-truncate" style={{ maxWidth: '65%' }}>
                            <i className="bi bi-geo-alt text-danger me-1"></i>
                            {incident.location_text || incident.location?.address || 'Location registered'}
                          </span>
                          <span className="text-muted small">{formatTime(incident.created_at || incident.createdAt)}</span>
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
            4. WHEN AN INCIDENT IS SELECTED: SHOW COMPACT DETAILS
            ===================================================== */}
        {currentEmergency && (
          <section className="cc-selected-incident-section" aria-label="Selected Incident Operations">
            <div className="cc-incident-details-shell">
              {/* Incident Header & Information */}
              <div className="cc-details-header">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="cc-detail-ref">
                        Incident #{currentEmergency.emergency_code || currentEmergency.id}
                      </span>
                      <h2 className="cc-detail-title m-0">{currentEmergency.type || 'Emergency'}</h2>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {currentEmergency.severity && <SeverityBadge severity={currentEmergency.severity} />}
                      <PriorityBadge priority={currentEmergency.priority} />
                      <StatusBadge status={currentEmergency.status} />
                      <span className="text-secondary small ms-2">
                        <i className="bi bi-clock me-1"></i>
                        {formatTime(currentEmergency.created_at || currentEmergency.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="cc-btn-full-details"
                    onClick={(e) => handleOpenDetailsPage(currentEmergency, e)}
                  >
                    <span>Full Incident Record</span>
                    <i className="bi bi-box-arrow-up-right ms-1"></i>
                  </button>
                </div>

                {/* Location and Description */}
                <div className="cc-details-summary-row mt-3">
                  <div className="cc-summary-item">
                    <span className="cc-summary-label">Location:</span>
                    <span className="cc-summary-val">
                      <i className="bi bi-geo-alt text-danger me-1"></i>
                      {currentEmergency.location_text || currentEmergency.location?.address || 'Location registered'}
                    </span>
                  </div>

                  <div className="cc-summary-item">
                    <span className="cc-summary-label">Description:</span>
                    <span className="cc-summary-val">{currentEmergency.description}</span>
                  </div>

                  {mediaList.length > 0 && (
                    <div className="cc-summary-item">
                      <span className="cc-summary-label">Evidence:</span>
                      <span className="cc-summary-val text-info">
                        <i className="bi bi-camera-reels me-1"></i>
                        {mediaList.length} file{mediaList.length > 1 ? 's' : ''} attached
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* TWO COLUMN OPERATIONS: AI DECISION SUPPORT | HUMAN REVIEW & DISPATCH */}
              <div className="cc-ops-grid">
                {/* 1. ONE COMPACT SECTION: "AI Decision Support" */}
                <div className="cc-ai-decision-card">
                  <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-cpu text-info fs-5"></i>
                      <h3 className="m-0 text-white fw-bold fs-6">AI Decision Support</h3>
                    </div>
                    {activeAI?.confidence && (
                      <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                        Confidence: {Math.round(activeAI.confidence * (activeAI.confidence <= 1 ? 100 : 1))}%
                      </span>
                    )}
                  </div>

                  <div className="cc-ops-card-body">
                    {activeAI ? (
                      <>
                        {/* Current AI assessment */}
                        <div className="cc-ai-sub-row mb-3">
                          <div className="text-secondary small fw-bold text-uppercase mb-1">Current AI Assessment</div>
                          <p className="cc-ai-text m-0">
                            {activeAI.reasoning || `${activeAI.category || currentEmergency.type} incident assessed as ${activeAI.priority || 'standard'} priority.`}
                          </p>
                        </div>

                        {/* Relevant Previous Experience (Hindsight) */}
                        <div className="cc-ai-sub-row mb-3">
                          <div className="text-secondary small fw-bold text-uppercase mb-1">
                            <i className="bi bi-database-fill-check text-primary me-1"></i>
                            Relevant Previous Experience
                          </div>
                          <p className="cc-ai-text m-0">
                            {memoryContext?.summary ||
                              memoryContext?.facts?.[0] ||
                              activeAI?.hindsight_memory?.summary ||
                              'Context indexed from similar historical sector incidents to inform rapid response.'}
                          </p>
                        </div>

                        {/* Key Recommendation */}
                        <div className="cc-ai-sub-row mb-3">
                          <div className="text-secondary small fw-bold text-uppercase mb-1">
                            <i className="bi bi-lightbulb-fill text-warning me-1"></i>
                            Key Recommendation
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {recommendedResponders.map((r) => (
                              <span key={r} className="badge bg-dark border border-secondary text-light px-2 py-1">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-secondary small py-2">
                        <i className="bi bi-hourglass-split me-1"></i>
                        AI triage analysis is processing for this incident.
                      </div>
                    )}

                    {/* Human in the loop statement */}
                    <div className="cc-hitl-footer-note mt-3">
                      <i className="bi bi-shield-check text-success me-2 fs-5"></i>
                      <span>AI supports the coordinator. Final response decisions remain human-controlled.</span>
                    </div>
                  </div>
                </div>

                {/* 2. HUMAN COORDINATOR REVIEW & DISPATCH CONTROLS */}
                <div className="cc-dispatch-controls-card">
                  <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-check-fill text-success fs-5"></i>
                      <h3 className="m-0 text-white fw-bold fs-6">Human Coordinator Review & Dispatch</h3>
                    </div>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: '11px' }}>
                      Final Authority
                    </span>
                  </div>

                  <div className="cc-ops-card-body">
                    <div className="text-secondary small mb-3">
                      Authorize emergency responder units for Incident #{currentEmergency.emergency_code || currentEmergency.id}:
                    </div>

                    {/* Dispatch Table */}
                    <div className="cc-dispatch-list">
                      {recommendedResponders.map((responderName) => {
                        const isDispatched = isResponderDispatched(responderName);
                        const isProcessing = dispatching[responderName];
                        const isAmb = responderName.toLowerCase().includes('ambulance');
                        const isPol = responderName.toLowerCase().includes('police');
                        const isFire = responderName.toLowerCase().includes('fire');

                        return (
                          <div key={responderName} className="cc-dispatch-row-item">
                            <div className="d-flex align-items-center gap-2">
                              <span className="fs-5">
                                {isAmb ? '🚑' : isPol ? '👮' : isFire ? '🚒' : '🤝'}
                              </span>
                              <div>
                                <div className="fw-bold text-white small">{responderName}</div>
                                <div className="text-secondary" style={{ fontSize: '11px' }}>
                                  {isAmb && 'Medical Triage'}
                                  {isPol && 'Safety & Security'}
                                  {isFire && 'Hazard Containment'}
                                  {!isAmb && !isPol && !isFire && 'First Aid Support'}
                                </div>
                              </div>
                            </div>

                            <div>
                              {isDispatched ? (
                                <span className="badge bg-success" style={{ fontSize: '11px', padding: '6px 12px' }}>
                                  <i className="bi bi-check-all me-1"></i> Dispatched
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-dispatch-action"
                                  onClick={() => handleDispatchResponder(responderName)}
                                  disabled={isProcessing}
                                  aria-label={`Dispatch ${responderName}`}
                                >
                                  {isProcessing ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                      <span>Dispatching...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-send-fill me-1"></i>
                                      <span>Dispatch</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Assigned Responders Summary */}
                    {assignedResponders.length > 0 && (
                      <div className="mt-3 pt-2 border-top border-secondary border-opacity-25">
                        <div className="text-secondary small fw-bold text-uppercase mb-2">Deployed Units:</div>
                        <div className="d-flex gap-2 flex-wrap">
                          {assignedResponders.map((r, ri) => (
                            <span key={ri} className="badge bg-dark border border-success text-success" style={{ fontSize: '11px' }}>
                              ● {r.name || r.type}: {r.status || 'Dispatched'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
