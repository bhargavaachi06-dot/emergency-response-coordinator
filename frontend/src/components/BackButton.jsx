import { useNavigate } from 'react-router-dom';

/**
 * Standard, clearly visible Back button:
 * - Button text: "← Back"
 * - Calls navigate(-1) on click
 * - Uses simple fallback route if history is not available
 */
export function BackButton({ fallback, className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (fallback) {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      className={`back-button ${className}`.trim()}
      onClick={handleBack}
      aria-label="Go back"
    >
      ← Back
    </button>
  );
}

export default BackButton;
