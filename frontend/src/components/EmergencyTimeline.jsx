export function EmergencyTimeline({ steps }) {
  return (
    <ul className="timeline">
      {steps.map((step, idx) => {
        let dotClass = '';
        let dotIcon = 'bi-circle';

        if (step.done && !step.active)  { dotClass = 'done';   dotIcon = 'bi-check-lg'; }
        else if (step.active)           { dotClass = 'active'; dotIcon = 'bi-arrow-right'; }
        else                            { dotClass = '';       dotIcon = 'bi-circle'; }

        return (
          <li key={idx} className="timeline-item">
            <div className={`timeline-dot ${dotClass}`}>
              <i className={`bi ${dotIcon}`} style={{ fontSize: 13 }}></i>
            </div>
            <div className="timeline-content">
              <div className="timeline-title" style={{
                color: step.done || step.active ? '#0f172a' : '#94a3b8',
                fontWeight: step.active ? 700 : 600,
              }}>
                {step.label}
                {step.active && (
                  <span className="badge-status badge-en-route ms-2" style={{ fontSize: '10px' }}>
                    In Progress
                  </span>
                )}
              </div>
              {step.time && (
                <div className="timeline-desc">{step.time}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
