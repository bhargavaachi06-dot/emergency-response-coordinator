/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import './EmergencyContacts.css';

/**
 * 6 Official Emergency Services Contact List
 */
export const EMERGENCY_CONTACTS = [
  {
    id: 'national',
    name: 'National Emergency',
    number: '112',
    icon: 'bi-shield-fill-exclamation',
    color: '#DC2626',
    desc: 'All-in-one emergency helpline across India',
  },
  {
    id: 'police',
    name: 'Police',
    number: '100',
    icon: 'bi-shield-lock-fill',
    color: '#2563EB',
    desc: 'Law enforcement, crime & immediate safety',
  },
  {
    id: 'fire',
    name: 'Fire & Rescue',
    number: '101',
    icon: 'bi-fire',
    color: '#EA580C',
    desc: 'Fire outbreaks, hazards & rescue operations',
  },
  {
    id: 'ambulance',
    name: 'Ambulance / Emergency Medical',
    number: '108',
    icon: 'bi-hospital-fill',
    color: '#059669',
    desc: 'Critical medical transport & trauma response',
  },
  {
    id: 'child',
    name: 'Child Helpline',
    number: '1098',
    icon: 'bi-people-fill',
    color: '#7C3AED',
    desc: '24/7 care & protection for children in distress',
  },
  {
    id: 'women',
    name: 'Women Helpline',
    number: '181',
    icon: 'bi-gender-female',
    color: '#DB2777',
    desc: 'Support & rescue for women in crisis',
  },
];

/**
 * EmergencyContactsModal
 * Polished claymorphism modal showing official emergency contacts with click-to-call.
 */
export function EmergencyContactsModal({ isOpen, onClose }) {
  const { isRtl } = useApp();
  const closeBtnRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus close button on open for accessibility
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInitiateCall = (number) => {
    window.open(`tel:${number}`, '_self');
  };

  return (
    <div
      className="emergency-contacts-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-contacts-modal-title"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="emergency-contacts-modal-card">
        {/* Modal Header */}
        <div className="emergency-contacts-modal-header">
          <div className="emergency-contacts-title-group">
            <div className="emergency-contacts-header-icon" aria-hidden="true">
              <i className="bi bi-telephone-fill"></i>
            </div>
            <div>
              <h2 id="emergency-contacts-modal-title" className="emergency-contacts-modal-title">
                Emergency Contacts
              </h2>
              <p className="emergency-contacts-modal-subtitle">
                Quick access to important emergency services.
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="emergency-contacts-close-btn"
            onClick={onClose}
            aria-label="Close emergency contacts modal"
            title="Close (Esc)"
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        {/* Notice Banner */}
        <div className="emergency-contacts-notice" role="note">
          <i className="bi bi-info-circle-fill text-primary" aria-hidden="true"></i>
          <span>Calls connect immediately to the official helpline through your device dialer.</span>
        </div>

        {/* Contacts List */}
        <div className="emergency-contacts-list" role="list">
          {EMERGENCY_CONTACTS.map((contact) => (
            <div
              key={contact.id}
              className="emergency-contact-row"
              role="listitem"
              onClick={() => handleInitiateCall(contact.number)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInitiateCall(contact.number);
                }
              }}
              aria-label={`Call ${contact.name} at ${contact.number}`}
            >
              <div
                className="emergency-contact-icon-badge"
                style={{
                  color: contact.color,
                  backgroundColor: `${contact.color}15`,
                  borderColor: `${contact.color}35`,
                }}
                aria-hidden="true"
              >
                <i className={`bi ${contact.icon}`}></i>
              </div>

              <div className="emergency-contact-info">
                <div className="emergency-contact-name-row">
                  <h3 className="emergency-contact-name">{contact.name}</h3>
                </div>
                <div className="emergency-contact-subline">
                  <a
                    href={`tel:${contact.number}`}
                    className="emergency-contact-number-link"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Call ${contact.name} at ${contact.number}`}
                    dir="ltr"
                  >
                    {contact.number}
                  </a>
                  <span className="emergency-contact-desc">{contact.desc}</span>
                </div>
              </div>

              <a
                href={`tel:${contact.number}`}
                className="emergency-contact-call-btn"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Call ${contact.name} at ${contact.number}`}
              >
                <i className="bi bi-telephone-fill" aria-hidden="true"></i>
                <span className="call-btn-text">Call</span>
              </a>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="emergency-contacts-modal-footer">
          <span className="emergency-contacts-footer-tip">
            <i className="bi bi-shield-check text-success me-1" aria-hidden="true"></i>
            Toll-free emergency numbers active 24/7 across India.
          </span>
          <button
            type="button"
            className="emergency-contacts-done-btn"
            onClick={onClose}
            aria-label="Done reviewing emergency contacts"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * EmergencyContactsSection
 * Prominent, clean claymorphic Home Page card + in-page modal launcher.
 */
export default function EmergencyContactsSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { isRtl } = useApp();

  return (
    <>
      <section
        className="emergency-contacts-section"
        aria-labelledby="emergency-contacts-section-title"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="emergency-contacts-card">
          <div className="emergency-contacts-card-content">
            <div className="emergency-contacts-card-badge" aria-hidden="true">
              <i className="bi bi-telephone-fill"></i>
            </div>
            <div className="emergency-contacts-card-text">
              <div className="emergency-contacts-tag">
                <span className="pulse-indicator" aria-hidden="true"></span>
                <span>Direct Dial Helplines</span>
              </div>
              <h2 id="emergency-contacts-section-title" className="emergency-contacts-card-title">
                Emergency Contacts
              </h2>
              <p className="emergency-contacts-card-subtitle">
                Quick access to important emergency services.
              </p>
            </div>
          </div>

          <div className="emergency-contacts-card-action">
            <button
              type="button"
              className="btn-view-emergency-contacts"
              onClick={() => setIsOpen(true)}
              aria-label="View Emergency Contacts"
            >
              <i className="bi bi-telephone-outbound-fill" aria-hidden="true"></i>
              <span>View Emergency Contacts</span>
            </button>
          </div>
        </div>
      </section>

      {/* In-page modal */}
      <EmergencyContactsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
