// Stat summary card component
export function StatCard({ value, label, icon, color = 'blue', trend }) {
  return (
    <div className={`stat-card stat-accent-${color}`}>
      <div className={`stat-icon ${color}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {trend && (
          <div style={{ fontSize: '11px', marginTop: '4px', color: trend.up ? '#16a34a' : '#dc2626' }}>
            <i className={`bi bi-arrow-${trend.up ? 'up' : 'down'}-short`}></i>
            {trend.text}
          </div>
        )}
      </div>
    </div>
  );
}
