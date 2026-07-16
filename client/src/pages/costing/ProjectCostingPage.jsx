import { useParams, useNavigate } from 'react-router-dom';
import { useGetSiteCostingQuery, useGetProjectCostingQuery } from '../../store/api/costingApi';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  TrendingUp,
  DollarSign,
  Coins,
  ChevronLeft,
  PieChart,
  ShieldCheck,
  IndianRupee,
  Target,
  TrendingDown,
} from 'lucide-react';
import '../../styles/redesignedPages.css';

const ProjectCostingPage = () => {
  const { siteId, projectId } = useParams();
  const navigate = useNavigate();
  const isProject = !!projectId;

  const { data: siteCostingRes, isLoading: isSiteLoading, error: siteError } = useGetSiteCostingQuery(siteId, { skip: isProject });
  const { data: projectCostingRes, isLoading: isProjectLoading, error: projectError } = useGetProjectCostingQuery(projectId, { skip: !isProject });

  const isLoading = isProject ? isProjectLoading : isSiteLoading;
  const error = isProject ? projectError : siteError;
  const data = isProject ? projectCostingRes?.data : siteCostingRes?.data;

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div className="data-table__spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          {isProject ? 'Aggregating project rollup costing...' : 'Evaluating actual site costs and margin shares...'}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>
          ⚠️ Costing evaluation failed: {error?.data?.message || 'Report not found'}
        </div>
        <button onClick={() => navigate(-1)} className="btn-premium btn-premium--outline">
          <ChevronLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const { revenue, estimated, actual, margin } = data;
  const marginColor = margin.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  const marginBg    = margin.amount >= 0
    ? 'var(--color-success-bg)'
    : 'var(--color-danger-bg)';

  const variance = actual.totalCost - estimated.totalCost;
  const pctOfBudget = estimated.totalCost > 0
    ? Math.min(100, Math.round((actual.totalCost / estimated.totalCost) * 100))
    : 0;

  const displaySubtitle = isProject 
    ? `Client: ${data.project?.customerName || data.project?.companyName || '—'}`
    : `Project: ${data.site?.projectName} | Site: ${data.site?.siteName} (${data.site?.siteArea} meters)`;

  const kpiItems = [
    {
      label: isProject ? 'Project Grand Revenue' : 'Allocated Site Revenue',
      value: `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <IndianRupee size={18} />,
      note: isProject ? 'Total accepted quotations revenue' : 'Quoted revenue for this site',
    },
    {
      label: isProject ? 'Total Project Actual Cost' : 'Total Actual Cost',
      value: `₹${actual.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign size={18} />,
      note: 'Incurred cost to date',
    },
    {
      label: isProject ? 'Project Budget Target' : 'Estimated Target Cost',
      value: `₹${estimated.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: <Target size={18} />,
      note: isProject ? 'Aggregated estimated budget' : 'Planned budget for site',
    },
    {
      label: isProject ? 'Project profit Margin' : 'Site Profit Margin',
      value: `₹${margin.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${margin.percent.toFixed(2)}%)`,
      icon: margin.amount >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
      note: margin.amount >= 0 ? 'Profitable' : 'Loss incurred',
      customValue: true,
      marginColor,
      marginBg,
    },
  ];

  return (
    <div className="redesign-layout">

      {/* ── Header ── */}
      <div className="redesign-header">
        <button onClick={() => navigate(-1)} className="redesign-header__back-btn">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="redesign-header__title-area">
          <h1 className="redesign-header__title">
            <Coins size={22} style={{ flexShrink: 0 }} />
            {isProject ? 'Project Costing & Margin Engine' : 'Site Costing & Margin Engine'}
          </h1>
          <p className="redesign-header__subtitle">
            {isProject ? `Project: ${data.project?.projectName} Rollup` : `Project: ${data.site?.projectName}`}
          </p>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {displaySubtitle}
          </div>
        </div>
        <div className="redesign-header__actions">
          <StatusBadge status={isProject ? data.project?.status : data.site?.status} />
        </div>
      </div>

      {/* ── KPI Overview Strip ── */}
      <div className="costing-overview-grid">
        {kpiItems.map((item, i) => (
          <div key={i} className="costing-overview-item">
            <div className="costing-overview-item__icon">
              {item.icon}
            </div>
            <div className="costing-overview-item__label">{item.label}</div>
            {item.customValue ? (
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                marginTop: 6,
                color: item.marginColor,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>
                {item.value}
              </div>
            ) : (
              <div className="costing-overview-item__value">{item.value}</div>
            )}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 5, fontWeight: 500 }}>
              {item.note}
            </div>
          </div>
        ))}
      </div>

      {/* ── Analysis Cards Grid ── */}
      <div className="detail-grid">

        {/* Cost Overruns Analysis */}
        <div className="glass-card costing-card--shield">
          <div className="detail-card__header">
            <h3 className="detail-card__title">
              <span style={{
                width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                background: 'var(--color-info-bg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ShieldCheck size={16} color="var(--color-info)" />
              </span>
              Cost Overruns Analysis
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="detail-card__row">
              <span className="detail-card__label">Planned Estimate Cost</span>
              <strong className="detail-card__value">
                ₹{estimated.totalCost.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="detail-card__row">
              <span className="detail-card__label">Actual Incurred Cost</span>
              <strong className="detail-card__value" style={{
                color: actual.totalCost > estimated.totalCost ? 'var(--color-danger)' : 'var(--color-success)',
              }}>
                ₹{actual.totalCost.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="detail-card__row" style={{ borderBottom: 'none' }}>
              <span className="detail-card__label">Cost Variance</span>
              <strong className="detail-card__value" style={{
                color: variance > 0 ? 'var(--color-danger)' : 'var(--color-success)',
              }}>
                ₹{variance.toLocaleString('en-IN')} (
                {estimated.totalCost > 0 ? ((variance / estimated.totalCost) * 100).toFixed(1) : 0}%)
              </strong>
            </div>
          </div>

          {/* Budget Status Widget */}
          <div className="cost-variance-widget" style={{ marginTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Budget Allocation Status</span>
              <span style={{ color: variance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {pctOfBudget}% {variance > 0 ? '— Overrun Alert 🔴' : '— Within Budget ✅'}
              </span>
            </div>
            <div className="cost-variance-widget__scale">
              <div
                className={`cost-variance-widget__indicator ${variance > 0 ? 'cost-variance-widget__indicator--overrun' : 'cost-variance-widget__indicator--savings'}`}
                style={{ width: `${pctOfBudget}%` }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              {pctOfBudget}% of target budget has been consumed
            </div>
          </div>
        </div>

        {/* Cost Breakdown (Actuals) */}
        <div className="glass-card costing-card--piechart">
          <div className="detail-card__header">
            <h3 className="detail-card__title">
              <span style={{
                width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                background: 'var(--chip-purple-bg)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <PieChart size={16} color="var(--chip-purple-icon)" />
              </span>
              Cost Breakdown (Actuals)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { label: 'Material Cost (BOM-Derived)', value: actual.materialCost, accent: 'var(--color-info)' },
              { label: 'Labour Cost (Wages)',          value: actual.laborCost,    accent: 'var(--chip-purple-icon)' },
              { label: 'Direct Site Expenses',         value: actual.expenseCost,  accent: 'var(--color-warning)' },
            ].map((item, i) => (
              <div key={i} className="detail-card__row">
                <span className="detail-card__label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.accent, display: 'inline-block', flexShrink: 0 }} />
                  {item.label}
                </span>
                <strong className="detail-card__value">₹{item.value.toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>

          {/* Total Row */}
          <div className="expense-total-row" style={{ marginTop: '18px' }}>
            <strong style={{ color: 'var(--color-primary-dark)', fontSize: 'var(--text-sm)' }}>Total Actual Cost</strong>
            <strong style={{ color: 'var(--chip-purple-icon)', fontSize: 'var(--text-lg)', letterSpacing: '-0.01em' }}>
              ₹{actual.totalCost.toLocaleString('en-IN')}
            </strong>
          </div>

          {/* Visual cost share bars */}
          {actual.totalCost > 0 && (
            <div style={{ marginTop: '18px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Cost Share
              </div>
              {[
                { label: 'Material', value: actual.materialCost, color: 'var(--color-info)' },
                { label: 'Labour',   value: actual.laborCost,    color: 'var(--chip-purple-icon)' },
                { label: 'Expenses', value: actual.expenseCost,  color: 'var(--color-warning)' },
              ].map((item, i) => {
                const pct = actual.totalCost > 0 ? Math.round((item.value / actual.totalCost) * 100) : 0;
                return (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>{item.label}</span>
                      <span style={{ color: item.color }}>{pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: item.color,
                        borderRadius: '4px',
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Individual Sites breakdown (Project Rollup only) ── */}
      {isProject && data.sites && data.sites.length > 0 && (
        <div className="glass-card--no-hover" style={{ marginTop: '24px', borderTop: '3px solid var(--color-primary)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--color-primary-dark)', fontWeight: 700 }}>
            Individual Sites P&L Breakdown
          </h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr className="data-table__head">
                  <th className="data-table__th">Site Name</th>
                  <th className="data-table__th">Length</th>
                  <th className="data-table__th">Status</th>
                  <th className="data-table__th">Allocated Revenue</th>
                  <th className="data-table__th">Actual Cost</th>
                  <th className="data-table__th">Margin (Profit)</th>
                </tr>
              </thead>
              <tbody>
                {data.sites.map((s, idx) => (
                  <tr key={idx} className="data-table__row">
                    <td className="data-table__td" style={{ fontWeight: 600 }}>{s.siteName}</td>
                    <td className="data-table__td">{s.siteArea} m</td>
                    <td className="data-table__td">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="data-table__td">₹{s.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="data-table__td">₹{s.actualCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="data-table__td" style={{
                      color: s.marginAmount >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 700
                    }}>
                      ₹{s.marginAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({s.marginPercent.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCostingPage;
