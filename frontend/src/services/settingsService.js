/**
 * Central Settings Service
 * Emergency Response Coordinator
 *
 * Manages user preferences stored in localStorage with safe defaults:
 * - Theme (light | dark | system)
 * - Emergency Notifications (boolean)
 * - Sound Effects (boolean)
 * - Voice Assistance (boolean)
 * - Location Services (boolean)
 * - Text Size (normal | large | xlarge)
 * - Reduce Animations (boolean)
 */

export const SETTINGS_STORAGE_KEY = 'emergency_app_settings';

export const DEFAULT_SETTINGS = {
  theme: 'light',             // 'light' | 'dark' | 'system'
  notifications: true,        // boolean
  soundEffects: true,         // boolean
  voiceAssistance: true,      // boolean
  locationServices: true,     // boolean
  textSize: 'normal',         // 'normal' | 'large' | 'xlarge'
  reduceAnimations: false,    // boolean
};

let systemMediaListener = null;

export const settingsService = {
  /**
   * Load stored settings with safe defaults fallback
   */
  getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        theme: ['light', 'dark', 'system'].includes(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
        notifications: typeof parsed.notifications === 'boolean' ? parsed.notifications : DEFAULT_SETTINGS.notifications,
        soundEffects: typeof parsed.soundEffects === 'boolean' ? parsed.soundEffects : DEFAULT_SETTINGS.soundEffects,
        voiceAssistance: typeof parsed.voiceAssistance === 'boolean' ? parsed.voiceAssistance : DEFAULT_SETTINGS.voiceAssistance,
        locationServices: typeof parsed.locationServices === 'boolean' ? parsed.locationServices : DEFAULT_SETTINGS.locationServices,
        textSize: ['normal', 'large', 'xlarge'].includes(parsed.textSize) ? parsed.textSize : DEFAULT_SETTINGS.textSize,
        reduceAnimations: typeof parsed.reduceAnimations === 'boolean' ? parsed.reduceAnimations : DEFAULT_SETTINGS.reduceAnimations,
      };
    } catch (e) {
      console.warn('[Settings] Failed to parse localStorage settings, using defaults:', e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  /**
   * Save settings to localStorage
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[Settings] Failed to save settings to localStorage:', e);
    }
    this.applyAll(settings);
  },

  /**
   * Reset all settings to default values
   */
  resetSettings() {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (e) {
      console.warn('[Settings] Failed to remove settings from localStorage:', e);
    }
    const defaults = { ...DEFAULT_SETTINGS };
    this.applyAll(defaults);
    return defaults;
  },

  /**
   * Apply all active settings to the DOM (theme, text size, animation preferences)
   */
  applyAll(settings) {
    if (typeof document === 'undefined') return;
    this.applyTheme(settings.theme);
    this.applyTextSize(settings.textSize);
    this.applyReduceAnimations(settings.reduceAnimations);
  },

  /**
   * Apply theme attribute to documentElement
   */
  applyTheme(theme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Clean up previous system listener if any
    if (systemMediaListener && typeof window !== 'undefined') {
      try {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        mql.removeEventListener('change', systemMediaListener);
      } catch {
        // legacy safari ignore
      }
      systemMediaListener = null;
    }

    const applyState = (isDark) => {
      const mode = isDark ? 'dark' : 'light';
      root.setAttribute('data-theme', mode);
      root.setAttribute('data-bs-theme', mode);
      root.style.colorScheme = mode;
      if (document.body) {
        document.body.setAttribute('data-theme', mode);
        document.body.setAttribute('data-bs-theme', mode);
      }
      if (isDark) {
        root.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
      }
    };

    if (theme === 'system' && typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const updateSystemTheme = (e) => {
        applyState(e.matches);
      };
      applyState(mql.matches);

      systemMediaListener = updateSystemTheme;
      try {
        mql.addEventListener('change', systemMediaListener);
      } catch {
        // legacy fallback
      }
    } else {
      applyState(theme === 'dark');
    }
  },

  /**
   * Apply text size attribute to documentElement
   */
  applyTextSize(textSize) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-text-size', textSize || 'normal');
  },

  /**
   * Apply reduce animations attribute to documentElement
   */
  applyReduceAnimations(reduce) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-reduce-animations', reduce ? 'true' : 'false');
  },
};
