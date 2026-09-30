import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PriorityBadge, SeverityBadge, StatusBadge } from '../components/Badges';
import { MapView } from '../components/MapView';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { switchRole } = useApp();
  const [activeScenario, setActiveScenario] = useState('Medical');

  const handleRoleSelect = (role, path) => {
    switchRole(role);
    navigate(path);
  };

  const handleReportEmergency = () => {
    switchRole('citizen');
    navigate('/citizen/report');
  };

  const handleOpenCommandCenter = () => {
    switchRole('coordinator');
    navigate('/coordinator');
  };

  // Preview mock data for command center interactive section (strictly realistic, no fake stats)
  const previewMarkers = [
    {
      lat: 28.6139,
      lng: 77.2090,
      type: 'emergency',
      label: '#ER-8429: Active Incident',
    },
    {
      lat: 28.6190,
      lng: 77.2140,
      type: 'ambulance',
      label: 'Ambulance Unit 04',
      status: 'En Route',
      eta: '4 mins',
    },
    {
      lat: 28.6095,
      lng: 77.2045,
      type: 'police',
      label: 'Police Patrol 12',
      status: 'Dispatched',
      eta: '6 mins',
    },
  ];

  return (
    <div className="landing-container">
      {/* Top Tactical Sticky Navigation */}
      <header className="landing-top-bar" role="banner">
        <div className="container">
          <div className="landing-nav-inner">
            <div
              className="landing-brand"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Emergency Response Coordinator Home"
            >
              <div className="landing-brand-badge" aria-hidden="true">
                <i className="bi bi-broadcast"></i>
              </div>
              <div className="landing-brand-text">
                <span className="landing-brand-title">Emergency Response</span>
                <span className="landing-brand-subtitle">Coordinator</span>
              </div>
            </div>

            <nav className="landing-nav-links" aria-label="Main Navigation">
              <a href="#how-it-works" className="landing-nav-link">Workflow</a>
              <a href="#ai-memory" className="landing-nav-link">Memory & AI</a>
              <a href="#command-center" className="landing-nav-link">Command Center</a>
              <a href="#scenarios" className="landing-nav-link">Scenarios</a>
              <a href="#roles-portal" className="landing-nav-link">Roles</a>
            </nav>

            <div className="landing-nav-actions">
              <div className="status-indicator-pill" title="Operational Readiness">
                <span className="status-dot-pulse" aria-hidden="true"></span>
                <span>Response Network Ready</span>
              </div>

              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={handleReportEmergency}
                aria-label="Report emergency incident"
              >
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>Report Incident</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-content">
        {/* =====================================================
            1. HERO SECTION & LIVE STATUS INDICATOR
            ===================================================== */}
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="container">
            <div className="row align-items-center g-5">
              {/* Left Column: Value Proposition & CTAs */}
              <div className="col-lg-6">
                <div className="hero-badge-tag" role="status">
                  <span className="status-dot-pulse" aria-hidden="true"></span>
                  <span>AI-Powered Emergency Coordination</span>
                </div>

                <h1 id="hero-title" className="hero-main-title">
                  Emergency Response
                  <br />
                  <span className="hero-accent-text">Coordinator</span>
                </h1>

                <p className="hero-description">
                  Analyze emergencies, recall relevant experience, and coordinate responders from one intelligent command center.
                </p>

                <div className="hero-cta-group">
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={handleReportEmergency}
                    aria-label="Report an Emergency"
                  >
                    <i className="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>
                    <span>Report an Emergency</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={handleOpenCommandCenter}
                    aria-label="Open Command Center"
                  >
                    <i className="bi bi-speedometer2" aria-hidden="true"></i>
                    <span>Open Command Center</span>
                  </button>
                </div>

                <div className="hero-trust-line">
                  <i className="bi bi-shield-check" aria-hidden="true"></i>
                  <span>AI decision support • Persistent memory • Human-in-the-loop</span>
                </div>
              </div>

              {/* Right Column: Visual Command Center Cockpit Preview */}
              <div className="col-lg-6">
                <div className="hero-hud-card" aria-label="Incident Triage Preview">
                  <div className="hud-header">
                    <div className="hud-header-left">
                      <div className="hud-terminal-dots" aria-hidden="true">
                        <span className="dot-red"></span>
                        <span className="dot-yellow"></span>
                        <span className="dot-green"></span>
                      </div>
                      <span className="hud-title">Incident Feed — Live Dispatch</span>
                    </div>
                    <span className="status-indicator-pill" style={{ padding: '3px 8px', fontSize: '10.5px' }}>
                      <span className="status-dot-pulse" aria-hidden="true"></span>
                      System Ready
                    </span>
                  </div>

                  <div className="hud-body">
                    {/* Active Incident Header */}
                    <div className="hud-incident-card">
                      <div className="hud-incident-meta">
                        <div>
                          <span className="hud-incident-code">INCIDENT #ER-8429</span>
                          <h4 className="hud-incident-name">Road Accident (Multi-Vehicle)</h4>
                        </div>
                        <div className="hud-badges-row">
                          <PriorityBadge priority="HIGH" />
                          <StatusBadge status="RESPONDERS_EN_ROUTE" />
                        </div>
                      </div>

                      <div className="hud-location-text">
                        <i className="bi bi-geo-alt-fill text-danger" aria-hidden="true"></i>
                        <span>MG Road Junction • Central Corridor Sector 4</span>
                      </div>
                    </div>

                    {/* Schematic City Map Radar Preview */}
                    <div className="hud-map-preview" aria-label="City Map Visualization">
                      <div className="hud-map-grid-bg"></div>
                      <div className="hud-map-radar-ring" aria-hidden="true"></div>

                      <div className="hud-map-marker-incident" title="Incident Location">
                        <div className="hud-incident-pin">
                          <i className="bi bi-exclamation-triangle-fill"></i>
                        </div>
                      </div>

                      <div className="hud-map-marker-responder responder-node-1">
                        <i className="bi bi-truck-front-fill"></i>
                        <span>AMB-04 (4m)</span>
                      </div>

                      <div className="hud-map-marker-responder responder-node-2">
                        <i className="bi bi-shield-fill"></i>
                        <span>POL-12 (6m)</span>
                      </div>
                    </div>

                    {/* AI Analysis & Episodic Memory Panel */}
                    <div className="hud-ai-panel">
                      <div className="hud-ai-title-row">
                        <div className="hud-ai-label">
                          <i className="bi bi-cpu-fill" aria-hidden="true"></i>
                          <span>AI Decision Support</span>
                        </div>
                        <span className="hud-ai-confidence">Confidence: 94%</span>
                      </div>

                      <p className="hud-ai-summary">
                        Severity assessed as <strong>Serious</strong>. Immediate medical response and traffic containment advised.
                      </p>

                      <div className="hud-memory-recall-chip">
                        <i className="bi bi-layers-half" aria-hidden="true"></i>
                        <div>
                          <strong>Hindsight Memory Recall:</strong> Prior incident <em>ER-7914</em> noted eastbound bottleneck. Recommended alternate arterial access.
                        </div>
                      </div>
                    </div>

                    {/* Responder Status Pills */}
                    <div className="hud-responders-status">
                      <div className="hud-unit-pill">
                        <span className="hud-unit-name">Ambulance 04</span>
                        <span className="hud-unit-state state-enroute">En Route (4m)</span>
                      </div>
                      <div className="hud-unit-pill">
                        <span className="hud-unit-name">Police Patrol 12</span>
                        <span className="hud-unit-state state-dispatch">Dispatched</span>
                      </div>
                      <div className="hud-unit-pill">
                        <span className="hud-unit-name">Helper 09</span>
                        <span className="hud-unit-state state-enroute">Accepted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            2. CORE VALUE SECTION
            ===================================================== */}
        <section className="core-values-section" aria-labelledby="core-values-title">
          <div className="container">
            <div className="section-header-wrap">
              <span className="section-label">Integrated Operational Architecture</span>
              <h2 id="core-values-title" className="section-heading">
                From Emergency Report to Coordinated Response
              </h2>
              <p className="section-subtext">
                Emergency Response Coordinator combines AI analysis, persistent memory, interactive mapping, and human decision-making into a single response workflow.
              </p>
            </div>

            <div className="row g-4">
              {/* Card 1: AI Analysis */}
              <div className="col-md-6 col-lg-3">
                <div className="feature-grid-card">
                  <div className="feature-icon-wrapper icon-ai" aria-hidden="true">
                    <i className="bi bi-cpu-fill"></i>
                  </div>
                  <h3 className="feature-title">AI Analysis</h3>
                  <p className="feature-desc">
                    Analyze emergency descriptions and identify type, severity, priority, recommended responders, confidence, and reasoning.
                  </p>
                </div>
              </div>

              {/* Card 2: Persistent Memory */}
              <div className="col-md-6 col-lg-3">
                <div className="feature-grid-card">
                  <div className="feature-icon-wrapper icon-memory" aria-hidden="true">
                    <i className="bi bi-database-fill-gear"></i>
                  </div>
                  <h3 className="feature-title">Persistent Memory</h3>
                  <p className="feature-desc">
                    Recall relevant experience from previous incidents and provide additional context for current situations.
                  </p>
                </div>
              </div>

              {/* Card 3: Command Center */}
              <div className="col-md-6 col-lg-3">
                <div className="feature-grid-card">
                  <div className="feature-icon-wrapper icon-command" aria-hidden="true">
                    <i className="bi bi-speedometer2"></i>
                  </div>
                  <h3 className="feature-title">Command Center</h3>
                  <p className="feature-desc">
                    Monitor incidents, locations, responders, and response status from a centralized interface.
                  </p>
                </div>
              </div>

              {/* Card 4: Human Decision */}
              <div className="col-md-6 col-lg-3">
                <div className="feature-grid-card">
                  <div className="feature-icon-wrapper icon-human" aria-hidden="true">
                    <i className="bi bi-person-check-fill"></i>
                  </div>
                  <h3 className="feature-title">Human Decision</h3>
                  <p className="feature-desc">
                    AI provides decision support while the human coordinator remains responsible for final response decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            3. WORKFLOW SECTION
            ===================================================== */}
        <section id="how-it-works" className="workflow-section" aria-labelledby="workflow-title">
          <div className="container">
            <div className="section-header-wrap">
              <span className="section-label">End-to-End Incident Lifecycle</span>
              <h2 id="workflow-title" className="section-heading">How It Works</h2>
              <p className="section-subtext">
                A seamless pipeline connecting civilian distress reporting, automated cognitive assessment, and dispatch execution.
              </p>
            </div>

            <div className="workflow-track">
              {/* Step 01 */}
              <div className="workflow-step-node">
                <span className="workflow-number">01</span>
                <h4 className="workflow-step-title">REPORT</h4>
                <p className="workflow-step-desc">Citizen reports an emergency</p>
              </div>

              {/* Step 02 */}
              <div className="workflow-step-node">
                <span className="workflow-number">02</span>
                <h4 className="workflow-step-title">ANALYZE</h4>
                <p className="workflow-step-desc">AI analyzes the incident</p>
              </div>

              {/* Step 03 */}
              <div className="workflow-step-node">
                <span className="workflow-number">03</span>
                <h4 className="workflow-step-title">RECALL</h4>
                <p className="workflow-step-desc">Relevant previous experience is retrieved</p>
              </div>

              {/* Step 04 */}
              <div className="workflow-step-node">
                <span className="workflow-number">04</span>
                <h4 className="workflow-step-title">COORDINATE</h4>
                <p className="workflow-step-desc">Coordinator reviews the situation</p>
              </div>

              {/* Step 05 */}
              <div className="workflow-step-node">
                <span className="workflow-number">05</span>
                <h4 className="workflow-step-title">RESPOND</h4>
                <p className="workflow-step-desc">Responders are dispatched</p>
              </div>

              {/* Step 06 */}
              <div className="workflow-step-node">
                <span className="workflow-number">06</span>
                <h4 className="workflow-step-title">LEARN</h4>
                <p className="workflow-step-desc">Incident experience can inform future context</p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            4. AI + MEMORY SECTION (Key Differentiator)
            ===================================================== */}
        <section id="ai-memory" className="ai-memory-section" aria-labelledby="ai-memory-title">
          <div className="container">
            <div className="section-header-wrap">
              <span className="section-label">Cognitive Triage Intelligence</span>
              <h2 id="ai-memory-title" className="section-heading">
                AI That Can Learn From Experience
              </h2>
              <p className="section-subtext">
                Current AI analysis becomes more useful when relevant experience from previous incidents can be recalled as context.
              </p>
            </div>

            <div className="comparison-diagram-card">
              <div className="diagram-row">
                {/* Column A: Current Incident */}
                <div className="diagram-box">
                  <span className="diagram-box-header">Live Telemetry</span>
                  <div className="diagram-box-title">
                    <i className="bi bi-broadcast text-danger" aria-hidden="true"></i>
                    <span>CURRENT INCIDENT</span>
                  </div>
                  <p className="diagram-box-desc">
                    Real-time description, geographical coordinates, and scene conditions reported by on-site citizens.
                  </p>
                  <div className="mt-3 pt-2 border-top border-secondary text-secondary small">
                    <i className="bi bi-arrow-down-short me-1"></i>
                    Direct Evaluation
                  </div>
                </div>

                <div className="diagram-operator" aria-hidden="true">
                  <span>+</span>
                </div>

                {/* Column B: Episodic Memory */}
                <div className="diagram-box">
                  <span className="diagram-box-header">Historical Retain</span>
                  <div className="diagram-box-title">
                    <i className="bi bi-database-fill-gear text-info" aria-hidden="true"></i>
                    <span>PREVIOUS INCIDENT EXPERIENCE</span>
                  </div>
                  <p className="diagram-box-desc">
                    Hindsight persistent memory recall: past bottlenecks, resource effectiveness, and coordinator override lessons.
                  </p>
                  <div className="mt-3 pt-2 border-top border-secondary text-secondary small">
                    <i className="bi bi-arrow-down-short me-1"></i>
                    Semantic Context
                  </div>
                </div>
              </div>

              <div className="diagram-arrow-down" aria-hidden="true">
                <i className="bi bi-arrow-down"></i>
              </div>

              {/* Result Box */}
              <div className="diagram-result-box">
                <div className="diagram-result-title">
                  CONTEXT-AWARE DECISION SUPPORT
                </div>
                <p className="diagram-result-desc">
                  Google Gemini synthesizes live incident telemetry with Vectorize Hindsight episodic recall to provide structured categorization, responder allocations, and operational warnings.
                </p>
              </div>

              <div className="safety-notice-banner" role="alert">
                <i className="bi bi-info-circle-fill text-warning fs-5" aria-hidden="true"></i>
                <span>
                  <strong>Human-in-the-Loop Principle:</strong> AI supports the coordinator. It does not independently make emergency dispatch decisions.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            5. COMMAND CENTER PREVIEW
            ===================================================== */}
        <section id="command-center" className="command-center-preview-section" aria-labelledby="command-center-title">
          <div className="container">
            <div className="section-header-wrap">
              <span className="section-label">Operations Console</span>
              <h2 id="command-center-title" className="section-heading">
                One Command Center. Every Critical Detail.
              </h2>
              <p className="section-subtext">
                Centralized situational awareness combining live GIS mapping, automated triage evaluations, responder tracking, and response milestones.
              </p>
            </div>

            <div className="dashboard-full-preview">
              <div className="dashboard-top-tab">
                <div className="dashboard-tab-left">
                  <i className="bi bi-display text-primary fs-5" aria-hidden="true"></i>
                  <span>COORDINATOR DASHBOARD • ACTIVE INCIDENT VIEW</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-danger">INCIDENT #ER-8429</span>
                  <span className="badge bg-dark border border-secondary text-light">ZONE: CENTRAL</span>
                </div>
              </div>

              <div className="dashboard-grid-layout">
                {/* Left Panel: Incident Card, Severity/Priority & Timeline */}
                <div className="dashboard-left-panel">
                  <div className="panel-card-box">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-secondary small fw-bold">INCIDENT DETAILS</span>
                      <PriorityBadge priority="HIGH" />
                    </div>
                    <h5 className="text-white fw-bold mb-1">Road Accident</h5>
                    <p className="text-secondary small mb-3">
                      Two-vehicle collision at intersection. Moderate traffic obstruction reported.
                    </p>
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      <SeverityBadge severity="SERIOUS" />
                      <StatusBadge status="DISPATCHED" />
                    </div>
                    <div className="text-secondary small mt-2">
                      <i className="bi bi-geo-alt me-1 text-danger"></i>
                      MG Road & 4th Avenue
                    </div>
                  </div>

                  <div className="panel-card-box">
                    <div className="panel-box-title">
                      <i className="bi bi-clock-history text-info" aria-hidden="true"></i>
                      <span>Response Timeline</span>
                    </div>

                    <ul className="preview-timeline">
                      <li className="preview-timeline-item">
                        <span className="timeline-bullet done"></span>
                        <div className="timeline-event-name">Citizen Reported</div>
                        <div className="timeline-event-time">10:41 AM • Web Portal</div>
                      </li>
                      <li className="preview-timeline-item">
                        <span className="timeline-bullet done"></span>
                        <div className="timeline-event-name">AI Triaged & Analyzed</div>
                        <div className="timeline-event-time">10:41 AM • Google Gemini</div>
                      </li>
                      <li className="preview-timeline-item">
                        <span className="timeline-bullet done"></span>
                        <div className="timeline-event-name">Hindsight Memory Recalled</div>
                        <div className="timeline-event-time">10:41 AM • Episodic Match</div>
                      </li>
                      <li className="preview-timeline-item">
                        <span className="timeline-bullet active"></span>
                        <div className="timeline-event-name">Coordinator Dispatched Units</div>
                        <div className="timeline-event-time">10:42 AM • Human Verified</div>
                      </li>
                      <li className="preview-timeline-item">
                        <span className="timeline-bullet"></span>
                        <div className="timeline-event-name">Scene Arrival & Resolution</div>
                        <div className="timeline-event-time">Pending Responder Updates</div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Panel: Map Preview & Responders List */}
                <div className="dashboard-right-panel">
                  {/* Real Interactive MapView Component */}
                  <div className="panel-card-box p-0 overflow-hidden" style={{ borderRadius: '12px' }}>
                    <div style={{ height: 260, width: '100%' }}>
                      <MapView
                        markers={previewMarkers}
                        center={[28.6139, 77.2090]}
                        height={260}
                      />
                    </div>
                  </div>

                  {/* AI Analysis & Responders Panel */}
                  <div className="row g-3">
                    <div className="col-lg-6">
                      <div className="panel-card-box h-100">
                        <div className="panel-box-title">
                          <i className="bi bi-robot text-primary" aria-hidden="true"></i>
                          <span>AI Decision Support Breakdown</span>
                        </div>
                        <div className="small text-light mb-2">
                          <strong>Triage Reasoning:</strong> High impact collision involving structural damage; immediate advanced life support and lane clearance required.
                        </div>
                        <div className="small text-secondary mb-2">
                          <strong>Key Signals:</strong> Multiple vehicles, road blockage, fuel leakage alert.
                        </div>
                        <div className="small text-info">
                          <strong>Recall Context:</strong> Sector 4 East ramp bottleneck observed in prior case.
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="panel-card-box h-100">
                        <div className="panel-box-title">
                          <i className="bi bi-truck text-success" aria-hidden="true"></i>
                          <span>Assigned Responder Units</span>
                        </div>

                        <table className="responders-mini-table">
                          <thead>
                            <tr>
                              <th>Unit</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>ETA</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fw-bold">AMB-04</td>
                              <td>Ambulance</td>
                              <td><span className="badge bg-success-subtle text-success">En Route</span></td>
                              <td>4 mins</td>
                            </tr>
                            <tr>
                              <td className="fw-bold">POL-12</td>
                              <td>Police Patrol</td>
                              <td><span className="badge bg-warning-subtle text-warning">Dispatched</span></td>
                              <td>6 mins</td>
                            </tr>
                            <tr>
                              <td className="fw-bold">HLP-09</td>
                              <td>Community Helper</td>
                              <td><span className="badge bg-primary-subtle text-primary">Accepted</span></td>
                              <td>On Scene</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                className="btn-secondary-action"
                style={{ padding: '12px 28px', fontSize: '15px' }}
                onClick={handleOpenCommandCenter}
              >
                <i className="bi bi-speedometer2" aria-hidden="true"></i>
                <span>Explore Command Center</span>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            6. EMERGENCY TYPES SECTION
            ===================================================== */}
        <section id="scenarios" className="emergency-types-section" aria-labelledby="scenarios-title">
          <div className="container">
            <div className="section-header-wrap">
              <span className="section-label">Incident Classifications</span>
              <h2 id="scenarios-title" className="section-heading">
                Built for Different Emergency Scenarios
              </h2>
              <p className="section-subtext">
                Configured with specialized triage prompts and agency dispatch recommendations for all standard emergency types.
              </p>
            </div>

            <div className="scenario-cards-grid">
              {/* Medical */}
              <div
                className={`scenario-card ${activeScenario === 'Medical' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Medical')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Medical')}
              >
                <div className="scenario-icon sc-medical" aria-hidden="true">
                  <i className="bi bi-heart-pulse-fill"></i>
                </div>
                <div className="scenario-name">Medical</div>
                <div className="scenario-sub">Cardiac, trauma & critical care</div>
              </div>

              {/* Road Accident */}
              <div
                className={`scenario-card ${activeScenario === 'Road Accident' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Road Accident')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Road Accident')}
              >
                <div className="scenario-icon sc-accident" aria-hidden="true">
                  <i className="bi bi-car-front-fill"></i>
                </div>
                <div className="scenario-name">Road Accident</div>
                <div className="scenario-sub">Collisions, pileups & pile clearing</div>
              </div>

              {/* Fire */}
              <div
                className={`scenario-card ${activeScenario === 'Fire' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Fire')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Fire')}
              >
                <div className="scenario-icon sc-fire" aria-hidden="true">
                  <i className="bi bi-fire"></i>
                </div>
                <div className="scenario-name">Fire</div>
                <div className="scenario-sub">Structural, electrical & hazard fires</div>
              </div>

              {/* Crime / Safety */}
              <div
                className={`scenario-card ${activeScenario === 'Crime / Safety' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Crime / Safety')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Crime / Safety')}
              >
                <div className="scenario-icon sc-crime" aria-hidden="true">
                  <i className="bi bi-shield-exclamation"></i>
                </div>
                <div className="scenario-name">Crime / Safety</div>
                <div className="scenario-sub">Assaults, robberies & perimeter threats</div>
              </div>

              {/* Natural Disaster / Flood */}
              <div
                className={`scenario-card ${activeScenario === 'Natural Disaster / Flood' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Natural Disaster / Flood')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Natural Disaster / Flood')}
              >
                <div className="scenario-icon sc-disaster" aria-hidden="true">
                  <i className="bi bi-cloud-lightning-rain-fill"></i>
                </div>
                <div className="scenario-name">Natural Disaster / Flood</div>
                <div className="scenario-sub">Floods, storms & evacuation events</div>
              </div>

              {/* Other */}
              <div
                className={`scenario-card ${activeScenario === 'Other' ? 'selected' : ''}`}
                onClick={() => setActiveScenario('Other')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveScenario('Other')}
              >
                <div className="scenario-icon sc-other" aria-hidden="true">
                  <i className="bi bi-question-circle-fill"></i>
                </div>
                <div className="scenario-name">Other</div>
                <div className="scenario-sub">Unclassified distress situations</div>
              </div>
            </div>

            {/* Active Scenario Protocol Summary */}
            <div className="mt-4 p-3 rounded-3" style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary text-uppercase">{activeScenario} Protocol</span>
                  <span className="text-light small">
                    {activeScenario === 'Medical' && 'Default Dispatch: Paramedic Ambulance + Nearest Medical Volunteers'}
                    {activeScenario === 'Road Accident' && 'Default Dispatch: Ambulance + Traffic Police + Tow Clearance'}
                    {activeScenario === 'Fire' && 'Default Dispatch: Fire Engine Squad + Police Perimeter + Medical Standby'}
                    {activeScenario === 'Crime / Safety' && 'Default Dispatch: Rapid Police Patrol + Perimeter Unit + Medical Triage'}
                    {activeScenario === 'Natural Disaster / Flood' && 'Default Dispatch: Disaster Response Force + Evacuation Transport + First Aid'}
                    {activeScenario === 'Other' && 'Default Dispatch: Rapid Evaluation Unit + Human Coordinator Assessment'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleReportEmergency}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  Report {activeScenario}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            7. SAFETY / HUMAN-IN-THE-LOOP SECTION
            ===================================================== */}
        <section className="safety-section" aria-labelledby="safety-title">
          <div className="container">
            <div className="safety-card-banner">
              <div className="safety-icon-large" aria-hidden="true">
                <i className="bi bi-shield-check"></i>
              </div>

              <div className="safety-content">
                <h3 id="safety-title" className="safety-title">
                  Human-in-the-Loop Response
                </h3>
                <p className="safety-text">
                  AI-generated analysis is designed to support emergency coordinators with structured information and relevant context. Final operational decisions remain with human coordinators.
                </p>

                <div className="safety-pillars-row">
                  <div className="safety-pillar-item">
                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                    <span>Human Dispatch Approval</span>
                  </div>
                  <div className="safety-pillar-item">
                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                    <span>Advisory Historical Memory</span>
                  </div>
                  <div className="safety-pillar-item">
                    <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                    <span>Data Sanitation Protocols</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            8. ROLE PORTALS (Preserving Existing Functionality)
            ===================================================== */}
        <section id="roles-portal" className="roles-portal-section" aria-labelledby="roles-portal-title">
          <div className="container">
            <div className="section-header-wrap mb-4">
              <span className="section-label">Stakeholder Access</span>
              <h2 id="roles-portal-title" className="section-heading">
                Interactive Operational Roles
              </h2>
              <p className="section-subtext">
                Switch between coordinator, citizen, professional responder, and volunteer helper modes to test each perspective.
              </p>
            </div>

            <div className="row g-3">
              {/* Citizen */}
              <div className="col-sm-6 col-lg-3">
                <button
                  type="button"
                  id="role-citizen-btn"
                  className="role-portal-card w-100"
                  onClick={() => handleRoleSelect('citizen', '/citizen')}
                >
                  <div className="role-portal-icon" style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#ef4444' }}>
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <h4 className="role-portal-title">Citizen</h4>
                  <p className="role-portal-desc">
                    Report emergencies with location detection and monitor response progress in real time.
                  </p>
                  <div className="role-portal-action">
                    <span>Enter Citizen Portal</span>
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </button>
              </div>

              {/* Coordinator */}
              <div className="col-sm-6 col-lg-3">
                <button
                  type="button"
                  id="role-coordinator-btn"
                  className="role-portal-card w-100"
                  onClick={() => handleRoleSelect('coordinator', '/coordinator')}
                >
                  <div className="role-portal-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                    <i className="bi bi-broadcast-pin"></i>
                  </div>
                  <h4 className="role-portal-title">Coordinator</h4>
                  <p className="role-portal-desc">
                    Command center triage, Gemini decision support, Hindsight memory recall, and dispatch control.
                  </p>
                  <div className="role-portal-action">
                    <span>Enter Command Center</span>
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </button>
              </div>

              {/* Responder */}
              <div className="col-sm-6 col-lg-3">
                <button
                  type="button"
                  id="role-responder-btn"
                  className="role-portal-card w-100"
                  onClick={() => handleRoleSelect('responder', '/responder')}
                >
                  <div className="role-portal-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <i className="bi bi-truck"></i>
                  </div>
                  <h4 className="role-portal-title">Responder</h4>
                  <p className="role-portal-desc">
                    Receive operational dispatches, update en-route milestones, and record scene arrivals.
                  </p>
                  <div className="role-portal-action">
                    <span>Enter Responder App</span>
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </button>
              </div>

              {/* Helper */}
              <div className="col-sm-6 col-lg-3">
                <button
                  type="button"
                  id="role-helper-btn"
                  className="role-portal-card w-100"
                  onClick={() => handleRoleSelect('helper', '/helper')}
                >
                  <div className="role-portal-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <h4 className="role-portal-title">Community Helper</h4>
                  <p className="role-portal-desc">
                    Nearby citizen volunteers providing immediate neighborhood aid before professional crews arrive.
                  </p>
                  <div className="role-portal-action">
                    <span>Enter Helper Portal</span>
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            9. FINAL CTA SECTION
            ===================================================== */}
        <section className="final-cta-section" aria-labelledby="final-cta-title">
          <div className="container">
            <div className="final-cta-card">
              <h2 id="final-cta-title" className="final-cta-title">
                Ready to Coordinate the Response?
              </h2>
              <p className="final-cta-desc">
                Report an emergency or explore the command center to see how AI and persistent memory can support emergency coordination.
              </p>

              <div className="final-cta-actions">
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleReportEmergency}
                >
                  <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                  <span>Report Emergency</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleOpenCommandCenter}
                >
                  <i className="bi bi-speedometer2" aria-hidden="true"></i>
                  <span>Open Command Center</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          10. PROFESSIONAL FOOTER
          ===================================================== */}
      <footer className="landing-footer" role="contentinfo">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand-col">
              <div className="landing-brand">
                <div className="landing-brand-badge" aria-hidden="true">
                  <i className="bi bi-broadcast"></i>
                </div>
                <div className="landing-brand-text">
                  <span className="landing-brand-title">Emergency Response Coordinator</span>
                </div>
              </div>
              <p className="footer-tagline">
                AI-Powered, Memory-Assisted Emergency Coordination
              </p>
            </div>

            <div className="footer-links-col">
              <div className="footer-links-group">
                <div className="footer-group-heading">Platform</div>
                <a
                  href="/"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Home
                </a>
                <a
                  href="/citizen/report"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleReportEmergency();
                  }}
                >
                  Report Emergency
                </a>
                <a
                  href="/coordinator"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenCommandCenter();
                  }}
                >
                  Command Center
                </a>
                <a
                  href="/citizen/history"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    switchRole('citizen');
                    navigate('/citizen/history');
                  }}
                >
                  Emergency History
                </a>
              </div>

              <div className="footer-links-group">
                <div className="footer-group-heading">Workspaces</div>
                <a
                  href="/citizen"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRoleSelect('citizen', '/citizen');
                  }}
                >
                  Citizen Portal
                </a>
                <a
                  href="/coordinator"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRoleSelect('coordinator', '/coordinator');
                  }}
                >
                  Coordinator Console
                </a>
                <a
                  href="/responder"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRoleSelect('responder', '/responder');
                  }}
                >
                  Responder Units
                </a>
                <a
                  href="/helper"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRoleSelect('helper', '/helper');
                  }}
                >
                  Community Helpers
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-disclaimer">
              <i className="bi bi-shield-exclamation me-1 text-warning" aria-hidden="true"></i>
              <strong>Notice:</strong> This application is a technology demonstration for AI decision-support and episodic memory. For active life-threatening emergencies, always dial official local emergency services (112 / 911).
            </div>
            <div>
              &copy; {new Date().getFullYear()} Emergency Response Coordinator
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
