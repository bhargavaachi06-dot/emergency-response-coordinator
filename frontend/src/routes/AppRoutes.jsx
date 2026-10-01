import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
 * Guarantees that only authenticated users can access protected application pages.
 * Redirects unauthenticated users to /login, preserving target path for post-login return.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useApp();
  const location = useLocation();

  if (isAuthLoading) {
    return <SplashScreen message="Verifying session..." />;
  }

  if (!isAuthenticated) {
    // Preserve requested route for post-login return unless the user visited root
    const redirectState = location.pathname !== '/' ? { from: location.pathname + location.search } : undefined;
    return <Navigate to="/login" state={redirectState} replace />;
  }

  return children;
}

/**
 * Public Auth Route Wrapper
 * Redirects already authenticated users away from Login/SignUp to Home (/).
 */
function PublicAuthRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return <SplashScreen message="Verifying session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
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
