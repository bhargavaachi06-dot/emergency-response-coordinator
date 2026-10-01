import { useState } from 'react';

/**
 * HindsightMemoryPanel Component
 * Displays historical operational context from Hindsight Episodic Memory
 * for the emergency response coordinator decision-support layer.
 *
 * @param {object} props
 * @param {object} props.memoryContext - Output from GET /api/emergencies/:id/memory-context
 * @param {object} [props.ai] - Optional AI analysis object for context count display
 */
export function HindsightMemoryPanel({ memoryContext, ai }) {
  const [showRaw, setShowRaw] = useState(false);
  const [showContextText, setShowContextText] = useState(false);

  // Fallback / missing state
  if (!memoryContext || memoryContext.available === false) {
    return (
      <div
        className="section-card mb-4"
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 12,
        }}
      >
        <div className="section-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 18 }}>🧠</span>
            <div>
              <h2 className="section-card-title mb-0" style={{ fontSize: '14px', fontWeight: 700 }}>
                Hindsight Episodic Memory
              </h2>
            </div>
          </div>
          <span
            className="badge"
            style={{
              background: 'rgba(148, 163, 184, 0.15)',
              color: '#64748b',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            ○ Unavailable
          </span>
        </div>
        <div className="section-card-body">
          <div className="d-flex align-items-center gap-2 mb-2 text-muted" style={{ fontSize: '12px' }}>
            <span>○ Hindsight Memory Bank Unavailable</span>
          </div>
          <p className="text-muted mb-0" style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            Hindsight memory is currently unavailable. The emergency workflow can continue without historical context.
          </p>
        </div>
      </div>
    );
  }

  const {
    emergencyCode = '',
    available = true,
    memoryCount = 0,
    memories = [],
    contextText = '',
  } = memoryContext;

  // Determine context count used by AI if provided
  const aiMemoryCount = ai?.memoryCount ?? (ai?.memoryContextUsed ? memoryCount : null);
  const effectiveItemsUsed = aiMemoryCount !== null && aiMemoryCount !== undefined ? aiMemoryCount : memoryCount;

  // Categorize raw memory string into presentation groups
  const categorizeMemory = (text) => {
    const lower = (text || '').toLowerCase();
    if (
      lower.includes('road accident') ||
      lower.includes('previous incident') ||
      lower.includes('historical incident') ||
      lower.includes('er-1001') ||
      lower.includes('prior incident')
    ) {
      return {
        label: 'PRIOR INCIDENT HISTORY',
        badgeStyle: { background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)' },
        icon: 'bi-clock-history',
      };
    }
    if (
      lower.includes('dispatch') ||
      lower.includes('ambulance') ||
      lower.includes('police') ||
      lower.includes('fire') ||
      lower.includes('responder') ||
      lower.includes('response') ||
      lower.includes('unit')
    ) {
      return {
        label: 'OPERATIONAL RESPONSE',
        badgeStyle: { background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.25)' },
        icon: 'bi-truck',
      };
    }
    if (
      lower.includes('location') ||
      lower.includes('hyderabad') ||
      lower.includes('injured') ||
      lower.includes('traffic') ||
      lower.includes('blocked') ||
      lower.includes('collision') ||
      lower.includes('vehicles') ||
      lower.includes('scene') ||
      lower.includes('hazard')
    ) {
      return {
        label: 'SCENE / SITUATIONAL CONTEXT',
        badgeStyle: { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' },
        icon: 'bi-geo-alt-fill',
      };
    }
    if (
      lower.includes('arrived') ||
      lower.includes('completed') ||
      lower.includes('resolved') ||
      lower.includes('secured') ||
      lower.includes('operational tasks') ||
      lower.includes('cleared')
    ) {
      return {
        label: 'RESOLUTION / OUTCOME',
        badgeStyle: { background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.25)' },
        icon: 'bi-check2-circle',
      };
    }
    return {
      label: 'OTHER MEMORY',
      badgeStyle: { background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' },
      icon: 'bi-chat-left-text',
    };
  };

  // Find incident references (ER-xxxx) in memory text
  const extractIncidentCodes = (text) => {
    if (!text) return [];
    const matches = text.match(/ER-\d+/g) || [];
    return [...new Set(matches)].map((code) => {
      const isCurrent = emergencyCode && String(code).toUpperCase() === String(emergencyCode).toUpperCase();
      return {
        code,
        label: isCurrent ? 'Current Incident' : 'Incident Reference',
        isCurrent,
      };
    });
  };

  return (
    <div
      className="section-card mb-4"
      style={{
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(168, 85, 247, 0.06)',
      }}
    >
      {/* Header */}
      <div className="section-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: 18 }}>🧠</span>
          <div>
            <h2 className="section-card-title mb-0" style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Hindsight Episodic Memory
            </h2>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 1 }}>
              Historical operational context used to support this emergency analysis.
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {available ? (
            <span
              className="badge"
              style={{
                background: 'rgba(22, 163, 74, 0.12)',
                color: '#16a34a',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              ● Connected
            </span>
          ) : (
            <span
              className="badge"
              style={{
                background: 'rgba(148, 163, 184, 0.15)',
                color: '#64748b',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              ○ Unavailable
            </span>
          )}

          <span
            className="badge"
            style={{
              background: memoryCount > 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(148, 163, 184, 0.15)',
              color: memoryCount > 0 ? '#9333ea' : '#64748b',
              border: memoryCount > 0 ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(148, 163, 184, 0.25)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </div>

      <div className="section-card-body">
        {/* Connection status indicator */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2" style={{ fontSize: '12px', fontWeight: 600 }}>
            {available ? (
              <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                Hindsight Memory Bank Connected
              </span>
            ) : (
              <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
                Hindsight Memory Bank Unavailable
              </span>
            )}
          </div>

          {/* Action buttons (Raw / Context toggles) */}
          {memories.length > 0 && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 6 }}
                onClick={() => setShowRaw(!showRaw)}
                aria-label={showRaw ? 'Hide raw memory' : 'Show raw memory'}
              >
                <i className={`bi ${showRaw ? 'bi-eye-slash' : 'bi-code-slash'} me-1`}></i>
                {showRaw ? 'Hide raw memory' : 'Show raw memory'}
              </button>

              {contextText && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 6 }}
                  onClick={() => setShowContextText(!showContextText)}
                  aria-label={showContextText ? 'Hide recalled context' : 'View recalled context'}
                >
                  <i className={`bi ${showContextText ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                  {showContextText ? 'Hide context' : 'View recalled context'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Memory-assisted summary callout */}
        {memoryCount > 0 && (
          <div
            className="mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
              <div className="d-flex align-items-center gap-2" style={{ fontWeight: 700, fontSize: '12.5px', color: '#7e22ce' }}>
                <span>🧠</span>
                <span>Memory-assisted analysis</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b21a8',
                  background: 'rgba(168, 85, 247, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 12,
                }}
              >
                Context items used: {effectiveItemsUsed}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.45 }}>
              Previous emergency-response experience was available as context for the AI analysis.
            </div>
          </div>
        )}

        {/* Collapsible Context Text Preview */}
        {showContextText && contextText && (
          <div className="mb-3">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Recalled Context Payload
            </div>
            <div
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                maxHeight: 180,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {contextText}
            </div>
          </div>
        )}

        {/* Raw Memory View */}
        {showRaw && (
          <div className="mb-3">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Raw Hindsight Memory Items ({memories.length})
            </div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                color: '#334155',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(memories, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Formatted Categorized Memories List */}
        {!showRaw && memories.length > 0 && (
          <div className="d-flex flex-column gap-2 mb-3">
            {memories.map((text, idx) => {
              const cat = categorizeMemory(text);
              const codes = extractIncidentCodes(text);

              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '9px 12px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {/* Presentation Category Badge */}
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: 4,
                          letterSpacing: '0.3px',
                          ...cat.badgeStyle,
                        }}
                      >
                        <i className={`bi ${cat.icon} me-1`}></i>
                        {cat.label}
                      </span>

                      {/* Incident Code Badge(s) */}
                      {codes.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="badge"
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: 4,
                            background: c.isCurrent ? 'rgba(168, 85, 247, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                            color: c.isCurrent ? '#7e22ce' : '#dc2626',
                            border: c.isCurrent ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                          title={c.label}
                        >
                          <i className="bi bi-tag-fill me-1" style={{ fontSize: '9px' }}></i>
                          {c.code} · {c.label}
                        </span>
                      ))}
                    </div>

                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                      Historical context
                    </span>
                  </div>

                  {/* Memory Text */}
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: '#1e293b',
                      lineHeight: 1.45,
                      marginTop: 3,
                    }}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state when available but count === 0 */}
        {available && memoryCount === 0 && (
          <div
            className="text-center py-3 px-2 mb-3"
            style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: 8,
              color: '#64748b',
              fontSize: '12.5px',
            }}
          >
            <i className="bi bi-inbox text-muted me-1" style={{ fontSize: 16 }}></i>
            No historical memories were recalled for this incident.
          </div>
        )}

        {/* Professional Advisory Disclaimer */}
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '11.5px',
            color: '#92400e',
          }}
        >
          <i className="bi bi-shield-check text-warning" style={{ fontSize: 14, flexShrink: 0 }}></i>
          <span>
            Memory provides historical context for decision support. Emergency decisions remain with authorized human coordinators.
          </span>
        </div>
      </div>
    </div>
  );
}

export default HindsightMemoryPanel;
