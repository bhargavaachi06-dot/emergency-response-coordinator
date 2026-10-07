import { useState, useMemo } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { BackButton } from '../components/BackButton';
import { PriorityBadge, StatusBadge, SeverityBadge } from '../components/Badges';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function EmergencyHistory() {
  const { emergencies, t = {} } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredEmergencies = useMemo(() => {
    return emergencies.filter((e) => {
      const q = searchTerm.toLowerCase().trim();
      const code = String(e.emergency_code || e.id || '').toLowerCase();
      const type = String(e.type || '').toLowerCase();
      const loc = String(e.location?.address || e.location_text || '').toLowerCase();
      const matchesSearch = !q || code.includes(q) || type.includes(q) || loc.includes(q);

      const normStatus = String(e.status || '').toUpperCase().replace(/[-\s]/g, '_');
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && normStatus !== 'RESOLVED' && normStatus !== 'COMPLETED') ||
        (statusFilter === 'RESOLVED' && (normStatus === 'RESOLVED' || normStatus === 'COMPLETED'));

      return matchesSearch && matchesStatus;
    });
  }, [emergencies, searchTerm, statusFilter]);

  return (
    <AppLayout title={t.historyPageTitle || "Emergency History"} subtitle={t.historyPageSubtitle || "All your past emergency reports"}>
      <BackButton fallback="/citizen" />

      <div className="page-header">
        <h1 className="page-title">{t.historyPageTitle || "My Emergency History"}</h1>
        <p className="page-subtitle">{t.historyPageSubtitle || "A verified record of all emergency reports submitted by you."}</p>
      </div>

      {/* Clay Search & Filter Bar */}
      <div className="clay-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="row g-3 align-items-center">
          <div className="col-md-7 col-12">
            <div className="d-flex align-items-center gap-2" style={{
              background: 'var(--er-surface-sunken, #FFFFFF)',
              border: '1.5px solid var(--er-border, #E2E8F0)',
              borderRadius: '14px',
              padding: '8px 14px',
              boxShadow: 'var(--clay-shadow-inset)',
            }}>
              <i className="bi bi-search text-muted"></i>
              <input
                type="text"
                className="w-100 border-0 bg-transparent"
                style={{ outline: 'none', fontSize: '14px', color: 'var(--text-primary, #0F172A)' }}
                placeholder={t.historySearchPlaceholder || "Search by incident code, type, location..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm text-muted p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
          </div>

          <div className="col-md-5 col-12 d-flex gap-2 justify-content-md-end flex-wrap">
            {[
              { id: 'ALL', label: t.historyAll || 'All' },
              { id: 'ACTIVE', label: t.historyActive || 'Active' },
              { id: 'RESOLVED', label: t.historyResolved || 'Resolved' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`clay-button ${statusFilter === tab.id ? 'active' : ''}`}
                style={{
                  fontSize: '12.5px',
                  padding: '7px 16px',
                  minHeight: '38px',
                  borderRadius: '12px',
                  background: statusFilter === tab.id ? 'var(--er-blue-light, #F0F9FF)' : 'var(--er-surface, #FFFFFF)',
                  borderColor: statusFilter === tab.id ? 'var(--er-blue, #0284C7)' : 'var(--er-border, #E2E8F0)',
                  color: statusFilter === tab.id ? 'var(--er-blue, #0284C7)' : 'var(--text-secondary, #475569)',
                  fontWeight: 700,
                }}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Records List */}
      {filteredEmergencies.length === 0 ? (
        <div className="clay-card text-center py-5">
          <i className="bi bi-shield-check text-muted" style={{ fontSize: '48px' }}></i>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '16px', marginBottom: '8px' }}>
            {t.historyEmptyTitle || "No emergency history available"}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
            {searchTerm ? (t.historyNoSearchResults || 'No reports match your search criteria.') : (t.historyNoReports || 'You have not submitted any emergency reports yet.')}
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredEmergencies.map((e) => {
            const emergencyCode = e.emergency_code || e.id;
            const dateStr = (e.created_at || e.createdAt || e.reportedAt)
              ? new Date(e.created_at || e.createdAt || e.reportedAt).toLocaleString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently reported';

            const mediaCount = Number(e.photos_count || 0) + Number(e.videos_count || 0) + (Array.isArray(e.media) ? e.media.length : 0);

            return (
              <div
                key={e.id}
                className="clay-card"
                style={{
                  padding: '20px 24px',
                  cursor: 'pointer',
                  border: '1.5px solid var(--er-border-subtle, #EDF2F7)',
                }}
                onClick={() => navigate(`/emergency/${emergencyCode}`)}
              >
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-2">
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', fontFamily: 'monospace' }}>
                      #{emergencyCode}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '3px 0 0 0' }}>
                      {e.type}
                    </h3>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {e.severity && <SeverityBadge severity={e.severity} />}
                    <PriorityBadge priority={e.priority} />
                    <StatusBadge status={e.status} />
                  </div>
                </div>

                <div className="row g-2 align-items-center mt-2 pt-2 border-top">
                  <div className="col-md-6 col-12">
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-geo-alt-fill text-danger"></i>
                      <span>{e.location?.address || e.location_text || 'GPS Coordinates Provided'}</span>
                    </div>
                  </div>

                  <div className="col-md-3 col-6">
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-calendar3"></i>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="col-md-3 col-6 text-md-end">
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: mediaCount > 0 ? '#F0FDF4' : '#F1F5F9',
                        color: mediaCount > 0 ? '#166534' : '#64748B',
                        border: mediaCount > 0 ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <i className={`bi ${mediaCount > 0 ? 'bi-camera-fill' : 'bi-camera-video-off'}`}></i>
                      <span>{mediaCount > 0 ? `${mediaCount} Media File${mediaCount > 1 ? 's' : ''}` : 'No Media'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
