/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { emergencyService } from "../services/emergencyService";
import { authService } from "../services/authService";
import {
  LANGUAGES,
  TRANSLATIONS,
  getLanguage,
  isRTL,
} from "../data/translations";

// --------------------------------------------------
// ROLES
// --------------------------------------------------

export const ROLES = {
  CITIZEN: "citizen",
  COORDINATOR: "coordinator",
  RESPONDER: "responder",
  HELPER: "helper",
};

// --------------------------------------------------
// DEMO USERS
// --------------------------------------------------

const DEMO_USERS = {
  [ROLES.CITIZEN]: {
    id: "citizen-demo",
    name: "Citizen User",
    email: "citizen@example.com",
    role: ROLES.CITIZEN,
  },

  [ROLES.COORDINATOR]: {
    id: "coordinator-demo",
    name: "Emergency Coordinator",
    email: "coordinator@example.com",
    role: ROLES.COORDINATOR,
  },

  [ROLES.RESPONDER]: {
    id: "responder-demo",
    name: "Professional Responder",
    email: "responder@example.com",
    role: ROLES.RESPONDER,
  },

  [ROLES.HELPER]: {
    id: "helper-demo",
    name: "Community Helper",
    email: "helper@example.com",
    role: ROLES.HELPER,
  },
};

// --------------------------------------------------
// CONTEXT
// --------------------------------------------------

const AppContext = createContext(null);

// --------------------------------------------------
// APP PROVIDER
// --------------------------------------------------

export function AppProvider({ children }) {
  // ------------------------------------------------
  // CURRENT USER
  // ------------------------------------------------

  const [authToken, setAuthToken] = useState(() => authService.getToken());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedRole =
      localStorage.getItem("emergency_role");

    if (
      savedRole &&
      DEMO_USERS[savedRole]
    ) {
      return DEMO_USERS[savedRole];
    }

    return DEMO_USERS[ROLES.CITIZEN];
  });

  // Restore authenticated session on startup if valid token exists
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      const token = authService.getToken();
      if (token) {
        try {
          const profile = await authService.getProfile();
          if (isMounted) {
            if (profile) {
              setCurrentUser(profile);
              setAuthToken(token);
              if (profile.role) {
                localStorage.setItem("emergency_role", profile.role.toLowerCase());
              }
            } else {
              // Token expired or invalid
              authService.clearToken();
              setAuthToken(null);
              setCurrentUser(DEMO_USERS[ROLES.CITIZEN]);
            }
          }
        } catch (e) {
          console.warn("Session restore error:", e);
          if (isMounted) {
            authService.clearToken();
            setAuthToken(null);
            setCurrentUser(DEMO_USERS[ROLES.CITIZEN]);
          }
        }
      } else {
        if (isMounted) {
          setAuthToken(null);
        }
      }

      if (isMounted) {
        setIsAuthLoading(false);
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = (token, user) => {
    authService.setToken(token);
    setAuthToken(token);
    if (user) {
      setCurrentUser(user);
      if (user.role) {
        localStorage.setItem("emergency_role", user.role.toLowerCase());
      }
    }
    setIsAuthLoading(false);
  };

  const logout = async () => {
    await authService.logout();
    setAuthToken(null);
    setCurrentUser(DEMO_USERS[ROLES.CITIZEN]);
    localStorage.setItem("emergency_role", ROLES.CITIZEN);
    setIsAuthLoading(false);
  };

  // ------------------------------------------------
  // EMERGENCIES
  // ------------------------------------------------

  const [emergencies, setEmergencies] =
    useState([]);

  const [submittedEmergency, setSubmittedEmergency] =
    useState(null);

  const [selectedEmergency, setSelectedEmergency] =
    useState(null);

  // ------------------------------------------------
  // UI STATE
  // ------------------------------------------------

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  // ------------------------------------------------
  // LANGUAGE & FIRST-LAUNCH STATE
  // ------------------------------------------------
  const [hasLanguageSet, setHasLanguageSet] = useState(() => {
    try {
      const saved = localStorage.getItem("citizenLanguage");
      return Boolean(saved && LANGUAGES.some((l) => l.code === saved));
    } catch {
      return false;
    }
  });

  const [citizenLanguage, setCitizenLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("citizenLanguage");
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "en";
  });

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const setCitizenLanguage = (newCode) => {
    if (LANGUAGES.some((l) => l.code === newCode)) {
      try {
        localStorage.setItem("citizenLanguage", newCode);
      } catch (e) {
        console.warn("LocalStorage error:", e);
      }
      setCitizenLanguageState(newCode);
      setHasLanguageSet(true);

      if (typeof document !== "undefined") {
        document.documentElement.lang = newCode;
        document.documentElement.dir = isRTL(newCode) ? "rtl" : "ltr";
      }
    }
  };

  useEffect(() => {
    const activeLang = citizenLanguage || "en";
    if (typeof document !== "undefined") {
      document.documentElement.lang = activeLang;
      document.documentElement.dir = isRTL(activeLang) ? "rtl" : "ltr";
    }
  }, [citizenLanguage]);

  // ------------------------------------------------
  // SWITCH ROLE
  // ------------------------------------------------

  const switchRole = (role) => {
    if (!DEMO_USERS[role]) {
      return;
    }

    localStorage.setItem(
      "emergency_role",
      role
    );

    setCurrentUser(
      DEMO_USERS[role]
    );
  };

  // ------------------------------------------------
  // HELPER: Normalize emergency record & parse AI data
  // ------------------------------------------------
  const normalizeEmergency = (emergency) => {
    if (!emergency) return emergency;
    let ai = emergency.ai_analysis || emergency.ai || emergency.analysis || null;
    if (typeof ai === "string") {
      try {
        ai = JSON.parse(ai);
      } catch {
        // ignore parse error
      }
    }

    return {
      ...emergency,
      ai_analysis: ai,
      ai: ai,
      analysis: ai,
      category: ai?.category || emergency.category || emergency.type,
      classification: ai?.category || ai?.classification || emergency.classification || emergency.type,
      severity: ai?.severity || emergency.severity,
      priority: ai?.priority || emergency.priority,
      media: emergency.media || [],
      media_count: emergency.media_count ?? (Array.isArray(emergency.media) ? emergency.media.length : 0),
      photos_count: emergency.photos_count ?? (Array.isArray(emergency.media) ? emergency.media.filter((m) => m.media_type === "image").length : 0),
      videos_count: emergency.videos_count ?? (Array.isArray(emergency.media) ? emergency.media.filter((m) => m.media_type === "video").length : 0),
    };
  };

  // ------------------------------------------------
  // LOAD EMERGENCIES
  // ------------------------------------------------

  const loadEmergencies = async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await emergencyService.getAll();

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEmergencies(
        (result.data || []).map(normalizeEmergency)
      );

    } catch (error) {
      console.error(
        "Load emergencies error:",
        error
      );

      setError(
        "Unable to load emergencies."
      );

    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // GET SINGLE EMERGENCY
  // ------------------------------------------------

  const getEmergency = async (id) => {
    setError(null);

    try {
      const result =
        await emergencyService.getById(id);

      if (!result.success) {
        setError(result.error);
        return null;
      }

      const normalized = normalizeEmergency(result.data);

      setSelectedEmergency(
        normalized
      );

      return normalized;

    } catch (error) {
      console.error(
        "Get emergency error:",
        error
      );

      setError(
        "Unable to load emergency details."
      );

      return null;
    }
  };

  // ------------------------------------------------
  // ADD EMERGENCY
  // ------------------------------------------------

  const addEmergency = async (
    reportData
  ) => {
    setLoading(true);
    setError(null);

    try {
      // --------------------------------------------
      // STEP 1: CREATE EMERGENCY
      // --------------------------------------------

      const createResult =
        await emergencyService.submit(
          reportData
        );

      if (!createResult.success) {
        setError(
          createResult.error
        );

        return {
          success: false,
          error: createResult.error,
        };
      }

      let emergency =
        normalizeEmergency(createResult.data);

      // --------------------------------------------
      // STEP 2: AUTOMATIC AI ANALYSIS
      // --------------------------------------------

      const analyzeResult =
        await emergencyService.analyze(
          emergency.emergency_code
        );

      if (analyzeResult.success && analyzeResult.data?.analysis) {
        const analysis = analyzeResult.data.analysis;
        emergency = normalizeEmergency({
          ...emergency,
          ai_analysis: analysis,
          ai: analysis,
          analysis: analysis,
          category: analysis.category,
          classification: analysis.category,
          severity: analysis.severity,
          priority: analysis.priority,
          status: "ANALYZING",
        });
      } else if (analyzeResult.success && analyzeResult.data) {
        emergency = normalizeEmergency({
          ...emergency,
          ...analyzeResult.data,
        });
      } else {
        console.warn(
          "AI analysis failed:",
          analyzeResult.error
        );
      }

      // --------------------------------------------
      // STEP 3: UPDATE STATE
      // --------------------------------------------

      setEmergencies(
        (previous) => [
          emergency,
          ...previous,
        ]
      );

      // --------------------------------------------
      // STEP 4: SAVE SUBMITTED EMERGENCY
      // --------------------------------------------

      setSubmittedEmergency(
        emergency
      );

      // --------------------------------------------
      // STEP 5: SAVE SELECTED EMERGENCY
      // --------------------------------------------

      setSelectedEmergency(
        emergency
      );

      return {
        success: true,
        data: emergency,
      };

    } catch (error) {
      console.error(
        "Add emergency error:",
        error
      );

      setError(
        "Unable to submit emergency."
      );

      return {
        success: false,
        error:
          "Unable to submit emergency.",
      };

    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // ANALYZE EMERGENCY
  // ------------------------------------------------

  const analyzeEmergency = async (
    id
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.analyze(
          id
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      const updated =
        await emergencyService.getById(
          id
        );

      if (updated.success) {
        const normalized = normalizeEmergency(updated.data);

        setSelectedEmergency(
          normalized
        );

        setEmergencies(
          (previous) =>
            previous.map(
              (item) =>
                item.id === normalized.id ||
                item.emergency_code === normalized.emergency_code
                  ? normalized
                  : item
            )
        );

        if (
          submittedEmergency?.id === normalized.id ||
          submittedEmergency?.emergency_code === normalized.emergency_code
        ) {
          setSubmittedEmergency(
            normalized
          );
        }

        return {
          success: true,
          data: normalized,
        };
      }

      return result;

    } catch (error) {
      console.error(
        "Analyze emergency error:",
        error
      );

      setError(
        "Unable to analyze emergency."
      );

      return {
        success: false,
        error:
          "Unable to analyze emergency.",
      };
    }
  };

  // ------------------------------------------------
  // DISPATCH EMERGENCY
  // ------------------------------------------------

  const dispatchEmergency = async (
    id
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.dispatch(
          id
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      const updated =
        await emergencyService.getById(
          id
        );

      if (updated.success) {
        setSelectedEmergency(
          updated.data
        );

        setEmergencies(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                updated.data.id
                  ? updated.data
                  : item
            )
        );

        if (
          submittedEmergency?.id ===
          updated.data.id
        ) {
          setSubmittedEmergency(
            updated.data
          );
        }

        return {
          success: true,
          data: updated.data,
        };
      }

      return result;

    } catch (error) {
      console.error(
        "Dispatch emergency error:",
        error
      );

      setError(
        "Unable to dispatch emergency."
      );

      return {
        success: false,
        error:
          "Unable to dispatch emergency.",
      };
    }
  };

  // ------------------------------------------------
  // UPDATE RESPONDER STATUS
  // ------------------------------------------------

  const updateResponderStatus = async (
    emergencyId,
    responderName,
    status
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.updateResponderStatus(
          emergencyId,
          responderName,
          status
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      const updated =
        await emergencyService.getById(
          emergencyId
        );

      if (updated.success) {
        setSelectedEmergency(
          updated.data
        );

        setEmergencies(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                updated.data.id
                  ? updated.data
                  : item
            )
        );

        if (
          submittedEmergency?.id ===
          updated.data.id
        ) {
          setSubmittedEmergency(
            updated.data
          );
        }
      }

      return {
        success: true,
        data:
          updated.success
            ? updated.data
            : result.data,
      };

    } catch (error) {
      console.error(
        "Responder status error:",
        error
      );

      setError(
        "Unable to update responder status."
      );

      return {
        success: false,
        error:
          "Unable to update responder status.",
      };
    }
  };

  // ------------------------------------------------
  // GET HELPERS
  // ------------------------------------------------

  const getHelpers = async (
    emergencyId
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.getHelpers(
          emergencyId
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      return result;

    } catch (error) {
      console.error(
        "Get helpers error:",
        error
      );

      setError(
        "Unable to load nearby helpers."
      );

      return {
        success: false,
        error:
          "Unable to load nearby helpers.",
      };
    }
  };

  // ------------------------------------------------
  // HELPER RESPONSE
  // ------------------------------------------------

  const helperRespond = async (
    emergencyId,
    helperId,
    accepted
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.helperRespond(
          emergencyId,
          helperId,
          accepted
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      const updated =
        await emergencyService.getById(
          emergencyId
        );

      if (updated.success) {
        setSelectedEmergency(
          updated.data
        );

        setEmergencies(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                updated.data.id
                  ? updated.data
                  : item
            )
        );

        if (
          submittedEmergency?.id ===
          updated.data.id
        ) {
          setSubmittedEmergency(
            updated.data
          );
        }
      }

      return {
        success: true,
        data:
          updated.success
            ? updated.data
            : result.data,
      };

    } catch (error) {
      console.error(
        "Helper response error:",
        error
      );

      setError(
        "Unable to submit helper response."
      );

      return {
        success: false,
        error:
          "Unable to submit helper response.",
      };
    }
  };

  // ------------------------------------------------
  // RESOLVE EMERGENCY
  // ------------------------------------------------

  const resolveEmergency = async (
    id
  ) => {
    setError(null);

    try {
      const result =
        await emergencyService.resolve(
          id
        );

      if (!result.success) {
        setError(
          result.error
        );

        return {
          success: false,
          error: result.error,
        };
      }

      const updated =
        await emergencyService.getById(
          id
        );

      if (updated.success) {
        setSelectedEmergency(
          updated.data
        );

        setEmergencies(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                updated.data.id
                  ? updated.data
                  : item
            )
        );

        if (
          submittedEmergency?.id ===
          updated.data.id
        ) {
          setSubmittedEmergency(
            updated.data
          );
        }
      }

      return {
        success: true,
        data:
          updated.success
            ? updated.data
            : result.data,
      };

    } catch (error) {
      console.error(
        "Resolve emergency error:",
        error
      );

      setError(
        "Unable to resolve emergency."
      );

      return {
        success: false,
        error:
          "Unable to resolve emergency.",
      };
    }
  };

  // ------------------------------------------------
  // INITIAL LOAD
  // ------------------------------------------------

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEmergencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------
  // CONTEXT VALUE
  // ------------------------------------------------

  const value = {
    currentUser,
    currentRole: currentUser?.role || ROLES.COORDINATOR,
    setCurrentRole: switchRole,
    switchRole,
    authToken,
    isAuthLoading,
    isAuthenticated: Boolean(authToken && currentUser && !currentUser.id?.toString().includes("-demo")),
    login,
    logout,

    emergencies,
    submittedEmergency,
    selectedEmergency,

    loading,
    error,
    setError,

    loadEmergencies,
    getEmergency,

    addEmergency,
    analyzeEmergency,
    dispatchEmergency,

    updateResponderStatus,

    getHelpers,
    helperRespond,

    resolveEmergency,

    setSubmittedEmergency,
    setSelectedEmergency,

    language: citizenLanguage || "en",
    citizenLanguage: citizenLanguage || "en",
    setLanguage: setCitizenLanguage,
    setCitizenLanguage,
    hasLanguageSet,
    setHasLanguageSet,
    isLangModalOpen,
    openLangModal: () => setIsLangModalOpen(true),
    closeLangModal: () => setIsLangModalOpen(false),
    currentLangMeta: getLanguage(citizenLanguage || "en"),
    t: TRANSLATIONS[citizenLanguage || "en"] || TRANSLATIONS.en,
    isRtl: isRTL(citizenLanguage || "en"),
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// --------------------------------------------------
// USE APP HOOK
// --------------------------------------------------

export function useApp() {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider"
    );
  }

  return context;
} 