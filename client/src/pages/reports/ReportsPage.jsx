import { useState } from 'react';
import {
  useGetProductionReportQuery,
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetProjectReportQuery,
  useGetFinancialReportQuery,
} from '../../store/api/reportApi';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import './ReportsPage.css';

// ── XLSX export helper ──────────────────────────────────────────────────
const exportReportToXLSX = async (sheetName, headers, rows) => {
  const XLSX = await import('xlsx');
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  const filename = `${sheetName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// ── Tab definitions — icons match sidebar ICON_MAP wireframe style ───────
const TABS = [
  {
    key: 'financial',
    label: 'Financial Report',
    icon: (
      // Payments icon from ICON_MAP — currency / dollar sign
      <svg viewBox="0 0 24 24" className="rpt-tab__icon">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    key: 'production',
    label: 'Production Report',
    icon: (
      // Production / factory icon from ICON_MAP
      <svg viewBox="0 0 24 24" className="rpt-tab__icon">
        <path d="M22 21H2V9l5 4V9l5 4V9l10 6v6z" />
      </svg>
    ),
  },
  {
    key: 'inventory',
    label: 'Inventory Report',
    icon: (
      // Products / 3D box icon from ICON_MAP
      <svg viewBox="0 0 24 24" className="rpt-tab__icon">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    key: 'customer',
    label: 'Customer Outstanding',
    icon: (
      // Customers / people icon from ICON_MAP
      <svg viewBox="0 0 24 24" className="rpt-tab__icon">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'projects',
    label: 'Project Analytics',
    icon: (
      // Projects / grid icon from ICON_MAP
      <svg viewBox="0 0 24 24" className="rpt-tab__icon">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M3 9h18M9 15h12M9 9l6 6" />
      </svg>
    ),
  },
];

// ── Shared Export Button ────────────────────────────────────────────────
const ExportBtn = ({ onClick, disabled }) => (
  <button
    className="rpt-export-btn"
    onClick={onClick}
    disabled={disabled}
    title="Export to Excel (.xlsx)"
  >
    <svg viewBox="0 0 24 24" className="rpt-export-btn__icon">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    Export XLSX
  </button>
);

// ── KPI Card helper ─────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = '' }) => (
  <div className={`rpt-kpi-card ${color ? `rpt-kpi-card--${color}` : ''}`}>
    <div className="rpt-kpi-label">{label}</div>
    <div className="rpt-kpi-value">{value}</div>
    {sub && <div className="rpt-kpi-sub">{sub}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: FINANCIAL REPORT
// ═══════════════════════════════════════════════════════════════════════
const FinancialTab = () => {
  const { data: finRes, isLoading } = useGetFinancialReportQuery();

  const handleExport = () => {
    const d = finRes?.data;
    exportReportToXLSX('Financial Report', ['Metric', 'Value'], [
      ['Net Operating Earnings', d?.profitability?.netEarnings ?? ''],
      ['Operating Margin (%)', d?.profitability?.marginPercent ?? ''],
      ['Total Invoiced Sales', d?.revenue?.totalInvoiced ?? ''],
      ['Total Cash Received', d?.revenue?.totalReceivedCash ?? ''],
      ['Materials Purchase Cost', d?.expenses?.materialsPurchasesCost ?? ''],
      ['Labour Cost', d?.expenses?.labourCost ?? ''],
      ['Direct Expenses', d?.expenses?.directExpenses ?? ''],
      ['Total Operating Costs', d?.expenses?.totalOperatingCosts ?? ''],
    ]);
  };

  const d = finRes?.data;
  const isPositive = (d?.profitability?.netEarnings ?? 0) >= 0;

  const tableData = d
    ? [
        { metric: 'Total Invoiced Sales', category: 'Revenue', value: `₹${d.revenue?.totalInvoiced?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Total Cash Received', category: 'Revenue', value: `₹${d.revenue?.totalReceivedCash?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Materials Purchase Cost (POs received)', category: 'Expenses', value: `₹${d.expenses?.materialsPurchasesCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Labour / Wages (Installation crew)', category: 'Expenses', value: `₹${d.expenses?.labourCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Direct Site Expenses', category: 'Expenses', value: `₹${d.expenses?.directExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Total Operating Costs', category: 'Summary', value: `₹${d.expenses?.totalOperatingCosts?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Net Operating Earnings', category: 'Summary', value: `₹${d.profitability?.netEarnings?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { metric: 'Operating Margin', category: 'Summary', value: `${d.profitability?.marginPercent?.toFixed(2)}%` },
      ]
    : [];

  const columns = [
    {
      key: 'metric',
      label: 'Metric',
      render: (val, row) => (
        <span style={{ fontWeight: row.category === 'Summary' ? 700 : 400 }}>{val}</span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (val) => {
        const colors = { Revenue: 'var(--color-success)', Expenses: 'var(--color-danger)', Summary: 'var(--color-primary)' };
        return (
          <code style={{ fontSize: '12px', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '4px', color: colors[val] || 'inherit' }}>
            {val}
          </code>
        );
      },
    },
    {
      key: 'value',
      label: 'Amount',
      render: (val, row) => (
        <strong style={{ color: row.category === 'Revenue' ? 'var(--color-success)' : row.category === 'Expenses' ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
          {val}
        </strong>
      ),
    },
  ];

  return (
    <div className="rpt-tab-content animate-fade-in">
      {/* Hero Card */}
      <div className="rpt-hero-card" style={{ borderLeftColor: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
        <div>
          <div className="rpt-hero-card__label">Net Operating Earnings</div>
          <div className={`rpt-hero-card__value ${isPositive ? 'rpt-hero-card__value--positive' : 'rpt-hero-card__value--negative'}`}>
            ₹{d?.profitability?.netEarnings?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '—'}
          </div>
          <div className="rpt-hero-card__margin">
            Operating Margin: <strong>{d?.profitability?.marginPercent?.toFixed(2) ?? '—'}%</strong>
          </div>
        </div>
        <div className="rpt-hero-divider" />
        <div className="rpt-hero-stat">
          <span className="rpt-hero-stat__label">Total Invoiced</span>
          <span className="rpt-hero-stat__value">₹{d?.revenue?.totalInvoiced?.toLocaleString('en-IN') ?? '—'}</span>
        </div>
        <div className="rpt-hero-divider" />
        <div className="rpt-hero-stat">
          <span className="rpt-hero-stat__label">Cash Received</span>
          <span className="rpt-hero-stat__value">₹{d?.revenue?.totalReceivedCash?.toLocaleString('en-IN') ?? '—'}</span>
        </div>
        <div className="rpt-hero-divider" />
        <div className="rpt-hero-stat">
          <span className="rpt-hero-stat__label">Total Costs</span>
          <span className="rpt-hero-stat__value" style={{ color: 'var(--color-danger)' }}>₹{d?.expenses?.totalOperatingCosts?.toLocaleString('en-IN') ?? '—'}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="rpt-kpi-row">
        <KpiCard label="Materials Procurement" value={`₹${(d?.expenses?.materialsPurchasesCost ?? 0).toLocaleString('en-IN')}`} color="orange" sub="Purchase orders received" />
        <KpiCard label="Labour / Wages" value={`₹${(d?.expenses?.labourCost ?? 0).toLocaleString('en-IN')}`} color="purple" sub="Installation crew wages" />
        <KpiCard label="Direct Site Expenses" value={`₹${(d?.expenses?.directExpenses ?? 0).toLocaleString('en-IN')}`} color="red" sub="Site-level costs" />
      </div>

      {/* Section header with export */}
      <div className="rpt-section-header">
        <h3 className="rpt-section-title">Financial Breakdown</h3>
        <ExportBtn onClick={handleExport} disabled={isLoading || !finRes} />
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        limit={20}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={tableData.length}
        emptyMessage="No financial data available yet."
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: PRODUCTION REPORT
// ═══════════════════════════════════════════════════════════════════════
const ProductionTab = () => {
  const { data: prodRes, isLoading } = useGetProductionReportQuery();

  const handleExport = () => {
    const s = prodRes?.data?.summary;
    const sb = prodRes?.data?.statusBreakdown || {};
    const rows = [
      ['Total Casting Batches', s?.totalOrders ?? ''],
      ['Planned Casting (Pcs)', s?.totalPlanned ?? ''],
      ['Actual Produced (Pcs)', s?.totalProduced ?? ''],
      ['Casting Efficiency (%)', s?.efficiencyPercent ?? ''],
      ...Object.entries(sb).map(([status, count]) => [`Status: ${status}`, count]),
    ];
    exportReportToXLSX('Production Report', ['Metric', 'Value'], rows);
  };

  const s = prodRes?.data?.summary;
  const sb = prodRes?.data?.statusBreakdown || {};

  const statusRows = Object.entries(sb).map(([status, count]) => ({ status, count }));

  const statusColumns = [
    {
      key: 'status',
      label: 'Casting Stage',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'count',
      label: 'Order Count',
      render: (val) => <strong>{val}</strong>,
    },
  ];

  return (
    <div className="rpt-tab-content animate-fade-in">
      <div className="rpt-kpi-row">
        <KpiCard label="Total Casting Batches" value={s?.totalOrders ?? '—'} color="blue" sub="All production orders" />
        <KpiCard label="Planned Volume (Pcs)" value={`${(s?.totalPlanned ?? 0).toLocaleString()} pcs`} color="orange" sub="Targeted output" />
        <KpiCard label="Actual Produced (Pcs)" value={`${(s?.totalProduced ?? 0).toLocaleString()} pcs`} color="green" sub="Real output" />
        <KpiCard label="Casting Efficiency" value={`${(s?.efficiencyPercent ?? 0).toFixed(1)}%`} color={parseFloat(s?.efficiencyPercent ?? 0) >= 90 ? 'green' : 'orange'} sub="Produced vs planned" />
      </div>

      <div className="rpt-section-header">
        <h3 className="rpt-section-title">Casting Status Distribution</h3>
        <ExportBtn onClick={handleExport} disabled={isLoading || !prodRes} />
      </div>

      <DataTable
        columns={statusColumns}
        data={statusRows}
        isLoading={isLoading}
        limit={20}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={statusRows.length}
        emptyMessage="No production data available yet."
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: INVENTORY REPORT
// ═══════════════════════════════════════════════════════════════════════
const InventoryTab = () => {
  const { data: invRes, isLoading } = useGetInventoryReportQuery();

  const handleExport = () => {
    const rm = invRes?.data?.rawMaterials;
    const fg = invRes?.data?.finishedGoods;
    const summaryRows = [
      ['Raw Material — Unique Items', rm?.totalItems ?? ''],
      ['Raw Material — Valuation (₹)', rm?.valuation ?? ''],
      ['Raw Material — Low Stock Alerts', rm?.lowStockAlerts ?? ''],
      ['Finished Goods — Unique Designs', fg?.totalItems ?? ''],
      ['Finished Goods — Valuation (₹)', fg?.valuation ?? ''],
    ];
    const itemRows = (fg?.items || []).map((it) => [it.productName, it.productCode, it.available, it.dispatchReady, it.reserved]);
    const allRows = [
      ...summaryRows,
      [],
      ['Product', 'Code', 'Available', 'Dispatch Ready', 'Reserved'],
      ...itemRows,
    ];
    exportReportToXLSX('Inventory Report', ['Metric / Field', 'Value / Detail'], allRows);
  };

  const rm = invRes?.data?.rawMaterials;
  const fg = invRes?.data?.finishedGoods;
  const fgItems = fg?.items || [];

  const columns = [
    {
      key: 'productCode',
      label: 'Code',
      render: (val) => (
        <code style={{ fontSize: '12px', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-success)' }}>
          {val}
        </code>
      ),
    },
    { key: 'productName', label: 'Product Name' },
    {
      key: 'available',
      label: 'Available',
      render: (val) => <strong style={{ color: 'var(--color-success)' }}>{val} pcs</strong>,
    },
    {
      key: 'dispatchReady',
      label: 'Dispatch Ready',
      render: (val) => <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{val} pcs</span>,
    },
    {
      key: 'reserved',
      label: 'Reserved',
      render: (val) => `${val} pcs`,
    },
  ];

  return (
    <div className="rpt-tab-content animate-fade-in">
      <div className="rpt-kpi-row">
        <KpiCard label="Raw Material Items" value={rm?.totalItems ?? '—'} color="blue" sub="Unique materials tracked" />
        <KpiCard label="Raw Stock Valuation" value={`₹${(rm?.valuation ?? 0).toLocaleString('en-IN')}`} color="green" sub="Current market value" />
        <KpiCard
          label="Low Stock Alerts"
          value={rm?.lowStockAlerts ?? '—'}
          color={rm?.lowStockAlerts > 0 ? 'red' : 'green'}
          sub="Materials below minimum"
        />
        <KpiCard label="Finished Goods Designs" value={fg?.totalItems ?? '—'} color="purple" sub="Unique cast designs" />
        <KpiCard label="Finished Goods Valuation" value={`₹${(fg?.valuation ?? 0).toLocaleString('en-IN')}`} color="orange" sub="BOM-based stock value" />
      </div>

      <div className="rpt-section-header">
        <h3 className="rpt-section-title">Finished Products Stock List</h3>
        <ExportBtn onClick={handleExport} disabled={isLoading || !invRes} />
      </div>

      <DataTable
        columns={columns}
        data={fgItems}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={fgItems.length}
        emptyMessage="No finished goods records found. Complete a production order to populate stock."
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: CUSTOMER OUTSTANDING
// ═══════════════════════════════════════════════════════════════════════
const CustomerTab = () => {
  const { data: custRes, isLoading } = useGetCustomerReportQuery();

  const handleExport = () => {
    const rows = (custRes?.data?.customers || []).map((c) => [
      c.customerName,
      c.companyName || '',
      c.totalInvoiced ?? '',
      c.totalPaid ?? '',
      c.outstanding ?? '',
    ]);
    exportReportToXLSX('Customer Outstanding', ['Customer Name', 'Company', 'Total Invoiced (₹)', 'Total Paid (₹)', 'Outstanding (₹)'], rows);
  };

  const customers = custRes?.data?.customers || [];
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding || 0), 0);
  const totalInvoiced = customers.reduce((sum, c) => sum + (c.totalInvoiced || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
  const overdueCount = customers.filter((c) => c.outstanding > 0).length;

  const columns = [
    { key: 'customerName', label: 'Customer Name' },
    {
      key: 'companyName',
      label: 'Company',
      render: (val) => val || <span style={{ color: 'var(--color-text-secondary)' }}>—</span>,
    },
    {
      key: 'totalInvoiced',
      label: 'Total Invoiced',
      render: (val) => <strong>₹{val?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>,
    },
    {
      key: 'totalPaid',
      label: 'Total Paid',
      render: (val) => <span style={{ color: 'var(--color-success)' }}>₹{val?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'outstanding',
      label: 'Outstanding Balance',
      render: (val) => (
        <strong style={{ color: val > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
          ₹{val?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </strong>
      ),
    },
  ];

  return (
    <div className="rpt-tab-content animate-fade-in">
      <div className="rpt-kpi-row">
        <KpiCard label="Total Invoiced" value={`₹${totalInvoiced.toLocaleString('en-IN')}`} color="blue" sub="All non-cancelled invoices" />
        <KpiCard label="Total Collected" value={`₹${totalPaid.toLocaleString('en-IN')}`} color="green" sub="Payments received" />
        <KpiCard label="Total Outstanding" value={`₹${totalOutstanding.toLocaleString('en-IN')}`} color={totalOutstanding > 0 ? 'red' : 'green'} sub="Accounts receivable balance" />
        <KpiCard label="Overdue Customers" value={overdueCount} color={overdueCount > 0 ? 'orange' : 'green'} sub="With pending balance" />
      </div>

      <div className="rpt-section-header">
        <h3 className="rpt-section-title">Customer Outstanding Statement</h3>
        <ExportBtn onClick={handleExport} disabled={isLoading || !custRes} />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={customers.length}
        emptyMessage="No sales history recorded yet."
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB 5: PROJECT ANALYTICS
// ═══════════════════════════════════════════════════════════════════════
const ProjectsTab = () => {
  const { data: projRes, isLoading } = useGetProjectReportQuery();

  const handleExport = () => {
    const rows = (projRes?.data?.projects || []).map((p) => [
      p.projectName,
      p.customerName,
      p.sitesCount,
      p.valuation ?? '',
      `P:${p.sitesBreakdown?.planned || 0} IP:${p.sitesBreakdown?.in_progress || 0} C:${p.sitesBreakdown?.completed || 0}`,
    ]);
    exportReportToXLSX('Project Analytics', ['Project Name', 'Client', 'Sites', 'Valuation (₹)', 'Status Breakdown'], rows);
  };

  const projects = projRes?.data?.projects || [];
  const sitesBreakdown = projRes?.data?.overallSitesBreakdown || {};
  const totalValuation = projects.reduce((sum, p) => sum + (p.valuation || 0), 0);
  const totalSites = projects.reduce((sum, p) => sum + (p.sitesCount || 0), 0);

  const columns = [
    { key: 'projectName', label: 'Project Name' },
    {
      key: 'customerName',
      label: 'Client',
      render: (val) => val || <span style={{ color: 'var(--color-text-secondary)' }}>—</span>,
    },
    {
      key: 'sitesCount',
      label: 'Sites',
      render: (val) => (
        <code style={{ fontSize: '12px', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
          {val} {val === 1 ? 'site' : 'sites'}
        </code>
      ),
    },
    {
      key: 'valuation',
      label: 'Project Valuation',
      render: (val) =>
        val ? (
          <strong>₹{val?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>No accepted quote</span>
        ),
    },
    {
      key: 'sitesBreakdown',
      label: 'Sites Breakdown',
      render: (val) => (
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          P: {val?.planned || 0} &nbsp;|&nbsp; IP: {val?.in_progress || 0} &nbsp;|&nbsp; C: {val?.completed || 0}
        </span>
      ),
    },
  ];

  return (
    <div className="rpt-tab-content animate-fade-in">
      <div className="rpt-kpi-row">
        <KpiCard label="Total Projects" value={projects.length} color="blue" sub="In portfolio" />
        <KpiCard label="Total Sites" value={totalSites} color="orange" sub="Across all projects" />
        <KpiCard label="Portfolio Valuation" value={`₹${totalValuation.toLocaleString('en-IN')}`} color="green" sub="From accepted quotations" />
      </div>

      {/* Sites breakdown chips */}
      {Object.keys(sitesBreakdown).length > 0 && (
        <div className="rpt-sites-row">
          {Object.entries(sitesBreakdown).map(([status, count]) => (
            <div key={status} className="rpt-site-chip">
              <div className="rpt-site-chip__label">{status.replace('_', ' ')}</div>
              <div className="rpt-site-chip__value">{count} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-secondary)' }}>sites</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="rpt-section-header">
        <h3 className="rpt-section-title">Projects Portfolio</h3>
        <ExportBtn onClick={handleExport} disabled={isLoading || !projRes} />
      </div>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={projects.length}
        emptyMessage="No active projects found."
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('financial');

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="rpt-header">
        <div>
          <h1 className="rpt-title">Multi-Branch Analytics &amp; Reports</h1>
          <p className="rpt-subtitle">Real-time aggregates across operations, materials, accounts receivable, and cash margins</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="rpt-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`rpt-tab ${activeTab === tab.key ? 'rpt-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span className="rpt-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rpt-content">
        {activeTab === 'financial'  && <FinancialTab />}
        {activeTab === 'production' && <ProductionTab />}
        {activeTab === 'inventory'  && <InventoryTab />}
        {activeTab === 'customer'   && <CustomerTab />}
        {activeTab === 'projects'   && <ProjectsTab />}
      </div>
    </div>
  );
};

export default ReportsPage;
