import { TopNavbar } from '../components/Navigation';

/**
 * AppLayout Component
 * Modern, full-width emergency response application shell.
 * Uses a unified top navigation bar with no permanent left sidebar.
 */
export function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <TopNavbar />
      <main className="app-main-content">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
