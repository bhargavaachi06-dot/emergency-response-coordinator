import { AppLayout } from '../layouts/AppLayout';
import { EmergencyRow } from '../components/EmergencyCard';
import { BackButton } from '../components/BackButton';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/States';

export default function EmergencyHistory() {
  const { emergencies } = useApp();

  return (
    <AppLayout title="Emergency History" subtitle="All your past emergency reports">
      <BackButton fallback="/citizen" />

      <div className="page-header">
        <h1 className="page-title">My Emergency History</h1>
        <p className="page-subtitle">A complete record of all emergency reports submitted by you.</p>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">
            <i className="bi bi-clock-history text-muted"></i>
            All Reports ({emergencies.length})
          </h2>
        </div>

        {emergencies.length === 0 ? (
          <EmptyState
            icon="bi-shield-check"
            title="No emergencies reported"
            description="You have not submitted any emergency reports yet."
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0" style={{ fontSize: 13.5 }}>
              <thead style={{ background: '#f8fafc', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <tr>
                  <th className="ps-4 py-3 border-0 text-muted">ID</th>
                  <th className="py-3 border-0 text-muted">Type</th>
                  <th className="py-3 border-0 text-muted">Priority</th>
                  <th className="py-3 border-0 text-muted">Status</th>
                  <th className="py-3 border-0 text-muted">Reported</th>
                </tr>
              </thead>
              <tbody>
                {emergencies.map((e) => (
                  <EmergencyRow key={e.id} emergency={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
