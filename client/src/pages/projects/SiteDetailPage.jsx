import { useParams, useNavigate } from 'react-router-dom';
import { useGetSiteQuery } from '../../store/api/projectApi';
import { useGetDispatchesQuery } from '../../store/api/dispatchApi';
import { useGetExpensesQuery } from '../../store/api/expenseApi';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  Ruler,
  Package,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  Zap,
  Layers,
  Receipt,
  MapPin,
  Calendar,
  Flag,
  ChevronLeft,
  User,
  Phone,
} from 'lucide-react';
import '../../styles/redesignedPages.css';

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
  <div className="detail-card__row">
    <span className="detail-card__label">{label}</span>
    <strong className="detail-card__value">{value || '—'}</strong>
  </div>
);

const SectionCard = ({ icon, title, iconBg = '#dbeafe', children, action, accentClass }) => (
  <div className={`glass-card ${accentClass || ''}`}>
    <div className="detail-card__header">
      <h3 className="detail-card__title">
        <span style={{
          width: 32, height: 32, borderRadius: 9, background: iconBg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </span>
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const SiteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: siteRes, isLoading, error } = useGetSiteQuery(id);
  const { data: dispatchRes } = useGetDispatchesQuery({ limit: 100 });
  const { data: expensesRes } = useGetExpensesQuery({ siteId: id, limit: 100 });

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
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div className="data-table__spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading site details...</div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>
          ⚠️ Failed to load site details.
        </div>
        <button onClick={() => navigate(-1)} className="btn-premium btn-premium--outline">
          <ChevronLeft size={16} /> Go Back
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

  let progressBarClass = 'timeline-widget__progress-bar';
  if (progressPct >= 100 || daysRemaining === 0) {
    progressBarClass = 'timeline-widget__progress-bar timeline-widget__progress-bar--danger';
  } else if (progressPct > 60) {
    progressBarClass = 'timeline-widget__progress-bar timeline-widget__progress-bar--warning';
  }

  return (
    <div className="redesign-layout">

      {/* ── Hero Header ── */}
      <div className="redesign-header">
        <button onClick={() => navigate(-1)} className="redesign-header__back-btn">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="redesign-header__title-area">
          <h1 className="redesign-header__title">
            <MapPin size={22} style={{ flexShrink: 0 }} />
            {site.siteName}
          </h1>
          <p className="redesign-header__subtitle">
            Project: <strong>{site.projectId?.projectName}</strong>
            {site.projectId?.customerId?.customerName && (
              <> &nbsp;·&nbsp; Client: <strong>{site.projectId.customerId.customerName}</strong></>
            )}
          </p>
        </div>
        <div className="redesign-header__actions">
          <StatusBadge status={site.status} />
          {site.siteArea > 0 && (
            <span className="redesign-header__area-pill">
              {site.siteArea} m
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline Progress Bar ── */}
      {startDate && endDate && (
        <div className="timeline-widget">
          <div className="timeline-widget__info">
            <span className="timeline-widget__date">
              <Calendar size={15} />
              Started: <strong style={{ color: 'var(--color-text-primary)', marginLeft: 4 }}>{startDate.toLocaleDateString()}</strong>
            </span>
            <span style={{
              fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)',
              color: daysRemaining === 0 ? 'var(--color-danger)' : daysRemaining < 30 ? 'var(--color-warning)' : 'var(--color-text-primary)',
              background: daysRemaining === 0 ? 'var(--color-danger-bg)' : daysRemaining < 30 ? 'var(--color-warning-bg)' : 'var(--color-primary-light)',
              padding: '4px 12px', borderRadius: '100px',
            }}>
              {daysRemaining !== null ? (
                daysRemaining > 0
                  ? <>{daysRemaining} days remaining</>
                  : <>Deadline passed</>
              ) : null}
            </span>
            <span className="timeline-widget__date">
              <Flag size={15} />
              Target: <strong style={{ color: 'var(--color-text-primary)', marginLeft: 4 }}>{endDate.toLocaleDateString()}</strong>
            </span>
          </div>
          <div className="timeline-widget__progress-container">
            <div className={progressBarClass} style={{ width: `${progressPct}%` }} />
          </div>
          <div className="timeline-widget__meta">
            <span>Progress Status</span>
            <span style={{ fontWeight: 600, color: '#475569' }}>{progressPct}% timeline elapsed</span>
          </div>
        </div>
      )}

      {/* ── KPI Metric Strip ── */}
      <div className="metrics-strip">
        {[
          { label: 'Total Dispatches', value: siteDispatches.length, icon: <Truck size={20} />, variant: 'primary' },
          { label: 'Delivered', value: deliveredDispatches.length, icon: <CheckCircle size={20} />, variant: 'success' },
          { label: 'Pending Dispatch', value: pendingDispatches.length, icon: <Clock size={20} />, variant: 'warning' },
          { label: 'Total Site Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}`, icon: <DollarSign size={20} />, variant: 'danger' },
        ].map((stat, i) => (
          <div key={i} className={`metric-card-redesign metric-card-redesign--${stat.variant}`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="metric-card-redesign__icon-box">{stat.icon}</div>
            <div className="metric-card-redesign__content">
              <div className="metric-card-redesign__label">{stat.label}</div>
              <div className="metric-card-redesign__value">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="detail-grid">

        {/* Site Specifications */}
        <SectionCard
          icon={<Ruler size={16} color="var(--color-info)" />}
          iconBg="var(--color-info-bg)"
          title="Site Specifications"
        >
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
          icon={<Package size={16} color="var(--color-info)" />}
          iconBg="var(--color-info-bg)"
          title="Dispatched Products"
        >
          {Object.keys(productDispatchMap).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Package size={22} color="var(--color-text-disabled)" />
              </div>
              <div className="empty-state__text">No products delivered to this site yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(productDispatchMap).map((prod, i) => (
                <div key={i} className="dispatch-list-item">
                  <div>
                    <div className="dispatch-list-item__title">{prod.name}</div>
                    {prod.code && <div className="dispatch-list-item__subtitle">Code: {prod.code}</div>}
                  </div>
                  <span style={{
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    padding: '4px 12px', borderRadius: '100px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)',
                  }}>
                    {prod.qty} pcs
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Site Expenses Breakdown */}
        <SectionCard
          icon={<DollarSign size={16} color="var(--color-danger)" />}
          iconBg="var(--color-danger-bg)"
          title="Site Expenses Breakdown"
        >
          {siteExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Receipt size={22} color="var(--color-text-disabled)" />
              </div>
              <div className="empty-state__text">No expenses logged for this site yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(expenseByCategory).map(([cat, amt]) => (
                <InfoRow key={cat} label={EXPENSE_LABELS[cat] || cat} value={`₹${amt.toLocaleString('en-IN')}`} />
              ))}
              <div className="expense-total-row">
                <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>Total</strong>
                <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--text-base)' }}>
                  ₹{totalExpenses.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Quick Actions ── */}
      <div className="quick-actions-panel">
        <div className="quick-actions-panel__title">
          <Zap size={16} color="#fbbf24" /> Quick Actions
        </div>
        <div className="quick-actions-panel__buttons">
          <button
            onClick={() => navigate(`/sites/${site._id}/requirement-calculator`)}
            className="btn-premium btn-premium--primary"
          >
            <Layers size={15} /> Compute Material Requirements
          </button>
          <button
            onClick={() => navigate(`/costing/${site._id}`)}
            className="btn-premium btn-premium--secondary"
          >
            <DollarSign size={15} /> View P&L / Costing
          </button>
          <button
            onClick={() => navigate('/dispatch')}
            className="btn-premium btn-premium--secondary"
          >
            <Truck size={15} /> Create Dispatch Order
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="btn-premium btn-premium--secondary"
          >
            <Receipt size={15} /> Log Site Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailPage;
