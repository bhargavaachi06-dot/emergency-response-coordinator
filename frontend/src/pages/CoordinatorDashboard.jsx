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
      id: e.id,
      emergency_code: code,
      lat,
      lng,
      type: e.type || 'emergency',
      category: e.type || 'Incident',
      severity: e.severity || e.priority || 'MEDIUM',
      status: e.status || 'REPORTED',
      location: e.location_text || e.location?.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      createdAt: formatTime(e.created_at),
      label: `#${code}: ${e.type || 'Incident'}`,
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

/**
 * Helper to determine incident category icon
 */
function getIncidentIcon(type = '') {
  const t = type.toLowerCase();
  if (t.includes('fire') || t.includes('explosion') || t.includes('gas')) return 'bi-fire text-danger';
  if (t.includes('medical') || t.includes('health') || t.includes('cardiac')) return 'bi-heart-pulse-fill text-danger';
  if (t.includes('accident') || t.includes('crash') || t.includes('vehicle') || t.includes('traffic')) return 'bi-car-front-fill text-warning';
  if (t.includes('crime') || t.includes('theft') || t.includes('robbery') || t.includes('assault')) return 'bi-shield-slash-fill text-warning';
  if (t.includes('flood') || t.includes('storm') || t.includes('weather') || t.includes('collapse')) return 'bi-cloud-lightning-rain-fill text-info';
  return 'bi-exclamation-triangle-fill text-danger';
}

/**
 * Helper to get clean metadata and icon for responder types
 */
function getResponderMeta(name = '') {
  const t = name.toLowerCase();
  if (t.includes('ambulance') || t.includes('medical') || t.includes('paramedic')) {
    return { emoji: '🚑', label: 'Medical Emergency Triage', icon: 'bi-hospital-fill' };
  }
  if (t.includes('police') || t.includes('security') || t.includes('patrol')) {
    return { emoji: '👮', label: 'Law Enforcement & Perimeter', icon: 'bi-shield-shaded' };
  }
  if (t.includes('fire') || t.includes('rescue')) {
    return { emoji: '🚒', label: 'Fire & Hazard Containment', icon: 'bi-fire' };
  }
  return { emoji: '🤝', label: 'Community Emergency Support', icon: 'bi-person-raised-hand' };
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
  const [actionLoading, setActionLoading] = useState(false);
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
      // fallback handled gracefully
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

  // Real coordinator status verification handler
  const handleVerifyIncident = async () => {
    if (!currentEmergency) return;
    const code = currentEmergency.emergency_code || currentEmergency.id;
    setActionLoading(true);
    try {
      const res = await emergencyService.updateStatus(code, 'VERIFIED');
      if (res.success) {
        setActionNotice(`Incident #${code} verified successfully.`);
        await loadEmergencies();
        await fetchDeepDetails(code);
        setTimeout(() => setActionNotice(''), 3500);
      } else {
        setActionNotice(`Failed to verify: ${res.error || 'Server error'}`);
      }
    } catch (err) {
      setActionNotice(`Failed to verify: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Real coordinator resolution handler
  const handleResolveIncident = async () => {
    if (!currentEmergency) return;
    const code = currentEmergency.emergency_code || currentEmergency.id;
    setActionLoading(true);
    try {
      const res = await emergencyService.resolve(code);
      if (res.success) {
        setActionNotice(`Incident #${code} marked as resolved.`);
        await loadEmergencies();
        await fetchDeepDetails(code);
        setTimeout(() => setActionNotice(''), 3500);
      } else {
        setActionNotice(`Failed to resolve: ${res.error || 'Server error'}`);
      }
    } catch (err) {
      setActionNotice(`Failed to resolve: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // KPI Calculations using REAL existing data only
  const kpiData = useMemo(() => {
    const activeCount = activeEmergencies.length;
    const highCount = activeEmergencies.filter((e) => {
      const p = (e.priority || '').toUpperCase();
      return p === 'CRITICAL' || p === 'HIGH';
    }).length;

    // Responders En Route: real responders attached across active incidents whose status is EN_ROUTE, EN ROUTE, or DISPATCHED
    let enRouteCount = 0;
    activeEmergencies.forEach((e) => {
      (e.responders || []).forEach((r) => {
        const s = (r.status || '').toUpperCase();
        if (s === 'EN_ROUTE' || s === 'EN ROUTE' || s === 'DISPATCHED') {
          enRouteCount++;
        }
      });
    });

    // Awaiting Dispatch: active emergencies where no responder has been dispatched yet, or status is awaiting action
    const awaitingDispatchCount = activeEmergencies.filter((e) => {
      const s = (e.status || '').toUpperCase();
      const hasDispatchedResponders = (e.responders || []).some((r) => {
        const rs = (r.status || '').toUpperCase();
        return rs === 'DISPATCHED' || rs === 'EN_ROUTE' || rs === 'EN ROUTE' || rs === 'ARRIVED';
      });
      if (hasDispatchedResponders) return false;
      return s === 'REPORTED' || s === 'ANALYZING' || s === 'VERIFIED' || s === 'PENDING' || !s;
    }).length;

    return {
      active: activeCount,
      highPriority: highCount,
      respondersEnRoute: enRouteCount,
      awaitingDispatch: awaitingDispatchCount,
    };
  }, [activeEmergencies]);

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

  // Map center — only use real emergency coordinates; never default to Delhi
  const mapCenter = useMemo(() => {
    if (currentEmergency) {
      const lat = Number(currentEmergency.latitude ?? currentEmergency.location?.lat);
      const lng = Number(currentEmergency.longitude ?? currentEmergency.location?.lng);
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    // Return null — MapView will show a neutral no-location placeholder
    return null;
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

  // Evidence analysis breakdown
  const evidenceAnalysis = useMemo(() => {
    const list = mediaList || [];
    let photos = 0;
    let videos = 0;
    list.forEach((m) => {
      const type = (m.media_type || m.type || '').toLowerCase();
      if (type.includes('video')) {
        videos++;
      } else {
        photos++;
      }
    });

    const desc = (currentEmergency?.description || '').toLowerCase();
    const isUnsafeExemption =
      desc.includes('safety hazard') ||
      desc.includes('cannot safely capture') ||
      desc.includes('evidence exemption') ||
      desc.includes('unsafe to record');

    return {
      total: list.length,
      photos,
      videos,
      hasEvidence: list.length > 0,
      isUnsafeExemption,
    };
  }, [mediaList, currentEmergency]);

  // Hindsight memory state checks
  const hasMemoryContext = useMemo(() => {
    if (!memoryContext || memoryContext.available === false) {
      return Boolean(activeAI?.hindsight_memory?.summary);
    }
    return Boolean(
      memoryContext.summary ||
      (Array.isArray(memoryContext.memories) && memoryContext.memories.length > 0) ||
      memoryContext.contextText ||
      (Array.isArray(memoryContext.facts) && memoryContext.facts.length > 0)
    );
  }, [memoryContext, activeAI]);

  const memorySummaryText = useMemo(() => {
    if (memoryContext?.summary) return memoryContext.summary;
    if (memoryContext?.memories?.[0]) {
      return typeof memoryContext.memories[0] === 'string'
        ? memoryContext.memories[0]
        : memoryContext.memories[0].text || memoryContext.memories[0].summary;
    }
    if (memoryContext?.contextText) return memoryContext.contextText;
    if (activeAI?.hindsight_memory?.summary) return activeAI.hindsight_memory.summary;
    return null;
  }, [memoryContext, activeAI]);

  const memoryRecommendationText = useMemo(() => {
    if (memoryContext?.recommendation) return memoryContext.recommendation;
    if (memoryContext?.facts?.[0]) return memoryContext.facts[0];
    if (activeAI?.hindsight_memory?.lesson) return activeAI.hindsight_memory.lesson;
    return 'Prior incident protocols indicate deploying coordinated medical and security units simultaneously.';
  }, [memoryContext, activeAI]);

  const currentStatus = (currentEmergency?.status || '').toUpperCase();
  const canVerify = currentStatus === 'REPORTED' || currentStatus === 'ANALYZING';
  const canResolve = currentStatus !== 'RESOLVED' && currentStatus !== '';

  return (
    <AppLayout
      title="Command Center"
      subtitle="Monitor incidents and coordinate emergency response"
    >
      <div className="cc-container">
        {/* =====================================================
            1. HEADER / COMMAND BAR
            ===================================================== */}
        <section className="cc-header-panel" aria-label="Command Center Command Bar">
          <div className="cc-header-titles">
            <div className="cc-title-row">
              <div className="cc-title-icon" aria-hidden="true">
                <i className="bi bi-shield-shaded"></i>
              </div>
              <div>
                <h1 className="cc-main-title">Command Center</h1>
                <p className="cc-subtitle">
                  Monitor incidents and coordinate emergency response
                </p>
              </div>
            </div>
          </div>

          <div className="cc-header-actions">
            {/* System Status Indicator */}
            <div className="cc-status-badge" role="status" aria-label="System status online">
              <span className="cc-pulse-dot" aria-hidden="true"></span>
              <span>System Online</span>
            </div>

            {/* Coordinator Role Badge */}
            <div className="cc-role-tag" title="Active Session Role">
              <i className="bi bi-person-badge-fill" aria-hidden="true"></i>
              <span>{currentUser?.name || 'Coordinator'}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              className="cc-btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              aria-label="Refresh telemetry and incidents"
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

        {/* Global Loading State if no data yet */}
        {loading && emergencies.length === 0 ? (
          <div className="cc-state-container" role="status">
            <div className="spinner-border text-primary mb-3" style={{ width: '42px', height: '42px' }}>
              <span className="visually-hidden">Loading emergency operations...</span>
            </div>
            <div className="cc-state-title">Loading emergency operations...</div>
            <div className="cc-state-sub">Fetching telemetry, active incidents, and responder positions.</div>
          </div>
        ) : error && emergencies.length === 0 ? (
          <div className="cc-state-container cc-state-error" role="alert">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-2"></i>
            <div className="cc-state-title">Telemetry Connection Error</div>
            <div className="cc-state-sub">{error || 'Unable to establish connection to emergency dispatch server.'}</div>
            <button type="button" className="cc-btn-refresh mt-3" onClick={handleRefresh}>
              <i className="bi bi-arrow-clockwise me-1"></i> Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* =====================================================
                2. KPI AREA (4-Card Row using REAL existing data)
                ===================================================== */}
            <section className="cc-kpi-grid" aria-label="Key Performance Indicators">
              {/* Card 1: Active Emergencies */}
              <div className="cc-kpi-card cc-kpi-accent-red">
                <div className="cc-kpi-info">
                  <div className="cc-kpi-value">{kpiData.active}</div>
                  <div className="cc-kpi-label">Active Emergencies</div>
                </div>
                <div className="cc-kpi-icon-wrap kpi-icon-red" aria-hidden="true">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                </div>
              </div>

              {/* Card 2: High Priority */}
              <div className="cc-kpi-card cc-kpi-accent-orange">
                <div className="cc-kpi-info">
                  <div className="cc-kpi-value">{kpiData.highPriority}</div>
                  <div className="cc-kpi-label">High Priority</div>
                </div>
                <div className="cc-kpi-icon-wrap kpi-icon-orange" aria-hidden="true">
                  <i className="bi bi-lightning-charge-fill"></i>
                </div>
              </div>

              {/* Card 3: Responders En Route */}
              <div className="cc-kpi-card cc-kpi-accent-green">
                <div className="cc-kpi-info">
                  <div className="cc-kpi-value">{kpiData.respondersEnRoute}</div>
                  <div className="cc-kpi-label">Responders En Route</div>
                </div>
                <div className="cc-kpi-icon-wrap kpi-icon-green" aria-hidden="true">
                  <i className="bi bi-truck-front-fill"></i>
                </div>
              </div>

              {/* Card 4: Awaiting Dispatch */}
              <div className="cc-kpi-card cc-kpi-accent-blue">
                <div className="cc-kpi-info">
                  <div className="cc-kpi-value">{kpiData.awaitingDispatch}</div>
                  <div className="cc-kpi-label">Awaiting Dispatch</div>
                </div>
                <div className="cc-kpi-icon-wrap kpi-icon-blue" aria-hidden="true">
                  <i className="bi bi-hourglass-split"></i>
                </div>
              </div>
            </section>

            {/* =====================================================
                3. MAIN OPERATIONS AREA (Two Columns: Live Map | Active Queue)
                ===================================================== */}
            <section className="cc-main-grid" aria-label="Incident Management Map and Active Queue">
              {/* LEFT: Live Incident Map */}
              <div className="cc-panel-card">
                <div className="cc-panel-header">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true"></i>
                    <h2 className="cc-panel-title m-0">Live Incident Map</h2>
                    <span className="cc-live-badge" title="Telemetry Feed Live">
                      <span className="cc-live-dot" aria-hidden="true"></span>
                      <span>LIVE</span>
                    </span>
                    {currentEmergency && (
                      <span className="badge bg-secondary ms-1 d-none d-sm-inline-block" style={{ fontSize: '11px' }}>
                        #{currentEmergency.emergency_code || currentEmergency.id}
                      </span>
                    )}
                  </div>

                  <div className="cc-filter-row">
                    <button
                      type="button"
                      className={`cc-filter-chip ${filterPriority === 'ALL' ? 'active' : ''}`}
                      onClick={() => setFilterPriority('ALL')}
                      aria-label="Show all active incidents"
                    >
                      All ({activeEmergencies.length})
                    </button>
                    <button
                      type="button"
                      className={`cc-filter-chip ${filterPriority === 'CRITICAL' ? 'active' : ''}`}
                      onClick={() => setFilterPriority('CRITICAL')}
                      aria-label="Filter critical incidents"
                    >
                      Critical
                    </button>
                    <button
                      type="button"
                      className={`cc-filter-chip ${filterPriority === 'HIGH' ? 'active' : ''}`}
                      onClick={() => setFilterPriority('HIGH')}
                      aria-label="Filter high priority incidents"
                    >
                      High
                    </button>
                  </div>
                </div>

                <div className="cc-map-wrapper">
                  <MapView markers={mapMarkers} center={mapCenter} height={460} />
                </div>

                <div className="cc-map-legend" aria-label="Map Legend">
                  <span className="legend-tag">🚨 Incident</span>
                  <span className="legend-tag">🚑 Ambulance</span>
                  <span className="legend-tag">👮 Police</span>
                  <span className="legend-tag">🚒 Fire</span>
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
                    {filteredIncidents.length} of {activeEmergencies.length} ACTIVE
                  </span>
                </div>

                <div className="cc-panel-body">
                  {/* Search and filter input */}
                  <div className="cc-search-box">
                    <i className="bi bi-search" aria-hidden="true"></i>
                    <input
                      type="text"
                      className="cc-search-field"
                      placeholder="Filter by code, type, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Filter active incidents"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-secondary p-0 text-decoration-none"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear filter"
                      >
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    )}
                  </div>

                  {/* Incidents Queue List */}
                  <div className="cc-queue-scroll" role="region" aria-label="Active Incidents List">
                    {filteredIncidents.length === 0 ? (
                      <div className="cc-empty-state">
                        <i className="bi bi-shield-check text-success fs-3 mb-2"></i>
                        <div className="fw-semibold" style={{ color: 'var(--text-primary)' }}>No active incidents matching criteria</div>
                        <div className="text-secondary small mt-1">Adjust search filter or select another priority level.</div>
                      </div>
                    ) : (
                      filteredIncidents.map((incident) => {
                        const code = incident.emergency_code || incident.id;
                        const isSelected = String(effectiveSelectedCode) === String(code);
                        const mediaCount = Array.isArray(incident.media) ? incident.media.length : 0;
                        const prio = (incident.priority || '').toUpperCase();
                        const isHighPriority = prio === 'CRITICAL' || prio === 'HIGH';

                        return (
                          <div
                            key={incident.id}
                            className={`cc-queue-item ${isSelected ? 'selected' : ''} ${isHighPriority ? 'prio-high' : ''}`}
                            onClick={() => handleSelectIncident(incident)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectIncident(incident)}
                            aria-selected={isSelected}
                            aria-label={`Incident #${code} ${incident.type || 'Emergency'}`}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                              <div className="d-flex align-items-center gap-2 text-truncate">
                                <i className={`bi ${getIncidentIcon(incident.type)} fs-6`} aria-hidden="true"></i>
                                <span className="cc-incident-code">#{code}</span>
                                <span className="cc-incident-type-label text-truncate">{incident.type || 'Emergency'}</span>
                              </div>
                              <div className="d-flex gap-1 flex-shrink-0">
                                {incident.priority && <PriorityBadge priority={incident.priority} />}
                                {incident.status && <StatusBadge status={incident.status} />}
                              </div>
                            </div>

                            <p className="cc-queue-desc">{incident.description}</p>

                            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 mt-2 gap-2">
                              <span className="text-secondary small text-truncate" style={{ maxWidth: '60%' }}>
                                <i className="bi bi-geo-alt text-danger me-1"></i>
                                {incident.location_text || incident.location?.address || 'Location registered'}
                              </span>

                              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                {mediaCount > 0 ? (
                                  <span className="cc-evidence-pill" title={`${mediaCount} evidence file(s) attached`}>
                                    <i className="bi bi-camera-fill me-1" aria-hidden="true"></i>
                                    {mediaCount}
                                  </span>
                                ) : (
                                  <span className="cc-evidence-pill cc-evidence-pill-none" title="No evidence attached">
                                    <i className="bi bi-camera-video-off me-1" aria-hidden="true"></i>
                                    0
                                  </span>
                                )}
                                <span className="text-muted small">
                                  {formatTime(incident.created_at || incident.createdAt)}
                                </span>
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
                4. SELECTED INCIDENT PANEL (Unified Panel Below Map/Queue)
                ===================================================== */}
            {currentEmergency ? (
              <section className="cc-selected-incident-section" aria-label="Selected Incident Operations">
                <div className="cc-incident-details-shell">
                  {/* Panel Header */}
                  <div className="cc-details-header">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span className="cc-detail-ref">
                            Incident #{currentEmergency.emergency_code || currentEmergency.id}
                          </span>
                          <h2 className="cc-detail-title m-0">{currentEmergency.type || 'Emergency'}</h2>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                          {currentEmergency.severity && <SeverityBadge severity={currentEmergency.severity} />}
                          <PriorityBadge priority={currentEmergency.priority} />
                          <StatusBadge status={currentEmergency.status} />
                          <span className="text-secondary small ms-2">
                            <i className="bi bi-clock me-1"></i>
                            Reported {formatTime(currentEmergency.created_at || currentEmergency.createdAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="cc-btn-full-details"
                        onClick={(e) => handleOpenDetailsPage(currentEmergency, e)}
                        aria-label="Open full incident record page"
                      >
                        <span>Full Incident Record</span>
                        <i className="bi bi-box-arrow-up-right ms-1"></i>
                      </button>
                    </div>

                    {/* Location and Description */}
                    <div className="cc-details-summary-row mt-3">
                      <div className="cc-summary-item">
                        <span className="cc-summary-label">
                          <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                          Location
                        </span>
                        <span className="cc-summary-val">
                          {currentEmergency.location_text || currentEmergency.location?.address || 'Location registered'}
                          {currentEmergency.latitude && currentEmergency.longitude && (
                            <span className="text-secondary small ms-2">
                              ({Number(currentEmergency.latitude).toFixed(4)}, {Number(currentEmergency.longitude).toFixed(4)})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="cc-summary-item">
                        <span className="cc-summary-label">
                          <i className="bi bi-chat-left-text-fill text-info me-1"></i>
                          Description
                        </span>
                        <span className="cc-summary-val">{currentEmergency.description || 'No detailed narrative provided.'}</span>
                      </div>
                    </div>

                    {/* Photo / Video Evidence Section */}
                    <div className="cc-evidence-banner mt-3">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-camera-reels-fill text-info" aria-hidden="true"></i>
                          <span className="cc-evidence-title">PHOTO / VIDEO EVIDENCE</span>
                        </div>

                        {evidenceAnalysis.hasEvidence ? (
                          <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-40" style={{ fontSize: '11px', fontWeight: 700 }}>
                            <i className="bi bi-check-circle-fill me-1"></i>
                            Evidence Available
                          </span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-15 text-warning border border-warning border-opacity-30" style={{ fontSize: '11px', fontWeight: 700 }}>
                            <i className="bi bi-shield-exclamation me-1"></i>
                            Not Safely Available
                          </span>
                        )}
                      </div>

                      <div className="cc-evidence-body">
                        {evidenceAnalysis.hasEvidence ? (
                          <div className="cc-evidence-stats-row">
                            <div className="cc-evidence-stat-pill">
                              <i className="bi bi-camera-fill me-1 text-info"></i>
                              <span>{evidenceAnalysis.photos} Photo{evidenceAnalysis.photos !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="cc-evidence-stat-pill">
                              <i className="bi bi-camera-video-fill me-1 text-info"></i>
                              <span>{evidenceAnalysis.videos} Video{evidenceAnalysis.videos !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="cc-evidence-stat-pill cc-evidence-stat-total">
                              <i className="bi bi-folder-check me-1 text-success"></i>
                              <span>{evidenceAnalysis.total} Total file{evidenceAnalysis.total !== 1 ? 's' : ''} on record</span>
                            </div>
                          </div>
                        ) : (
                          <div className="cc-evidence-unsafe-note">
                            <i className="bi bi-info-circle-fill text-warning me-2"></i>
                            <span>
                              {evidenceAnalysis.isUnsafeExemption
                                ? 'Citizen reported not safely available due to immediate hazard conditions at the scene.'
                                : 'No photo or video evidence was captured at the time of report submission.'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operations Grid: AI Support & Hindsight | Human Review & Responders */}
                  <div className="cc-ops-grid">
                    {/* LEFT COLUMN: AI Support & Hindsight */}
                    <div className="cc-ops-column cc-ops-column-left">
                      {/* 5. AI DECISION SUPPORT */}
                      <div className="cc-ops-card cc-ai-card">
                        <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-cpu-fill text-info fs-5" aria-hidden="true"></i>
                            <h3 className="m-0 fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>AI Decision Support</h3>
                          </div>
                          <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25" style={{ fontSize: '11px' }}>
                            Advisory
                          </span>
                        </div>

                        <div className="cc-ops-card-body">
                          {activeAI ? (
                            <>
                              {/* Metadata Overview */}
                              <div className="cc-ai-meta-grid mb-3">
                                <div className="cc-ai-meta-item">
                                  <span className="cc-meta-k">Category</span>
                                  <span className="cc-meta-v">{activeAI.category || currentEmergency.type || 'Standard'}</span>
                                </div>
                                <div className="cc-ai-meta-item">
                                  <span className="cc-meta-k">Severity</span>
                                  <span className="cc-meta-v">{activeAI.severity || currentEmergency.severity || 'Moderate'}</span>
                                </div>
                                <div className="cc-ai-meta-item">
                                  <span className="cc-meta-k">Priority</span>
                                  <span className="cc-meta-v">{activeAI.priority || currentEmergency.priority || 'Standard'}</span>
                                </div>
                              </div>

                              {/* Reasoning / Key Signals */}
                              <div className="cc-ai-block mb-3">
                                <div className="cc-block-label">
                                  <i className="bi bi-card-text me-1 text-info"></i>
                                  Reasoning & Key Signals
                                </div>
                                <p className="cc-ai-text m-0">
                                  {activeAI.reasoning || activeAI.summary || `${activeAI.category || currentEmergency.type} incident triaged as ${activeAI.priority || 'standard'} priority response.`}
                                </p>
                              </div>

                              {/* Recommended Responders */}
                              <div className="cc-ai-block mb-3">
                                <div className="cc-block-label">
                                  <i className="bi bi-signpost-split-fill me-1 text-primary"></i>
                                  Recommended Responders
                                </div>
                                <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                                  {recommendedResponders.map((r) => (
                                    <span key={r} className="cc-rec-pill">
                                      <i className="bi bi-check-circle-fill text-info me-1"></i>
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="cc-empty-memory-state py-3">
                              <div className="spinner-border spinner-border-sm text-info mb-2" role="status"></div>
                              <p className="m-0 text-secondary small">
                                AI triage analysis is processing for this incident.
                              </p>
                            </div>
                          )}

                          {/* Mandatory Visible Human-in-the-loop notice */}
                          <div className="cc-hitl-note mt-3">
                            <i className="bi bi-shield-check text-success fs-5 me-2 flex-shrink-0"></i>
                            <span>AI provides decision support. Final action is taken by the human coordinator.</span>
                          </div>
                        </div>
                      </div>

                      {/* 6. HINDSIGHT MEMORY */}
                      <div className="cc-ops-card cc-hindsight-card mt-3">
                        <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-clock-history text-info fs-5" aria-hidden="true"></i>
                            <h3 className="m-0 fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>Hindsight Memory</h3>
                          </div>
                          {hasMemoryContext && (
                            <span className="badge bg-secondary text-light border border-secondary border-opacity-50" style={{ fontSize: '11px' }}>
                              <i className="bi bi-database me-1"></i>
                              {memoryContext?.memoryCount || (memoryContext?.memories?.length || 1)} Incident Record{((memoryContext?.memoryCount || memoryContext?.memories?.length || 1) !== 1) ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="cc-ops-card-body">
                          {hasMemoryContext && memorySummaryText ? (
                            <>
                              {/* Previous Incident Context */}
                              <div className="cc-memory-block mb-3">
                                <div className="cc-block-label">
                                  <i className="bi bi-clock-history me-1 text-info"></i>
                                  Relevant Previous Incident Context
                                </div>
                                <div className="cc-block-content">
                                  {memorySummaryText}
                                </div>
                              </div>

                              {/* Operational Lesson / Recommendation */}
                              <div className="cc-memory-block">
                                <div className="cc-block-label">
                                  <i className="bi bi-lightbulb-fill me-1 text-warning"></i>
                                  Operational Recommendation
                                </div>
                                <div className="cc-block-content">
                                  {memoryRecommendationText}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="cc-empty-memory-state">
                              <i className="bi bi-archive text-secondary fs-4 mb-2"></i>
                              <p className="m-0 text-secondary small">
                                No relevant previous incident context available.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Human Coordinator Review & Responders */}
                    <div className="cc-ops-column cc-ops-column-right">
                      {/* 7. HUMAN COORDINATOR REVIEW */}
                      <div className="cc-ops-card cc-human-review-card">
                        <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-person-check-fill text-success fs-5" aria-hidden="true"></i>
                            <h3 className="m-0 fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>Human Coordinator Review</h3>
                          </div>
                          <span className="badge bg-success bg-opacity-15 text-success border border-success border-opacity-30" style={{ fontSize: '11px', fontWeight: 700 }}>
                            Coordinator In Command
                          </span>
                        </div>

                        <div className="cc-ops-card-body">
                          {/* Coordinator decision note */}
                          <div className="cc-coordinator-directive-banner mb-3">
                            <i className="bi bi-exclamation-circle-fill text-warning me-2"></i>
                            <span>Coordinator decision required before dispatch.</span>
                          </div>

                          {/* Action Buttons: Verification & Resolution */}
                          {(canVerify || canResolve) && (
                            <div className="cc-coordinator-quick-actions mb-3">
                              {canVerify && (
                                <button
                                  type="button"
                                  className="cc-btn-action cc-btn-verify"
                                  onClick={handleVerifyIncident}
                                  disabled={actionLoading}
                                  aria-label="Verify Incident"
                                >
                                  <i className="bi bi-patch-check-fill me-1"></i>
                                  <span>Verify Incident</span>
                                </button>
                              )}

                              {canResolve && (
                                <button
                                  type="button"
                                  className="cc-btn-action cc-btn-resolve"
                                  onClick={handleResolveIncident}
                                  disabled={actionLoading}
                                  aria-label="Mark Incident Resolved"
                                >
                                  <i className="bi bi-check2-circle me-1"></i>
                                  <span>Mark Resolved</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Dispatch Controls for Recommended Responders */}
                          <div className="cc-dispatch-section">
                            <div className="cc-block-label mb-2">
                              <i className="bi bi-send-fill text-primary me-1"></i>
                              Dispatch Responder Units
                            </div>
                            <div className="cc-dispatch-list">
                              {recommendedResponders.map((responderName) => {
                                const isDispatched = isResponderDispatched(responderName);
                                const isProcessing = dispatching[responderName];
                                const meta = getResponderMeta(responderName);

                                return (
                                  <div key={responderName} className="cc-dispatch-row">
                                    <div className="d-flex align-items-center gap-3">
                                      <span className="cc-responder-emoji" aria-hidden="true">{meta.emoji}</span>
                                      <div>
                                        <div className="fw-bold small" style={{ color: 'var(--text-primary)' }}>{responderName}</div>
                                        <div className="text-secondary" style={{ fontSize: '11px' }}>{meta.label}</div>
                                      </div>
                                    </div>

                                    <div>
                                      {isDispatched ? (
                                        <span className="cc-dispatched-pill" role="status">
                                          <i className="bi bi-check-circle-fill me-1 text-success"></i> Dispatched
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="cc-btn-dispatch"
                                          onClick={() => handleDispatchResponder(responderName)}
                                          disabled={isProcessing || actionLoading}
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
                          </div>
                        </div>
                      </div>

                      {/* 8. RESPONDER SECTION */}
                      <div className="cc-ops-card cc-responders-card mt-3">
                        <div className="cc-ops-card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-truck-front-fill text-info fs-5" aria-hidden="true"></i>
                            <h3 className="m-0 fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>Deployed Responders</h3>
                          </div>
                          <span className="badge bg-dark border border-secondary text-secondary" style={{ fontSize: '11px' }}>
                            {assignedResponders.length} Active Unit{assignedResponders.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="cc-ops-card-body">
                          {assignedResponders.length > 0 ? (
                            <div className="cc-responder-list">
                              {assignedResponders.map((responder, idx) => {
                                const type = responder.type || responder.name || 'Responder';
                                const meta = getResponderMeta(type);
                                const status = responder.status || 'DISPATCHED';

                                return (
                                  <div key={idx} className="cc-responder-row">
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="cc-responder-row-emoji">{meta.emoji}</span>
                                      <div>
                                        <div className="fw-semibold small" style={{ color: 'var(--text-primary)' }}>
                                          {responder.name || responder.type || `Unit #${idx + 1}`}
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: '11px' }}>
                                          {responder.type || 'Emergency Unit'}
                                          {responder.eta ? ` • ETA: ${responder.eta}` : responder.dispatched_at ? ` • Dispatched: ${formatTime(responder.dispatched_at)}` : ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <StatusBadge status={status} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="cc-empty-memory-state py-3">
                              <i className="bi bi-truck text-secondary fs-4 mb-2"></i>
                              <p className="m-0 text-secondary small">
                                No responders deployed yet. Authorize dispatch above to assign emergency units.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  );
}
