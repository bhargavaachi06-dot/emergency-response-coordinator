import React from 'react';

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
    Critical: '#ef4444',
    Serious:  '#f97316',
    High:     '#f97316',
    Moderate: '#f59e0b',
    Medium:   '#f59e0b',
    Low:      '#10b981',
  };

  const priorityColors = {
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.4)' },
    HIGH:     { bg: 'rgba(249, 115, 22, 0.2)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.4)' },
    MEDIUM:   { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.4)' },
    LOW:      { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.4)' },
  };

  const currentPriorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  const responderIcons = {
    Ambulance:              { icon: 'bi-heart-pulse-fill', emoji: '🚑', color: '#f43f5e' },
    Police:                 { icon: 'bi-shield-fill',       emoji: '👮', color: '#3b82f6' },
    'Fire & Rescue':        { icon: 'bi-fire',              emoji: '🚒', color: '#f97316' },
    'Fire/Rescue':          { icon: 'bi-fire',              emoji: '🚒', color: '#f97316' },
    'Emergency Coordinator':{ icon: 'bi-person-badge',      emoji: '📋', color: '#8b5cf6' },
  };

  const keySignals = Array.isArray(data.keySignals) ? data.keySignals : [];
  const recommendedResponders = Array.isArray(data.recommendedResponders) ? data.recommendedResponders : [];

  return (
    <div className="ai-card" style={{
      background: 'linear-gradient(145deg, #0b1329 0%, #111d3d 100%)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      borderRadius: 14,
      padding: compact ? '16px 18px' : '22px 24px',
      color: '#ffffff',
      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.6), 0 0 15px rgba(99, 102, 241, 0.1)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top ambient glow */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: isFallback ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.15)',
        filter: 'blur(30px)',
        pointerEvents: 'none',
      }} />

      {/* Header bar: Title + Source Label */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          color: '#c7d2fe',
          background: 'rgba(99, 102, 241, 0.15)',
          padding: '6px 12px',
          borderRadius: 20,
          border: '1px solid rgba(165, 180, 252, 0.25)',
        }}>
          <i className="bi bi-cpu-fill" style={{ color: '#818cf8' }}></i>
          <span>AI Decision Support</span>
        </div>

        {/* Badges Container */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {data.memoryContextUsed && (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 12,
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#d8b4fe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              letterSpacing: '0.3px',
            }} title={`Historical context provided to AI (${data.memoryCount || 0} memories recalled)`}>
              <span>🧠</span>
              <span>Memory-assisted</span>
            </span>
          )}

          {/* Source Badge */}
          {isFallback ? (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              letterSpacing: '0.3px',
            }}>
              <i className="bi bi-shield-shaded"></i>
              Fallback Analysis
            </span>
          ) : (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              letterSpacing: '0.3px',
            }}>
              <i className="bi bi-stars"></i>
              AI Analysis
            </span>
          )}
        </div>
      </div>

      {/* Primary Triad: Category, Severity, Priority */}
      <div className="row g-2 mb-3 align-items-center">
        {/* Category */}
        <div className="col-sm-5 col-12">
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            CATEGORY
          </div>
          <div style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: '#f8fafc' }}>
            {category}
          </div>
        </div>

        {/* Severity */}
        <div className="col-sm-4 col-6">
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            SEVERITY
          </div>
          <div style={{
            fontSize: compact ? 15 : 17,
            fontWeight: 800,
            color: severityColors[severity] || '#ffffff',
          }}>
            {severity}
          </div>
        </div>

        {/* Priority */}
        <div className="col-sm-3 col-6 text-sm-end">
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            PRIORITY
          </div>
          <span style={{
            display: 'inline-block',
            padding: '3px 9px',
            borderRadius: 6,
            fontSize: '12px',
            fontWeight: 800,
            background: currentPriorityStyle.bg,
            color: currentPriorityStyle.text,
            border: `1px solid ${currentPriorityStyle.border}`,
          }}>
            {priority}
          </span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div style={{ marginBottom: compact ? 12 : 16 }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.6)' }}>
            {isFallback ? 'Rule-Based Confidence Estimate' : 'Model Confidence'}
          </span>
          <span style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: isFallback ? '#fcd34d' : '#a5b4fc',
          }}>
            {confidencePct}%
          </span>
        </div>
        <div style={{
          height: 7,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div
            style={{
              width: `${confidencePct}%`,
              height: '100%',
              background: isFallback
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Key Signals */}
      {keySignals.length > 0 && (
        <div style={{ marginBottom: compact ? 10 : 14 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            KEY SIGNALS DETECTED
          </div>
          <div className="d-flex gap-1 flex-wrap">
            {keySignals.map((signal, idx) => (
              <span key={idx} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: '12px',
                color: '#e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <i className="bi bi-tag-fill" style={{ fontSize: '10px', color: '#94a3b8' }}></i>
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
          background: 'rgba(15, 23, 42, 0.45)',
          borderLeft: isFallback ? '3px solid #f59e0b' : '3px solid #6366f1',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '0 8px 8px 0',
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
            ASSESSMENT REASONING
          </div>
          <p style={{
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: '#cbd5e1',
            margin: 0,
            fontStyle: 'normal',
          }}>
            {data.reasoning}
          </p>
        </div>
      )}

      {/* Recommended Responders */}
      {recommendedResponders.length > 0 && (
        <div style={{ marginBottom: compact ? 8 : 14 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            RECOMMENDED RESPONDERS
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {recommendedResponders.map((r) => {
              const meta = responderIcons[r] || { emoji: '🔵', color: '#94a3b8' };
              return (
                <div key={r} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '5px 11px',
                  fontSize: '12.5px',
                  color: '#ffffff',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>{meta.emoji}</span>
                  <span>{r}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision-Support Disclaimer (Mandatory) */}
      <div style={{
        marginTop: compact ? 10 : 14,
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
        <i className="bi bi-shield-check" style={{ fontSize: '13px', color: '#f59e0b', flexShrink: 0 }}></i>
        <span>AI-generated decision support. Final emergency response decisions are made by the coordinator.</span>
      </div>
    </div>
  );
}

export default AIAnalysisCard;
