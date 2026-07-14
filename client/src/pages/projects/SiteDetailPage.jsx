import { useParams, useNavigate } from 'react-router-dom';
import { useGetSiteQuery } from '../../store/api/projectApi';
import { useGetDispatchesQuery } from '../../store/api/dispatchApi';
import { useGetExpensesQuery } from '../../store/api/expenseApi';
import StatusBadge from '../../components/ui/StatusBadge';

const EXPENSE_LABELS = {
  transport: 'Transport',
  fuel: 'Fuel & Generators',
  food: 'Food & Catering',
  consumables: 'Consumables',
  labour_welfare: 'Labour Welfare',
  labour: 'Labour Wages',
  crane: 'Crane',
  jcb: 'JCB',
  accommodation: 'Accommodation',
  other: 'Other',
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{label}</span>
    <strong style={{ fontSize: 'var(--text-sm)', textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</strong>
  </div>
);

const SectionCard = ({ icon, title, children, action }) => (
  <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span> {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const SiteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  // Queries
  const { data: siteRes, isLoading, error } = useGetSiteQuery(id);
  const { data: dispatchRes } = useGetDispatchesQuery({ limit: 100 });
  const { data: expensesRes } = useGetExpensesQuery({ limit: 100 });

  const site = siteRes?.data?.site;

  // Filter dispatches for this site
  const allDispatches = dispatchRes?.data?.dispatches || [];
  const siteDispatches = allDispatches.filter(d => d.siteId?._id === id || d.siteId === id);
  const deliveredDispatches = siteDispatches.filter(d => d.status === 'delivered');
  const pendingDispatches = siteDispatches.filter(d => d.status !== 'delivered');

  // Compute total dispatched items per product
  const productDispatchMap = {};
  deliveredDispatches.forEach(d => {
    (d.items || []).forEach(item => {
      const pName = item.productId?.productName || 'Unknown';
      const pCode = item.productId?.productCode || '';
      const key = pCode || pName;
      if (!productDispatchMap[key]) {
        productDispatchMap[key] = { name: pName, code: pCode, qty: 0 };
      }
      productDispatchMap[key].qty += item.quantity || 0;
    });
  });

  // Filter expenses for this site
  const allExpenses = expensesRes?.data?.expenses || [];
  const siteExpenses = allExpenses.filter(e => e.siteId?._id === id || e.siteId === id);
  const totalExpenses = siteExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Group expenses by category
  const expenseByCategory = {};
  siteExpenses.forEach(e => {
    if (!expenseByCategory[e.expenseCategory]) expenseByCategory[e.expenseCategory] = 0;
    expenseByCategory[e.expenseCategory] += e.amount || 0;
  });

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div className="data-table__spinner" style={{ margin: '0 auto 16px' }} />
        Loading site details...
      </div>
    );
  }

  if (error || !site) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load site details.
        <br />
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ marginTop: '16px' }}>
          ← Back
        </button>
      </div>
    );
  }

  // Timeline calculations
  const now = new Date();
  const startDate = site.startDate ? new Date(site.startDate) : null;
  const endDate = site.endDate ? new Date(site.endDate) : null;
  let progressPct = 0;
  let daysRemaining = null;
  if (startDate && endDate) {
    const total = endDate - startDate;
    const elapsed = now - startDate;
    progressPct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ padding: '6px 14px' }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 2px 0' }}>
            📍 {site.siteName}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Project: <strong>{site.projectId?.projectName}</strong>
            {site.projectId?.customerId?.customerName && (
              <> &nbsp;·&nbsp; Client: <strong>{site.projectId.customerId.customerName}</strong></>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusBadge status={site.status} />
          {site.siteArea > 0 && (
            <span style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {site.siteArea} m
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline Progress Bar ── */}
      {startDate && endDate && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              📅 Started: <strong>{startDate.toLocaleDateString()}</strong>
            </span>
            <span style={{ color: daysRemaining === 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              {daysRemaining !== null ? (
                daysRemaining > 0
                  ? <><strong>{daysRemaining}</strong> days remaining</>
                  : <strong style={{ color: 'var(--color-danger)' }}>Deadline passed</strong>
              ) : null}
            </span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              🏁 Target: <strong>{endDate.toLocaleDateString()}</strong>
            </span>
          </div>
          <div style={{ background: 'var(--color-border)', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: '20px',
              background: progressPct >= 100 ? 'var(--color-danger)' : progressPct > 60 ? 'var(--color-warning)' : 'var(--color-success)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {progressPct}% timeline elapsed
          </div>
        </div>
      )}

      {/* ── Summary KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Dispatches', value: siteDispatches.length, icon: '🚛', color: 'var(--color-primary)' },
          { label: 'Delivered', value: deliveredDispatches.length, icon: '✅', color: 'var(--color-success)' },
          { label: 'Pending Dispatch', value: pendingDispatches.length, icon: '⏳', color: 'var(--color-warning)' },
          { label: 'Total Site Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}`, icon: '💸', color: 'var(--color-danger)' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderLeft: `3px solid ${stat.color}`, borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>

        {/* Site Specifications */}
        <SectionCard icon="📐" title="Site Specifications">
          <InfoRow label="Site Address" value={site.siteAddress} />
          <InfoRow label="Site Engineer" value={site.siteEngineer} />
          <InfoRow label="Contact Number" value={site.contactNumber} />
          <InfoRow label="Wall Length / Area" value={site.siteArea ? `${site.siteArea} meters` : '—'} />
          <InfoRow label="Start Date" value={startDate ? startDate.toLocaleDateString() : '—'} />
          <InfoRow label="End Date" value={endDate ? endDate.toLocaleDateString() : '—'} />
          <InfoRow label="Status" value={site.status?.replace('_', ' ').toUpperCase()} />
        </SectionCard>

        {/* Dispatched Products Summary */}
        <SectionCard
          icon="🏗️"
          title="Dispatched Products"
          action={
            <button
              onClick={() => navigate('/dispatch')}
              className="btn btn--secondary btn--sm"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              View All Dispatches
            </button>
          }
        >
          {Object.keys(productDispatchMap).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              No products delivered to this site yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.values(productDispatchMap).map((prod, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface-hover)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{prod.name}</div>
                    {prod.code && <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Code: {prod.code}</div>}
                  </div>
                  <span style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                    {prod.qty} pcs delivered
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Site Expenses Breakdown */}
        <SectionCard
          icon="💸"
          title="Site Expenses Breakdown"
          action={
            <button
              onClick={() => navigate('/expenses')}
              className="btn btn--secondary btn--sm"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              + Log Expense
            </button>
          }
        >
          {siteExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              No expenses logged for this site yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(expenseByCategory).map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {EXPENSE_LABELS[cat] || cat}
                  </span>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>₹{amt.toLocaleString('en-IN')}</strong>
                </div>
              ))}
              <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Total</strong>
                <strong style={{ color: 'var(--color-danger)', fontSize: 'var(--text-base)' }}>
                  ₹{totalExpenses.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Quick Action Buttons ── */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', padding: '20px',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-base)', fontWeight: 600 }}>
          ⚡ Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/sites/${site._id}/requirement-calculator`)}
            className="btn btn--primary"
            style={{ padding: '10px 20px' }}
          >
            📊 Compute Material Requirements
          </button>
          <button
            onClick={() => navigate(`/costing/${site._id}`)}
            className="btn btn--secondary"
            style={{ padding: '10px 20px', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
          >
            💸 View P&L / Costing
          </button>
          <button
            onClick={() => navigate('/dispatch')}
            className="btn btn--secondary"
            style={{ padding: '10px 20px' }}
          >
            🚛 Create Dispatch Order
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="btn btn--secondary"
            style={{ padding: '10px 20px' }}
          >
            🧾 Log Site Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailPage;
