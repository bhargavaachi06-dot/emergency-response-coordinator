import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useApp } from '../context/AppContext';
import './SettingsModal.css';

/**
 * SettingsModal Component
 * Full-featured claymorphism preferences panel for Emergency Response Coordinator
 */
export function SettingsModal() {
  const { isSettingsOpen, closeSettings, settings, updateSetting, resetSettings } = useSettings();
  const { openLangModal, currentLangMeta, isRtl } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const modalCardRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showResetConfirm) {
          setShowResetConfirm(false);
        } else {
          closeSettings();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, showResetConfirm, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleClose = () => {
    setShowResetConfirm(false);
    closeSettings();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleOpenLanguage = () => {
    handleClose();
    if (openLangModal) {
      openLangModal();
    }
  };

  const handleConfirmReset = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  return (
    <div
      className="settings-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="settings-modal-card" ref={modalCardRef}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-header-titles">
            <div className="settings-title-row">
              <div className="settings-icon-badge" aria-hidden="true">
                <i className="bi bi-gear-fill"></i>
              </div>
              <h2 id="settings-heading" className="settings-modal-title">Settings</h2>
            </div>
            <p className="settings-modal-subtitle">
              Customize your Emergency Response Coordinator experience.
            </p>
          </div>

          <button
            type="button"
            className="settings-close-btn"
            onClick={handleClose}
            aria-label="Close Settings"
            title="Close Settings (Esc)"
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="settings-modal-body">
          {/* Section 1: Appearance */}
          <div className="settings-section">
            <div className="settings-section-header">
              <i className="bi bi-palette-fill settings-section-icon" aria-hidden="true"></i>
              <h3 className="settings-section-title">Appearance</h3>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Theme</span>
                <span className="settings-item-desc">
                  Choose your interface theme or match system settings.
                </span>
              </div>

              <div className="settings-segmented-group" role="radiogroup" aria-label="Theme Selection">
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'light')}
                  role="radio"
                  aria-checked={settings.theme === 'light'}
                >
                  <i className="bi bi-sun-fill" aria-hidden="true"></i>
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'dark')}
                  role="radio"
                  aria-checked={settings.theme === 'dark'}
                >
                  <i className="bi bi-moon-stars-fill" aria-hidden="true"></i>
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.theme === 'system' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'system')}
                  role="radio"
                  aria-checked={settings.theme === 'system'}
                >
                  <i className="bi bi-display" aria-hidden="true"></i>
                  <span>System</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Notifications */}
          <div className="settings-section">
            <div className="settings-section-header">
              <i className="bi bi-bell-fill settings-section-icon" aria-hidden="true"></i>
              <h3 className="settings-section-title">Notifications</h3>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Emergency Notifications</span>
                <span className="settings-item-desc">
                  Receive high-priority alerts for new incidents and status updates.
                </span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => updateSetting('notifications', e.target.checked)}
                  aria-label="Toggle Emergency Notifications"
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Sound Effects</span>
                <span className="settings-item-desc">
                  Play audio feedback during emergency dispatch and response.
                </span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => updateSetting('soundEffects', e.target.checked)}
                  aria-label="Toggle Sound Effects"
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Section 3: Accessibility */}
          <div className="settings-section">
            <div className="settings-section-header">
              <i className="bi bi-universal-access settings-section-icon" aria-hidden="true"></i>
              <h3 className="settings-section-title">Accessibility</h3>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Text Size</span>
                <span className="settings-item-desc">
                  Scale typography across all cards, dashboards, and forms.
                </span>
              </div>

              <div className="settings-segmented-group" role="radiogroup" aria-label="Text Size Selection">
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.textSize === 'normal' ? 'active' : ''}`}
                  onClick={() => updateSetting('textSize', 'normal')}
                  role="radio"
                  aria-checked={settings.textSize === 'normal'}
                >
                  <span className="text-size-preview" style={{ fontSize: '13px' }}>A</span>
                  <span>Normal</span>
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.textSize === 'large' ? 'active' : ''}`}
                  onClick={() => updateSetting('textSize', 'large')}
                  role="radio"
                  aria-checked={settings.textSize === 'large'}
                >
                  <span className="text-size-preview" style={{ fontSize: '15px', fontWeight: 'bold' }}>A</span>
                  <span>Large</span>
                </button>
                <button
                  type="button"
                  className={`settings-segmented-btn ${settings.textSize === 'xlarge' ? 'active' : ''}`}
                  onClick={() => updateSetting('textSize', 'xlarge')}
                  role="radio"
                  aria-checked={settings.textSize === 'xlarge'}
                >
                  <span className="text-size-preview" style={{ fontSize: '18px', fontWeight: 'bold' }}>A+</span>
                  <span>Extra Large</span>
                </button>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Reduce Animations</span>
                <span className="settings-item-desc">
                  Minimize decorative motion. Vital emergency state feedback is always preserved.
                </span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.reduceAnimations}
                  onChange={(e) => updateSetting('reduceAnimations', e.target.checked)}
                  aria-label="Toggle Reduce Animations"
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Voice Assistance</span>
                <span className="settings-item-desc">
                  Enable multilingual text-to-speech guidance for emergency reports.
                </span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.voiceAssistance}
                  onChange={(e) => updateSetting('voiceAssistance', e.target.checked)}
                  aria-label="Toggle Voice Assistance"
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Section 4: Location & Privacy */}
          <div className="settings-section">
            <div className="settings-section-header">
              <i className="bi bi-geo-alt-fill settings-section-icon" aria-hidden="true"></i>
              <h3 className="settings-section-title">Location & Privacy</h3>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">Location Services</span>
                <span className="settings-item-desc">
                  Allow GPS lookup for rapid incident geolocation. Manual landmark entry is always available.
                </span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.locationServices}
                  onChange={(e) => updateSetting('locationServices', e.target.checked)}
                  aria-label="Toggle Location Services"
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>

            <div className="settings-privacy-note">
              <i className="bi bi-shield-lock-fill" aria-hidden="true"></i>
              <span>Emergency evidence is used to support emergency verification and response coordination.</span>
            </div>
          </div>

          {/* Section 5: Language Integration */}
          <div className="settings-section">
            <div className="settings-section-header">
              <i className="bi bi-translate settings-section-icon" aria-hidden="true"></i>
              <h3 className="settings-section-title">Language</h3>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-label">
                  Current Language: <strong>{currentLangMeta?.nativeName || 'English'}</strong>
                  {currentLangMeta?.name && currentLangMeta.name !== currentLangMeta.nativeName ? ` (${currentLangMeta.name})` : ''}
                </span>
                <span className="settings-item-desc">
                  Select among all 23 official Indian languages with full translations and RTL support.
                </span>
              </div>
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleOpenLanguage}
                aria-label="Open Language Selector"
              >
                <i className="bi bi-translate me-2" aria-hidden="true"></i>
                <span>Change Language</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Reset Settings */}
        <div className="settings-modal-footer">
          {showResetConfirm ? (
            <div className="settings-confirm-reset" role="alert">
              <span className="settings-confirm-text">
                <i className="bi bi-exclamation-triangle-fill text-warning me-2" aria-hidden="true"></i>
                Reset all preferences to their default values?
              </span>
              <div className="settings-confirm-actions">
                <button
                  type="button"
                  className="settings-cancel-btn"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={handleConfirmReset}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-footer-row">
              <span className="settings-version-tag">Emergency Response Coordinator v1.0</span>
              <button
                type="button"
                className="settings-reset-link-btn"
                onClick={() => setShowResetConfirm(true)}
                aria-label="Reset Settings to Defaults"
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>
                <span>Reset Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
