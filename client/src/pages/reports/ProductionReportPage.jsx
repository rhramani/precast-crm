import { useNavigate } from 'react-router-dom';
import { useGetProductionReportQuery } from '../../store/api/reportApi';

const ProductionReportPage = () => {
  const navigate = useNavigate();
  const { data: prodRes, isLoading } = useGetProductionReportQuery();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading production statistics...</div>;
  }

  const summary = prodRes?.data?.summary;
  const statusBreakdown = prodRes?.data?.statusBreakdown || {};

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
            Casting & Production Analytics
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Overview of branch-wide casting batches, planning achievements, and status distributions.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Summary Card */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📊 Performance Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Casting Batches:</span>
              <strong>{summary?.totalOrders || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Planned Casting:</span>
              <strong>{summary?.totalPlanned?.toLocaleString() || 0} pcs</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Actual Produced:</span>
              <strong>{summary?.totalProduced?.toLocaleString() || 0} pcs</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>Casting Efficiency:</span>
              <strong style={{ color: 'var(--color-primary)' }}>{summary?.efficiencyPercent?.toFixed(1) || 0}%</strong>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            ⚙️ Casting Status Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {Object.keys(statusBreakdown).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No orders logged.</div>
            ) : (
              Object.keys(statusBreakdown).map((status) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                    {status.replace('_', ' ')}
                  </span>
                  <strong>{statusBreakdown[status]}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionReportPage;
