import { Sidebar, TopNavbar } from '../components/Navigation';

export function AppLayout({ children, title, subtitle }) {
  return (
    <div className="app-with-sidebar">
      <Sidebar />
      <div className="app-main">
        <TopNavbar title={title} subtitle={subtitle} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
