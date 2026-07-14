import { useParams, useNavigate } from 'react-router-dom';
import { useGetSiteCostingQuery } from '../../store/api/costingApi';
import StatusBadge from '../../components/ui/StatusBadge';

const ProjectCostingPage = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();

  // Query
  const { data: costingRes, isLoading, error } = useGetSiteCostingQuery(siteId);
  const data = costingRes?.data;

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Evaluating actual site costs and margin shares...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Costing evaluation failed: {error?.data?.message || 'Site not found'}
        <br />
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ marginTop: '16px' }}>Back</button>
      </div>
    );
  }

  const { site, revenue, estimated, actual, margin } = data;
  const marginColor = margin.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Project Costing & Margin Engine
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Project: <strong>{site.projectName}</strong> | Site: <strong>{site.siteName}</strong> ({site.siteArea} meters)
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusBadge status={site.status} />
        </div>
      </div>

      {/* Margin Breakdown Banner */}
      <div
        className="card"
        style={{
          background: 'var(--color-surface)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Allocated Site Revenue
          </span>
          <h2 style={{ margin: '4px 0 0 0' }}>
            ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Incurred Actual Cost
          </span>
          <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-text-primary)' }}>
            ₹{actual.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Estimated Target Cost
          </span>
          <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            ₹{estimated.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Project Profit Margin
          </span>
          <h2 style={{ margin: '4px 0 0 0', color: marginColor }}>
            ₹{margin.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({margin.percent.toFixed(2)}%)
          </h2>
        </div>
      </div>

      {/* Comparisons and logs grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Estimations vs Actuals comparison card */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            📊 Cost Overruns Analysis
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Quoted Estimate Cost</span>
              <strong>₹{estimated.totalCost.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Actual Incurred Cost</span>
              <strong style={{ color: actual.totalCost > estimated.totalCost ? 'var(--color-danger)' : 'var(--color-success)' }}>
                ₹{actual.totalCost.toLocaleString()}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <span>Cost Variance</span>
              <span style={{ fontWeight: 'bold', color: (actual.totalCost - estimated.totalCost) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                ₹{(actual.totalCost - estimated.totalCost).toLocaleString()} (
                {estimated.totalCost > 0 ? (((actual.totalCost - estimated.totalCost) / estimated.totalCost) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Incurred cost itemizations */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            🛠️ Cost Breakdown (Actuals)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Material Valuation (BOM-derived)</span>
              <strong>₹{actual.materialCost.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Labour Logs Wages</span>
              <strong>₹{actual.laborCost.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Direct site Expenses</span>
              <strong>₹{actual.expenseCost.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
              <span>Total Actual Costs</span>
              <strong>₹{actual.totalCost.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCostingPage;
