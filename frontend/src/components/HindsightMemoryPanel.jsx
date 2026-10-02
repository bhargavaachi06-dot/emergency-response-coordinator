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
        className="clay-card mb-4"
        style={{
          background: 'var(--er-surface, #FFFFFF)',
          border: '1.5px solid var(--er-border-subtle, #EDF2F7)',
          borderRadius: '24px',
          boxShadow: 'var(--clay-shadow-card)',
          padding: '24px',
        }}
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 20 }}>🧠</span>
            <div>
              <h2 className="mb-0" style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Hindsight Memory
              </h2>
            </div>
          </div>
          <span
            style={{
              background: '#F1F5F9',
              color: '#64748B',
              border: '1px solid #CBD5E1',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            ○ Unavailable
          </span>
        </div>
        <p className="mb-0" style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
          No relevant previous incident context available.
        </p>
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
        badgeStyle: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
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
        badgeStyle: { background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' },
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
        badgeStyle: { background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' },
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
        badgeStyle: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' },
        icon: 'bi-check2-circle',
      };
    }
    return {
      label: 'HISTORICAL MEMORY',
      badgeStyle: { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
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
      className="clay-card mb-4"
      style={{
        background: 'var(--er-surface, #FFFFFF)',
        border: '1.5px solid rgba(147, 51, 234, 0.25)',
        borderRadius: '24px',
        boxShadow: 'var(--clay-shadow-card)',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <h2 className="mb-0" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--er-navy, #0F172A)' }}>
              Hindsight Memory
            </h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 1 }}>
              Relevant previous incident context and operational lessons
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {available ? (
            <span
              style={{
                background: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                boxShadow: 'var(--clay-shadow-sm)',
              }}
            >
              ● Connected
            </span>
          ) : (
            <span
              style={{
                background: '#F1F5F9',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
              }}
            >
              ○ Unavailable
            </span>
          )}

          <span
            style={{
              background: memoryCount > 0 ? '#FAF5FF' : '#F1F5F9',
              color: memoryCount > 0 ? '#7E22CE' : '#64748B',
              border: memoryCount > 0 ? '1px solid #E9D5FF' : '1px solid #E2E8F0',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '9999px',
              boxShadow: 'var(--clay-shadow-sm)',
            }}
          >
            {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </div>

      <div>
        {/* Memory-assisted summary callout */}
        {memoryCount > 0 && (
          <div
            className="mb-3"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: 'var(--clay-shadow-inset)',
            }}
          >
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
              <div className="d-flex align-items-center gap-2" style={{ fontWeight: 700, fontSize: '13px', color: '#7E22CE' }}>
                <span>Operational Context Recalled</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#6B21A8',
                  background: '#F3E8FF',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #E9D5FF',
                }}
              >
                Context items: {effectiveItemsUsed}
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
              Previous emergency-response experience is active as reference context for this incident.
            </div>
          </div>
        )}

        {/* Action buttons (Raw / Context toggles) */}
        {memories.length > 0 && (
          <div className="d-flex justify-content-end gap-2 mb-3">
            <button
              type="button"
              className="clay-button"
              style={{ fontSize: '11.5px', padding: '6px 12px', minHeight: '34px', borderRadius: '10px' }}
              onClick={() => setShowRaw(!showRaw)}
              aria-label={showRaw ? 'Hide raw memory' : 'Show raw memory'}
            >
              <i className={`bi ${showRaw ? 'bi-eye-slash' : 'bi-code-slash'}`}></i>
              {showRaw ? 'Hide Raw' : 'Raw Memory'}
            </button>

            {contextText && (
              <button
                type="button"
                className="clay-button"
                style={{ fontSize: '11.5px', padding: '6px 12px', minHeight: '34px', borderRadius: '10px' }}
                onClick={() => setShowContextText(!showContextText)}
                aria-label={showContextText ? 'Hide recalled context' : 'View recalled context'}
              >
                <i className={`bi ${showContextText ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                {showContextText ? 'Hide Context' : 'Context Text'}
              </button>
            )}
          </div>
        )}

        {/* Collapsible Context Text Preview */}
        {showContextText && contextText && (
          <div className="mb-3">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
              Recalled Context Payload
            </div>
            <div
              style={{
                background: '#F8FAFC',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12px',
                fontFamily: 'monospace',
                maxHeight: 180,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
                boxShadow: 'var(--clay-shadow-inset)',
              }}
            >
              {contextText}
            </div>
          </div>
        )}

        {/* Raw Memory View */}
        {showRaw && (
          <div className="mb-3">
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
              Raw Hindsight Memory Items ({memories.length})
            </div>
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#334155',
                maxHeight: 200,
                overflowY: 'auto',
                boxShadow: 'var(--clay-shadow-inset)',
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
                    background: 'var(--er-surface-elevated, #FFFFFF)',
                    border: '1.5px solid var(--er-border, #E2E8F0)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    boxShadow: 'var(--clay-shadow-sm)',
                    transition: 'border-color 0.16s ease, transform 0.16s ease',
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {/* Presentation Category Badge */}
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
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
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: c.isCurrent ? '#F3E8FF' : '#FEE2E2',
                            color: c.isCurrent ? '#7E22CE' : '#991B1B',
                            border: c.isCurrent ? '1px solid #E9D5FF' : '1px solid #FECACA',
                          }}
                          title={c.label}
                        >
                          <i className="bi bi-tag-fill me-1" style={{ fontSize: '9px' }}></i>
                          {c.code} · {c.label}
                        </span>
                      ))}
                    </div>

                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                      Historical context
                    </span>
                  </div>

                  {/* Memory Text */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#0F172A',
                      lineHeight: 1.5,
                      marginTop: 4,
                      fontWeight: 500,
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
            className="text-center py-4 px-3 mb-3"
            style={{
              background: '#F8FAFC',
              border: '1.5px dashed #CBD5E1',
              borderRadius: '16px',
              color: '#64748B',
              fontSize: '13.5px',
            }}
          >
            <i className="bi bi-inbox text-muted me-2" style={{ fontSize: 18 }}></i>
            No relevant previous incident context available.
          </div>
        )}

        {/* Professional Advisory Disclaimer */}
        <div
          style={{
            padding: '10px 14px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '12px',
            color: '#92400E',
            fontWeight: 500,
            boxShadow: 'var(--clay-shadow-sm)',
          }}
        >
          <i className="bi bi-shield-check" style={{ fontSize: 15, color: '#D97706', flexShrink: 0 }}></i>
          <span>
            Memory provides historical context for decision support. Emergency decisions remain with authorized human coordinators.
          </span>
        </div>
      </div>
    </div>
  );
}

export default HindsightMemoryPanel;
