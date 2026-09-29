// Shared state/empty/error boxes
export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="state-box">
      <div className="spinner-border text-primary mb-3" role="status" style={{ width: 36, height: 36 }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="state-title">{message}</div>
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', title = 'Nothing here', description }) {
  return (
    <div className="state-box">
      <i className={`bi ${icon} state-icon text-muted`}></i>
      <div className="state-title">{title}</div>
      {description && <div className="state-desc">{description}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state-box">
      <i className="bi bi-exclamation-circle-fill state-icon text-danger"></i>
      <div className="state-title">Unable to Load</div>
      <div className="state-desc mb-3">{message}</div>
      {onRetry && (
        <button className="btn-outline-custom" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise"></i>
          Try Again
        </button>
      )}
    </div>
  );
}
