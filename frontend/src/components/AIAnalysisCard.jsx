import { PriorityBadge } from './Badges';

export function AIAnalysisCard({ ai, compact = false }) {
  if (!ai) return null;

  // Handle case where ai is passed as JSON string
  let data = ai;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  const category = data.category || data.classification || 'Other';
  const severity = data.severity || 'Moderate';
  const priority = (data.priority || 'MEDIUM').toUpperCase();
  const source = data.source === 'FALLBACK' ? 'FALLBACK' : 'AI';
  const isFallback = source === 'FALLBACK';

  // Internal confidence is 0 to 1, format as percentage
  let confidencePct = 50;
  if (typeof data.confidence === 'number') {
    confidencePct = data.confidence <= 1
      ? Math.round(data.confidence * 100)
      : Math.min(100, Math.round(data.confidence));
  }

  const severityColors = {
    Critical: '#DC2626',
    Serious:  '#EA580C',
    High:     '#EA580C',
    Moderate: '#D97706',
    Medium:   '#D97706',
    Low:      '#16A34A',
  };

  const responderIcons = {
    Ambulance:              { icon: 'bi-heart-pulse-fill', emoji: '🚑', color: '#DC2626' },
    Police:                 { icon: 'bi-shield-fill',       emoji: '👮', color: '#0284C7' },
    'Fire & Rescue':        { icon: 'bi-fire',              emoji: '🚒', color: '#EA580C' },
    'Fire/Rescue':          { icon: 'bi-fire',              emoji: '🚒', color: '#EA580C' },
    'Emergency Coordinator':{ icon: 'bi-person-badge',      emoji: '📋', color: '#7C3AED' },
  };

  const keySignals = Array.isArray(data.keySignals) ? data.keySignals : [];
  const recommendedResponders = Array.isArray(data.recommendedResponders) ? data.recommendedResponders : [];

  return (
    <div
      className="clay-card ai-card"
      style={{
        background: 'var(--surface, #FFFFFF)',
        border: '1.5px solid var(--border-color, rgba(2, 132, 199, 0.2))',
        borderRadius: '24px',
        padding: compact ? '18px 20px' : '24px 26px',
        color: 'var(--text-primary, #0F172A)',
        boxShadow: 'var(--clay-shadow-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header bar: Title + Source Label */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.3px',
          color: 'var(--accent-blue-bright, #0284C7)',
          background: 'var(--er-blue-light, #F0F9FF)',
          padding: '6px 14px',
          borderRadius: '9999px',
          border: '1px solid var(--er-blue-border, #BAE6FD)',
          boxShadow: 'var(--clay-shadow-sm)',
        }}>
          <i className="bi bi-cpu-fill" style={{ color: 'var(--accent-blue-bright, #0284C7)' }}></i>
          <span>AI Decision Support</span>
        </div>

        {/* Badges Container */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {data.memoryContextUsed && (
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'var(--purple-badge-bg, rgba(147, 51, 234, 0.12))',
              border: '1px solid var(--purple-badge-border, rgba(168, 85, 247, 0.35))',
              color: 'var(--purple-badge-text, #A855F7)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: 'var(--clay-shadow-sm)',
            }} title={`Historical context provided to AI (${data.memoryCount || 0} memories recalled)`}>
              <span>🧠</span>
              <span>Memory-assisted</span>
            </span>
          )}

          {/* Source Badge */}
          {isFallback ? (
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'var(--er-amber-light, #FFFBEB)',
              border: '1px solid var(--er-amber-border, #FDE68A)',
              color: 'var(--er-amber, #B45309)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: 'var(--clay-shadow-sm)',
            }}>
              <i className="bi bi-shield-shaded"></i>
              Fallback Analysis
            </span>
          ) : (
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'var(--er-green-light, #F0FDF4)',
              border: '1px solid var(--er-green-border, #BBF7D0)',
              color: 'var(--er-green, #15803D)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: 'var(--clay-shadow-sm)',
            }}>
              <i className="bi bi-stars"></i>
              AI Analysis
            </span>
          )}
        </div>
      </div>

      {/* Primary Triad: Category, Severity, Priority */}
      <div className="row g-3 mb-3 align-items-center">
        {/* Category */}
        <div className="col-sm-5 col-12">
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 2 }}>
            CATEGORY
          </div>
          <div style={{ fontSize: compact ? 15 : 18, fontWeight: 800, color: 'var(--text-primary, #0F172A)' }}>
            {category}
          </div>
        </div>

        {/* Severity */}
        <div className="col-sm-4 col-6">
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 2 }}>
            SEVERITY
          </div>
          <div style={{
            fontSize: compact ? 15 : 18,
            fontWeight: 800,
            color: severityColors[severity] || 'var(--text-primary, #0F172A)',
          }}>
            {severity}
          </div>
        </div>

        {/* Priority */}
        <div className="col-sm-3 col-6 text-sm-end">
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 2 }}>
            PRIORITY
          </div>
          <PriorityBadge priority={priority} />
        </div>
      </div>

      {/* Confidence Bar */}
      <div style={{ marginBottom: compact ? 14 : 18 }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
            {isFallback ? 'Rule-Based Confidence Estimate' : 'Model Confidence'}
          </span>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            color: isFallback ? '#B45309' : '#0284C7',
          }}>
            {confidencePct}%
          </span>
        </div>
        <div style={{
          height: 8,
          background: 'var(--surface-input, #F1F5F9)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border-color, #E2E8F0)',
          boxShadow: 'var(--clay-shadow-inset)',
        }}>
          <div
            style={{
              width: `${confidencePct}%`,
              height: '100%',
              background: isFallback
                ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                : 'linear-gradient(90deg, #0284C7, #38BDF8)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Key Signals */}
      {keySignals.length > 0 && (
        <div style={{ marginBottom: compact ? 12 : 16 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 6 }}>
            KEY SIGNALS DETECTED
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {keySignals.map((signal, idx) => (
              <span key={idx} style={{
                background: 'var(--surface-input, #F8FAFC)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-secondary, #334155)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: 'var(--clay-shadow-sm)',
              }}>
                <i className="bi bi-tag-fill" style={{ fontSize: '10px', color: '#94A3B8' }}></i>
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {data.reasoning && (
        <div style={{
          marginBottom: compact ? 12 : 16,
          background: 'var(--surface-input, #F8FAFC)',
          borderLeft: isFallback ? '4px solid #F59E0B' : '4px solid #0284C7',
          borderTop: '1px solid var(--border-color, #E2E8F0)',
          borderRight: '1px solid var(--border-color, #E2E8F0)',
          borderBottom: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '0 12px 12px 0',
          padding: '12px 16px',
          boxShadow: 'var(--clay-shadow-inset)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700, marginBottom: 4 }}>
            ASSESSMENT REASONING
          </div>
          <p style={{
            fontSize: '13px',
            lineHeight: 1.55,
            color: 'var(--text-primary, #1E293B)',
            margin: 0,
            fontStyle: 'normal',
          }}>
            {data.reasoning}
          </p>
        </div>
      )}

      {/* Recommended Responders */}
      {recommendedResponders.length > 0 && (
        <div style={{ marginBottom: compact ? 10 : 16 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 6 }}>
            RECOMMENDED RESPONDERS
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {recommendedResponders.map((r) => {
              const meta = responderIcons[r] || { emoji: '🔵', color: '#64748B' };
              return (
                <div key={r} style={{
                  background: 'var(--er-surface-elevated, #FFFFFF)',
                  border: '1.5px solid var(--border-color, #E2E8F0)',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary, #0F172A)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: 'var(--clay-shadow-sm)',
                }}>
                  <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                  <span>{r}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision-Support Disclaimer (Mandatory) */}
      <div style={{
        marginTop: compact ? 10 : 16,
        padding: '10px 14px',
        background: 'var(--er-amber-light, #FFFBEB)',
        border: '1px solid var(--er-amber-border, #FDE68A)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: '12px',
        color: 'var(--text-secondary, #92400E)',
        fontWeight: 500,
        boxShadow: 'var(--clay-shadow-sm)',
      }}>
        <i className="bi bi-shield-check" style={{ fontSize: '15px', color: '#D97706', flexShrink: 0 }}></i>
        <span>AI provides decision support. Final action is taken by the human coordinator.</span>
      </div>
    </div>
  );
}

export default AIAnalysisCard;
