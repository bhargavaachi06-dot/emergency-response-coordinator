import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { useSettings } from '../context/SettingsContext';

/**
 * Mobile Lifecycle & Android Back Button Hook
 *
 * Implements native Android UX patterns:
 * 1. Safe Area & Dark Status Bar styling (#0b1329)
 * 2. Native Splash Screen dismissal after React boots
 * 3. Smart Android Hardware Back-Button hierarchy:
 *    - Priority 1: Close active modals (Language, Settings, Live Camera, Dialogs)
 *    - Priority 2: Navigate back on nested pages
 *    - Priority 3: Clean application exit on root screen (prevents infinite loop traps)
 */
export function useMobileLifecycle({
  isLangModalOpen = false,
  closeLangModal = () => {},
  hasLanguageSet = true,
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSettingsOpen, closeSettings } = useSettings();

  // Keep latest state in refs to avoid stale closures in Capacitor event listener
  const stateRef = useRef({
    isLangModalOpen,
    closeLangModal,
    hasLanguageSet,
    isSettingsOpen,
    closeSettings,
    pathname: location.pathname,
  });

  useEffect(() => {
    stateRef.current = {
      isLangModalOpen,
      closeLangModal,
      hasLanguageSet,
      isSettingsOpen,
      closeSettings,
      pathname: location.pathname,
    };
  }, [isLangModalOpen, closeLangModal, hasLanguageSet, isSettingsOpen, closeSettings, location.pathname]);

  useEffect(() => {
    // Only execute on native Capacitor mobile platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 1. Initialize native status bar
    (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0b1329' });
      } catch (err) {
        console.warn('[mobileLifecycle] StatusBar initialization warning:', err);
      }
    })();

    // 2. Hide native splash screen once React UI has mounted
    (async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('[mobileLifecycle] SplashScreen hide warning:', err);
      }
    })();

    // 3. Register Android Hardware Back-Button handler
    let backButtonHandle = null;

    (async () => {
      try {
        backButtonHandle = await CapacitorApp.addListener('backButton', () => {
          const s = stateRef.current;

          // Priority 1A: Close Live Camera Modal if open
          const cameraCloseBtn = document.querySelector('.live-camera-modal-backdrop .live-camera-close-btn, [data-action="close-camera-modal"]');
          if (cameraCloseBtn) {
            cameraCloseBtn.click();
            return;
          }

          // Priority 1B: Close Settings Modal if open
          if (s.isSettingsOpen) {
            s.closeSettings();
            return;
          }

          // Priority 1C: Close Language Modal if open (and not initial first-launch lock)
          if (s.isLangModalOpen && s.hasLanguageSet) {
            s.closeLangModal();
            return;
          }

          // Priority 1D: Generic active modal overlay in DOM
          const genericModalClose = document.querySelector('.modal.show .btn-close, .modal-backdrop, [data-dismiss="modal"]');
          if (genericModalClose && typeof genericModalClose.click === 'function') {
            genericModalClose.click();
            return;
          }

          // Priority 2: Nested screen navigation
          if (s.pathname && s.pathname !== '/') {
            // If on root landing or citizen home, return home or exit
            navigate(-1);
            return;
          }

          // Priority 3: On root screen or no backward history -> Exit App
          CapacitorApp.exitApp();
        });
      } catch (backErr) {
        console.warn('[mobileLifecycle] BackButton listener registration warning:', backErr);
      }
    })();

    return () => {
      if (backButtonHandle && typeof backButtonHandle.remove === 'function') {
        backButtonHandle.remove();
      }
    };
  }, [navigate]);
}
