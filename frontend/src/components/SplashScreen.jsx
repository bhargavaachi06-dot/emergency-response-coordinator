import './SplashScreen.css';

/**
 * SplashScreen Component
 * Displayed during initial application bootstrap and authentication session validation
 */
export function SplashScreen({ message = 'Loading Emergency Response Coordinator...' }) {
  return (
    <div className="splash-screen-root" role="status" aria-live="polite">
      <div className="splash-screen-content">
        <div className="splash-brand-badge" aria-hidden="true">
          <i className="bi bi-shield-shaded"></i>
        </div>
        <h1 className="splash-brand-title">Emergency Response Coordinator</h1>
        <p className="splash-brand-tagline">Fast decisions. Better coordination. Safer response.</p>

        <div className="splash-loader-wrap">
          <span className="splash-spinner" aria-hidden="true"></span>
          <span className="splash-message">{message}</span>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
