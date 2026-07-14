import { useNavigate } from 'react-router-dom';
import { useGetProjectReportQuery } from '../../store/api/reportApi';

const ProjectReportPage = () => {
  const navigate = useNavigate();
  const { data: projRes, isLoading } = useGetProjectReportQuery();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading project portfolios...</div>;
  }

  const overallSitesBreakdown = projRes?.data?.overallSitesBreakdown || {};
  const projects = projRes?.data?.projects || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/reports')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Reports
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Project & Site Analytics
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Overview of ongoing projects, site installations progress, and total valuations breakdown.
          </p>
        </div>
      </div>

      {/* Status Breakdown Grid */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
          📐 Site Progress Distribution
        </h3>
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
          {Object.keys(overallSitesBreakdown).length === 0 ? (
            <div style={{ color: 'var(--color-text-secondary)' }}>No sites logged.</div>
          ) : (
            Object.keys(overallSitesBreakdown).map((status) => (
              <div key={status} style={{ background: 'var(--color-bg)', padding: '16px 24px', borderRadius: 'var(--radius-sm)', minWidth: '160px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {status.replace('_', ' ')}
                </span>
                <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-primary-dark)' }}>
                  {overallSitesBreakdown[status]} sites
                </h2>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Projects List Table */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
          📐 Projects Portfolio
        </h3>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Project Name</th>
                <th style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>Client</th>
                <th style={{ padding: '8px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Sites Count</th>
                <th style={{ padding: '8px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Project Valuation</th>
                <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Sites Status Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No active projects.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.projectId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 0' }}>{p.projectName}</td>
                    <td style={{ padding: '12px' }}>{p.customerName}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{p.sitesCount} sites</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{p.valuation?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Planned: {p.sitesBreakdown?.planned || 0} | In Progress: {p.sitesBreakdown?.in_progress || 0} | Completed: {p.sitesBreakdown?.completed || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportPage;
