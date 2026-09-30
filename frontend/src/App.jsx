import { BrowserRouter } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppRoutes from './routes/AppRoutes';
import { LanguageModal } from './components/LanguageModal';

/**
 * Inner Application Wrapper
 * Manages global first-launch language modal and navbar language switcher
 */
function AppContent() {
  const {
    hasLanguageSet,
    citizenLanguage,
    setCitizenLanguage,
    isLangModalOpen,
    closeLangModal,
  } = useApp();

  return (
    <>
      {/* 1. First-launch language selection screen (before entering main application) */}
      {!hasLanguageSet && (
        <LanguageModal
          isOpen={true}
          isFirstLaunch={true}
          currentLanguage={citizenLanguage || 'en'}
          onConfirm={(code) => setCitizenLanguage(code)}
        />
      )}

      {/* 2. Top navbar language switcher modal */}
      {hasLanguageSet && isLangModalOpen && (
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

      {/* 3. Main Application Routing */}
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
