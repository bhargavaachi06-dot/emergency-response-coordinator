import { Routes, Route, Navigate } from 'react-router-dom';

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

// Landing page
import LandingPage           from '../pages/LandingPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/"                            element={<LandingPage />} />

      {/* Citizen routes */}
      <Route path="/citizen"                     element={<CitizenDashboard />} />
      <Route path="/citizen/report"              element={<ReportEmergency />} />
      <Route path="/citizen/confirmation"        element={<EmergencyConfirmation />} />
      <Route path="/citizen/status"              element={<EmergencyStatus />} />
      <Route path="/citizen/history"             element={<EmergencyHistory />} />

      {/* Coordinator routes */}
      <Route path="/coordinator"                 element={<CoordinatorDashboard />} />
      <Route path="/coordinator/emergency/:id"   element={<EmergencyDetails />} />
      <Route path="/coordinator/emergencies"     element={<CoordinatorDashboard />} />

      {/* Responder routes */}
      <Route path="/responder"                   element={<ResponderDashboard />} />

      {/* Helper routes */}
      <Route path="/helper"                      element={<HelperDashboard />} />
      <Route path="/helper/alert"                element={<HelperDashboard />} />
      <Route path="/helper/active"               element={<HelperActiveResponse />} />

      {/* Catch-all */}
      <Route path="*"                            element={<Navigate to="/" replace />} />
    </Routes>
  );
}
