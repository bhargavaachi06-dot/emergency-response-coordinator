import { useState, useMemo } from 'react';
import { ALL_23_LANGUAGES } from '../data/languages';
import './LanguageModal.css';

/**
 * LanguageModal Component
 * Interactive selection for all 23 official Indian languages
 */
export function LanguageModal({
  isOpen,
  isFirstLaunch = false,
  currentLanguage = 'en',
  onConfirm,
  onClose,
}) {
  const [selectedCode, setSelectedCode] = useState(currentLanguage || 'en');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered languages
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_23_LANGUAGES;
    return ALL_23_LANGUAGES.filter(
      (lang) =>
        lang.english.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeLangMeta = useMemo(() => {
    return ALL_23_LANGUAGES.find((l) => l.code === selectedCode) || ALL_23_LANGUAGES[0];
  }, [selectedCode]);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (onConfirm) {
      onConfirm(selectedCode);
    }
  };

  const handleDirectSelect = (code) => {
    setSelectedCode(code);
  };

  return (
    <div
      className={`lang-modal-backdrop ${isFirstLaunch ? 'lang-modal-first-launch' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-heading"
    >
      <div className="lang-modal-card">
        {/* Header */}
        <div className="lang-modal-header">
          {!isFirstLaunch && onClose && (
            <button
              type="button"
              className="lang-modal-close-btn"
              onClick={onClose}
              aria-label="Close language selector"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}

          <div className="lang-modal-brand-badge">
            <div className="lang-modal-icon" aria-hidden="true">
              <i className="bi bi-shield-shaded"></i>
            </div>
            <span className="lang-modal-app-name">Emergency Response Coordinator</span>
          </div>

          <h1 className="lang-modal-title" id="lang-modal-heading">
            Choose Your Preferred Language
          </h1>
          <p className="lang-modal-subtitle">
            Select a language to continue
          </p>
        </div>

        {/* Search Bar */}
        <div className="lang-modal-search">
          <div className="lang-search-wrapper">
            <i className="bi bi-search lang-search-icon" aria-hidden="true"></i>
            <input
              type="text"
              className="lang-search-input"
              placeholder="Search language / भाषा खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter 23 supported languages"
            />
            {searchQuery && (
              <button
                type="button"
                className="lang-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>
        </div>

        {/* 23 Languages Grid */}
        <div className="lang-modal-body" role="region" aria-label="Available Languages">
          <div className="lang-grid">
            {filteredLanguages.map((lang) => {
              const isSelected = selectedCode === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-card-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDirectSelect(lang.code)}
                  aria-pressed={isSelected}
                  aria-label={`${lang.english} - ${lang.native}`}
                >
                  <div className="lang-card-content">
                    <span className="lang-native-name">{lang.native}</span>
                    <span className="lang-english-name">{lang.english}</span>
                  </div>

                  {isSelected && (
                    <span className="lang-check-icon" aria-hidden="true">
                      <i className="bi bi-check-circle-fill"></i>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer with Continue Button */}
        <div className="lang-modal-footer">
          <div className="lang-selected-summary">
            Selected:
            <span className="lang-selected-pill">
              {activeLangMeta.native} ({activeLangMeta.english})
            </span>
          </div>

          <button
            type="button"
            className="btn-continue-language"
            onClick={handleContinue}
            aria-label="Continue with selected language"
          >
            <span>Continue</span>
            <i className="bi bi-arrow-right ms-2" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguageModal;
