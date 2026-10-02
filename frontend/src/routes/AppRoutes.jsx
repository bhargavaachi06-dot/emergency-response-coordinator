import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SplashScreen } from '../components/SplashScreen';

// Citizen pages
import CitizenDashboard      from '../pages/CitizenDashboard';
import ReportEmergency       from '../pages/ReportEmergency';
import EmergencyConfirmation from '../pages/EmergencyConfirmation';
import EmergencyStatus       from '../pages/EmergencyStatus';
import EmergencyHistory      from '../pages/EmergencyHistory';

// Coordinator pages
import CoordinatorDashboard  from '../pages/CoordinatorDashboard';
import EmergencyDetails      from '../pages/EmergencyDetails';

// Responder pages
import ResponderDashboard    from '../pages/ResponderDashboard';

// Helper pages
import HelperDashboard       from '../pages/HelperDashboard';
import HelperActiveResponse  from '../pages/HelperActiveResponse';

// Landing / Home page
import LandingPage           from '../pages/LandingPage';

// Auth pages
import LoginPage             from '../pages/LoginPage';
import SignUpPage            from '../pages/SignUpPage';

/**
 * Protected Route Wrapper
 * Temporarily bypassed for demo: allows users to access all core application routes
 * as guest without requiring authentication.
 * To re-enable strict authentication later, re-arm the redirect check.
 */
function ProtectedRoute({ children }) {
  const { isAuthLoading } = useApp();

  if (isAuthLoading) {
    return <SplashScreen message="Initializing Emergency Response Coordinator..." />;
  }

  // Authentication requirement temporarily bypassed for demo: all core routes are directly accessible as guest
  return children;
}

/**
 * Public Auth Route Wrapper
 * Renders Login and SignUp pages if someone manually navigates to them.
 */
function PublicAuthRoute({ children }) {
  const { isAuthLoading } = useApp();

  if (isAuthLoading) {
    return <SplashScreen message="Initializing Emergency Response Coordinator..." />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Main Home / Landing Page (Protected: Only accessible after authentication) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        }
      />

      {/* 2. Authentication routes (Public: Redirects to Home if already authenticated) */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        }
      />
      <Route path="/signin" element={<Navigate to="/login" replace />} />

      <Route
        path="/signup"
        element={
          <PublicAuthRoute>
            <SignUpPage />
          </PublicAuthRoute>
        }
      />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* 3. Citizen routes (Protected) */}
      <Route
        path="/citizen"
        element={
          <ProtectedRoute>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/report"
        element={
          <ProtectedRoute>
            <ReportEmergency />
          </ProtectedRoute>
        }
      />
      <Route path="/report" element={<Navigate to="/citizen/report" replace />} />
      <Route path="/report-emergency" element={<Navigate to="/citizen/report" replace />} />
      <Route
        path="/citizen/confirmation"
        element={
          <ProtectedRoute>
            <EmergencyConfirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/status"
        element={
          <ProtectedRoute>
            <EmergencyStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/history"
        element={
          <ProtectedRoute>
            <EmergencyHistory />
          </ProtectedRoute>
        }
      />

      {/* 4. Coordinator routes & aliases (Protected) */}
      <Route
        path="/coordinator"
        element={
          <ProtectedRoute>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/emergency/:id"
        element={
          <ProtectedRoute>
            <EmergencyDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/emergencies"
        element={
          <ProtectedRoute>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/command-center" element={<Navigate to="/coordinator" replace />} />
      <Route path="/dashboard" element={<Navigate to="/coordinator" replace />} />
      <Route
        path="/emergency/:id"
        element={
          <ProtectedRoute>
            <EmergencyDetails />
          </ProtectedRoute>
        }
      />

      {/* 5. Responder routes (Protected) */}
      <Route
        path="/responder"
        element={
          <ProtectedRoute>
            <ResponderDashboard />
          </ProtectedRoute>
        }
      />

      {/* 6. Helper routes (Protected) */}
      <Route
        path="/helper"
        element={
          <ProtectedRoute>
            <HelperDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/helper/alert"
        element={
          <ProtectedRoute>
            <HelperDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/helper/active"
        element={
          <ProtectedRoute>
            <HelperActiveResponse />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
