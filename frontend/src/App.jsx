import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import AppRoutes from './routes/AppRoutes';
import { LanguageModal } from './components/LanguageModal';
import { SettingsModal } from './components/SettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { useMobileLifecycle } from './services/mobileLifecycle';

/**
 * Inner Application Wrapper
 * Manages startup splash screen, first-launch language flow, and global modals
 */
function AppContent() {
  const navigate = useNavigate();
  const {
    isAuthLoading,
    hasLanguageSet,
    citizenLanguage,
    setCitizenLanguage,
    isLangModalOpen,
    closeLangModal,
  } = useApp();

  // Mobile Lifecycle (Status bar, native splash, hardware back-button)
  useMobileLifecycle({
    isLangModalOpen,
    closeLangModal,
    hasLanguageSet,
  });

  // 1. Startup Splash: Displayed while session validation runs
  if (isAuthLoading) {
    return <SplashScreen message="Initializing Emergency Response Coordinator..." />;
  }

  // 2. First-Launch Language Selection Screen:
  // Must appear before any application routing on a fresh installation.
  // After selecting a language, immediately saves and navigates directly to Home (/).
  // Flow: Splash -> Preferred Language (if required) -> Home
  if (!hasLanguageSet) {
    return (
      <LanguageModal
        isOpen={true}
        isFirstLaunch={true}
        currentLanguage={citizenLanguage || 'en'}
        onConfirm={(code) => {
          setCitizenLanguage(code);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  return (
    <>
      {/* 3. Top Navbar Language Switcher Modal (for returning users changing language in-app) */}
      {isLangModalOpen && (
        <LanguageModal
          isOpen={isLangModalOpen}
          isFirstLaunch={false}
          currentLanguage={citizenLanguage || 'en'}
          onConfirm={(code) => {
            setCitizenLanguage(code);
            closeLangModal();
          }}
          onClose={closeLangModal}
        />
      )}

      {/* Global Preferences & Customization Modal */}
      <SettingsModal />

      {/* 4. Main Application Routing with protected page guards */}
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
