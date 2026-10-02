/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply DOM attributes on initial mount and whenever settings change
  useEffect(() => {
    settingsService.applyAll(settings);
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      settingsService.saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = settingsService.resetSettings();
    setSettings(defaults);
    return defaults;
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
      resetSettings,
      isSettingsOpen,
      openSettings,
      closeSettings,
      toggleSettings,
    }),
    [settings, updateSetting, resetSettings, isSettingsOpen, openSettings, closeSettings, toggleSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    // Graceful fallback to default values if rendered outside provider
    return {
      settings: DEFAULT_SETTINGS,
      updateSetting: () => {},
      resetSettings: () => {},
      isSettingsOpen: false,
      openSettings: () => {},
      closeSettings: () => {},
      toggleSettings: () => {},
    };
  }
  return context;
}
