import { useState } from 'react';
import {
  Eye,
  Factory,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  Building2,
  Users,
  FolderOpen,
  TrendingDown,
  Layers,
  Contact,
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { selectCurrentUser, selectCurrentRole } from '../store/slices/authSlice';
import { selectCurrentBranch } from '../store/slices/branchSlice';
import { useGetBranchesQuery } from '../store/api/branchApi';
import {
  useGetProductionReportQuery,
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetProjectReportQuery,
  useGetFinancialReportQuery,
  useGetBranchPerformanceQuery,
  useGetDashboardStatsQuery,
} from '../store/api/reportApi';
import { useGetDispatchesQuery } from '../store/api/dispatchApi';
import { useGetLowStockQuery, useGetRawMaterialsQuery } from '../store/api/rawMaterialApi';
import { useGetInstallationsQuery } from '../store/api/installationApi';
import { useGetInvoicesQuery } from '../store/api/invoiceApi';
import { useGetProductionOrdersQuery } from '../store/api/productionApi';
import { useGetFinishedGoodsInventoryQuery } from '../store/api/inventoryApi';
import { useGetLabourersQuery } from '../store/api/labourApi';
import './Dashboard.css';

// SVG Bezier Spline Chart Helper
const generateSplinePaths = (points, width, height, paddingLeft = 60, paddingRight = 40, paddingTop = 40, paddingBottom = 40) => {
  if (!points || points.length === 0) return { linePath: '', areaPath: '', coords: [], yLabels: [] };
  const xMax = width - paddingLeft - paddingRight;
  const yMax = height - paddingTop - paddingBottom;
  const xStep = xMax / (points.length - 1);

  let minVal = Math.min(...points);
  let maxVal = Math.max(...points);
  if (maxVal === 0) {
    maxVal = 10; // Default vertical axis range if no data exists
  }
  const range = maxVal - minVal || 1;

  const coords = points.map((val, i) => {
    const x = paddingLeft + i * xStep;
    const y = paddingTop + yMax - ((val - minVal) / range) * yMax;
    return { x, y, val };
  });

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpX1 = curr.x + xStep / 2;
    const cpY1 = curr.y;
    const cpX2 = next.x - xStep / 2;
    const cpY2 = next.y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  const bottomY = height - paddingBottom;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;

  // Calculate 5 Y-axis labels dynamically
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const val = maxVal - (i * (maxVal - minVal)) / 4;
    yLabels.push({
      y: paddingTop + i * (yMax / 4),
      val,
    });
  }

  return { linePath, areaPath, coords, yLabels };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectCurrentRole) || 'branch';
  const currentBranch = useSelector(selectCurrentBranch);

  const getFirstDayOfCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  };

  const [customStartDate, setCustomStartDate] = useState(getFirstDayOfCurrentMonth());
  const [customEndDate, setCustomEndDate] = useState(getLastDayOfCurrentMonth());
  const [activeTab, setActiveTab] = useState('purchases');
  const [activeHoverPoint, setActiveHoverPoint] = useState(null);
  const [activeHoverPoint2, setActiveHoverPoint2] = useState(null);

  const branchId = currentBranch?._id;

  // Queries
  const { data: dbStatsRes } = useGetDashboardStatsQuery({
    branchId,
    dateFilter: 'custom',
    startDate: customStartDate,
    endDate: customEndDate
  });
  const { data: branchesRes } = useGetBranchesQuery({ limit: 100 });
  const reportParams = {
    branchId,
    dateFilter: 'custom',
    startDate: customStartDate,
    endDate: customEndDate
  };

  const { data: custRes } = useGetCustomerReportQuery(reportParams);
  const { data: projRes } = useGetProjectReportQuery(reportParams);
  const { data: prodRes } = useGetProductionReportQuery(reportParams);
  const { data: invRes } = useGetInventoryReportQuery({ branchId });
  const { data: dispatchRes } = useGetDispatchesQuery({ branchId, limit: 5, startDate: customStartDate, endDate: customEndDate });
  const { data: finRes } = useGetFinancialReportQuery(reportParams);
  const { data: lowStockRes } = useGetLowStockQuery({ branchId });
  const { data: installRes } = useGetInstallationsQuery({ branchId, limit: 5, startDate: customStartDate, endDate: customEndDate });
  const { data: invoicesRes } = useGetInvoicesQuery({ branchId, limit: 100 });
  const { data: prodOrdersRes } = useGetProductionOrdersQuery({ branchId, limit: 100 });
  const { data: perfRes } = useGetBranchPerformanceQuery({
    dateFilter: 'custom',
    startDate: customStartDate,
    endDate: customEndDate
  }, { skip: role !== 'super_admin' });
  // Smart operational data
  const { data: rawMatRes } = useGetRawMaterialsQuery({ branchId, limit: 100 });
  const { data: fgInvRes } = useGetFinishedGoodsInventoryQuery({ branchId });
  const { data: labourListRes } = useGetLabourersQuery({ branchId, limit: 100 });

  // Greetings banner values
  const greetingName = user?.name || user?.branchName || 'Patel';
  const currentBranchName = currentBranch?.branchName || 'All Branches';
  const displayDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate dashboard summary metrics from the date-filtered API
  const totalProductionToday = dbStatsRes?.data?.kpi?.totalProduced ?? 0;
  const totalRevenueVal = dbStatsRes?.data?.kpi?.totalRevenue ?? 0;
  const rawLowStockCount = lowStockRes?.data?.materials?.length ?? 0;
  const efficiencyPercent = dbStatsRes?.data?.kpi?.efficiencyPercent ?? 0;

  // Indian currency formatter
  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  // Calculate lead time dynamically
  let avgLeadTimeText = '0 Days';
  if (dbStatsRes?.data?.kpi?.avgLeadTime !== undefined) {
    avgLeadTimeText = `${dbStatsRes.data.kpi.avgLeadTime.toFixed(1)} Days`;
  }

  // 1. KPI widgets
  const kpiWidgets = [
    {
      label: 'TOTAL PRODUCTION',
      value: `${totalProductionToday.toLocaleString('en-IN')} Units`,
      delta: 0,
      trendText: 'selected period',
      icon: <Factory size={20} />,
      chipIndex: 0,
    },
    {
      label: 'AVG. LEAD TIME',
      value: avgLeadTimeText,
      delta: 0,
      trendText: 'selected period',
      icon: <Clock size={20} />,
      chipIndex: 1,
    },
    {
      label: 'TOTAL REVENUE',
      value: formatCurrency(totalRevenueVal),
      delta: 0,
      trendText: 'selected period',
      icon: <DollarSign size={20} />,
      chipIndex: 2,
    },
    {
      label: 'EFFICIENCY RATE',
      value: `${efficiencyPercent.toFixed(1)}%`,
      delta: 0,
      trendText: 'selected period',
      icon: <TrendingUp size={20} />,
      chipIndex: 3,
    },
  ];

  // 2. Dynamic Spline Chart Data - aggregated from new consolidated stats
  const chartData = dbStatsRes?.data?.chartData || [];
  const trendPoints = chartData.map((t) => {
    switch (activeTab) {
      case 'purchases':
        return t.purchases;
      case 'production':
        return t.production;
      case 'expenses':
        return t.expenses;
      case 'profit':
        return t.profit;
      case 'projects':
        return t.projects;
      case 'efficiency':
        return t.efficiency;
      case 'revenue':
      default:
        return t.revenue;
    }
  });

  const chartLabels = chartData.map((t) => t.label);
  const { linePath, areaPath, coords, yLabels } = generateSplinePaths(trendPoints, 800, 320, 65, 40, 40, 40);

  // 3. Hourly splines - Aggregated from real production orders
  const prodOrders = prodOrdersRes?.data?.productionOrders || [];
  const dynamicHourlyPoints = Array(11).fill(0);
  const hourlyLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  if (prodOrders.length > 0) {
    prodOrders.forEach((order) => {
      if (order.status === 'completed' && order.completedDate) {
        const completedHour = new Date(order.completedDate).getHours();
        if (completedHour >= 8 && completedHour <= 18) {
          const index = completedHour - 8;
          dynamicHourlyPoints[index] += (order.producedQuantity || 0);
        }
      }
    });
  }

  const hourlySplines = generateSplinePaths(dynamicHourlyPoints, 560, 220, 45, 30, 30, 30);

  // 4. Top products mapping
  const actualFinishedGoods = invRes?.data?.finishedGoods?.items || [];
  const topProducts = [...actualFinishedGoods]
    .sort((a, b) => b.available - a.available)
    .slice(0, 3);

  // 5. Finished goods stock value share (replaces dummy branch-wise stats list)
  const finishedGoodsItems = invRes?.data?.finishedGoods?.items || [];
  const totalFinishedGoodsVal = finishedGoodsItems.reduce((sum, item) => sum + (item.available || 0) * (item.unitCost || 0), 0);

  const inventoryStockShare = finishedGoodsItems.map((item) => {
    const itemVal = (item.available || 0) * (item.unitCost || 0);
    const share = totalFinishedGoodsVal > 0 ? (itemVal / totalFinishedGoodsVal) * 100 : 0;
    return {
      name: item.productName || 'Product',
      share: Math.round(share),
      available: item.available,
    };
  }).sort((a, b) => b.share - a.share).slice(0, 4);

  // 6. Recent dispatches
  const recentDispatches = dispatchRes?.data?.dispatches || [];

  // 7. Upcoming scheduled installations
  const rawInstallations = installRes?.data?.installations || [];
  const upcomingInstallations = rawInstallations.map(inst => {
    const timeStr = inst.startDate 
      ? new Date(inst.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
      : '10:30 AM';
    
    let statusLabel = 'SCHEDULED';
    if (inst.status === 'in_progress') statusLabel = 'IN PROGRESS';
    else if (inst.status === 'completed') statusLabel = 'COMPLETED';

    return {
      date: new Date(inst.startDate || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      projectName: inst.projectId?.projectName || 'Project Site',
      time: `${timeStr} • Installation Work`,
      status: statusLabel,
    };
  });

  // 8. Low stock alert items
  const rawLowStockList = lowStockRes?.data?.materials || [];
  const lowStockAlertItems = rawLowStockList.map(mat => ({
    materialName: mat.materialName,
    alertType: 'OUT OF STOCK',
    infoText: `Stock at ${mat.currentQuantity} ${mat.unit || 'kg'}`,
    statusLabel: 'Out of Stock',
  }));

  // Dynamic daily stats calculation based on last 4 calendar days of completed production orders
  const dailyStats = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = dayNames[d.getDay()];
    dailyStats.push({ day: dayName, qty: 0 });
  }

  if (prodOrders.length > 0) {
    prodOrders.forEach((order) => {
      if (order.status === 'completed' && order.completedDate) {
        const orderDateStr = new Date(order.completedDate).toDateString();
        for (let i = 0; i < 4; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - (3 - i));
          if (orderDateStr === checkDate.toDateString()) {
            dailyStats[i].qty += (order.producedQuantity || 0);
          }
        }
      }
    });
  }

  const maxQty = Math.max(...dailyStats.map(d => d.qty), 1);
  const dynamicDailyStats = dailyStats.map(d => ({
    day: d.day,
    value: (d.qty / maxQty) * 100
  }));

  // Dynamic revenue growth delta: compare current period vs previous period from chartData
  const currentPeriodRevenue = chartData[chartData.length - 1]?.revenue || 0;
  const lastPeriodRevenue = chartData[chartData.length - 2]?.revenue || 0;
  let revenueDeltaText = '0.00%';
  let revenueDeltaIsUp = true;
  if (lastPeriodRevenue > 0) {
    const delta = ((currentPeriodRevenue - lastPeriodRevenue) / lastPeriodRevenue) * 100;
    revenueDeltaText = `${Math.abs(delta).toFixed(2)}%`;
    revenueDeltaIsUp = delta >= 0;
  } else if (currentPeriodRevenue > 0) {
    revenueDeltaText = '100.00%';
    revenueDeltaIsUp = true;
  }

  // Dynamic production delta: compare this month's production vs last month's
  let thisMonthProd = 0;
  let lastMonthProd = 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  prodOrders.forEach((order) => {
    if (order.status === 'completed' && order.completedDate) {
      const compDate = new Date(order.completedDate);
      if (compDate.getFullYear() === currentYear) {
        if (compDate.getMonth() === currentMonth) {
          thisMonthProd += (order.producedQuantity || 0);
        } else if (compDate.getMonth() === currentMonth - 1) {
          lastMonthProd += (order.producedQuantity || 0);
        }
      } else if (compDate.getFullYear() === currentYear - 1 && currentMonth === 0 && compDate.getMonth() === 11) {
        // Handle January edge case where last month is December of previous year
        lastMonthProd += (order.producedQuantity || 0);
      }
    }
  });

  let prodDeltaText = '0.0%';
  let prodDeltaIsUp = true;
  if (lastMonthProd > 0) {
    const delta = ((thisMonthProd - lastMonthProd) / lastMonthProd) * 100;
    prodDeltaText = `${Math.abs(delta).toFixed(1)}%`;
    prodDeltaIsUp = delta >= 0;
  } else if (thisMonthProd > 0) {
    prodDeltaText = '100.0%';
    prodDeltaIsUp = true;
  }

  /* ── Super Admin Dashboard: consolidated stats, profit & loss, branch performance ── */
  if (role === 'super_admin' && !currentBranch) {
    const branches = perfRes?.data?.performance || [];
    
    // Aggregates
    const totalBranches   = branchesRes?.data?.branches?.length ?? 0;
    const activeBranches  = branchesRes?.data?.branches?.filter(b => b.status === 'active').length ?? 0;
    
    // Fetch direct dynamic financial summaries from the date-filtered consolidated stats
    const totalProduction = dbStatsRes?.data?.kpi?.totalProduced ?? 0;
    const totalSales      = dbStatsRes?.data?.kpi?.totalRevenue ?? 0;
    const totalCosts      = dbStatsRes?.data?.kpi?.totalExpenses ?? 0;
    const netProfit       = dbStatsRes?.data?.kpi?.netProfit ?? 0;
    const avgMargin       = dbStatsRes?.data?.kpi?.marginPercent ?? 0;

    // Report aggregates
    const customersCount = custRes?.data?.customers?.length ?? 0;
    const projectsCount  = projRes?.data?.projects?.length ?? 0;
    const rawValuation = invRes?.data?.rawMaterials?.valuation ?? 0;
    const fgValuation  = invRes?.data?.finishedGoods?.valuation ?? 0;
    const totalInventoryValue = rawValuation + fgValuation;

    const row1KPIs = [
      { label: 'TOTAL SALES (REVENUE)', value: formatCurrency(totalSales), icon: <DollarSign size={20} />, colorIdx: 2 },
      { label: 'CONSOLIDATED PROFIT',   value: formatCurrency(netProfit), icon: <TrendingUp size={20} />, colorIdx: 3 },
      { label: 'TOTAL PRODUCTION',      value: `${totalProduction.toLocaleString('en-IN')} Units`, icon: <Factory size={20} />, colorIdx: 0 },
      { label: 'TOTAL INVENTORY VALUE', value: formatCurrency(totalInventoryValue), icon: <Package size={20} />, colorIdx: 1 },
    ];

    const row2KPIs = [
      { label: 'TOTAL BRANCHES',        value: `${activeBranches} Active / ${totalBranches}`, icon: <Building2 size={20} />, colorIdx: 0 },
      { label: 'ACTIVE CUSTOMERS',      value: `${customersCount} Accounts`, icon: <Users size={20} />, colorIdx: 2 },
      { label: 'ACTIVE PROJECTS',       value: `${projectsCount} Contracts`, icon: <FolderOpen size={20} />, colorIdx: 1 },
      { label: 'OPERATING COSTS',       value: formatCurrency(totalCosts), icon: <TrendingDown size={20} />, colorIdx: 3 },
    ];

    // Global Low stock items
    const rawLowStockList = lowStockRes?.data?.materials || [];
    const lowStockAlertItems = rawLowStockList.map(mat => ({
      materialName: mat.materialName,
      alertType: 'OUT OF STOCK',
      infoText: `Stock at ${mat.currentQuantity} ${mat.unit || 'kg'}`,
      statusLabel: 'Out of Stock',
    }));

    return (
      <div className="dashboard-v2">
        {/* Greetings banner */}
        <div className="dashboard-v2__welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="dashboard-v2__welcome-left">
            <div className="dashboard-v2__context-pill">
              <span className="dashboard-v2__context-icon" style={{ display: 'flex', alignItems: 'center' }}><Building2 size={14} /></span>
              <span>All Branches Consolidated Monitor</span>
            </div>
            <h1 className="dashboard-v2__welcome-title">Welcome back, {greetingName}!</h1>
             <p className="dashboard-v2__welcome-subtitle">
              Organization performance summary · {customStartDate ? new Date(customStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} to {customEndDate ? new Date(customEndDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </p>
          </div>

          {/* Custom Date Picker Inputs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  padding: '4px 6px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  padding: '4px 6px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* KPI Grid Row 1 */}
        <div className="dashboard-v2__kpi-grid">
          {row1KPIs.map((kpi, index) => (
            <div className="kpi-card-v2" key={index}>
              <div className="kpi-card-v2__header">
                <span className="kpi-card-v2__label">{kpi.label}</span>
                <div className={`kpi-card-v2__icon-circle kpi-card-v2__icon-circle--${kpi.colorIdx}`}>
                  {kpi.icon}
                </div>
              </div>
              <div className="kpi-card-v2__value">{kpi.value}</div>
              <div className="kpi-card-v2__trend">
                <span className="kpi-card-v2__trend-label">selected period metric</span>
              </div>
            </div>
          ))}
        </div>

        {/* KPI Grid Row 2 */}
        <div className="dashboard-v2__kpi-grid" style={{ marginTop: 20 }}>
          {row2KPIs.map((kpi, index) => (
            <div className="kpi-card-v2" key={index}>
              <div className="kpi-card-v2__header">
                <span className="kpi-card-v2__label">{kpi.label}</span>
                <div className={`kpi-card-v2__icon-circle kpi-card-v2__icon-circle--${kpi.colorIdx}`}>
                  {kpi.icon}
                </div>
              </div>
              <div className="kpi-card-v2__value">{kpi.value}</div>
              <div className="kpi-card-v2__trend">
                <span className="kpi-card-v2__trend-label">selected period metric</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main layout split */}
        <div className="dashboard-v2__row-split" style={{ marginTop: 24 }}>
          {/* Left: Branch performance table */}
          <div className="dashboard-v2__card dashboard-v2__card--solid" style={{ flex: 2, padding: 24 }}>
            <div className="dashboard-v2__card-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="dashboard-v2__card-title" style={{ margin: 0 }}>Branch Performance Breakdown</h2>
              <span style={{
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                padding: '4px 12px',
                borderRadius: '20px',
                background: avgMargin >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: avgMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
                Avg Margin: {avgMargin.toFixed(1)}%
              </span>
            </div>

            {branches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No branch performance data available yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      {['Branch', 'Code', 'Total Production', 'Sales (Revenue)', 'Operating Costs', 'Net Profit/Loss', 'Margin %', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '12px 8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => (
                      <tr key={b.branchId} style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '14px 8px', fontWeight: 'var(--font-medium)' }}>{b.branchName}</td>
                        <td style={{ padding: '14px 8px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{b.branchCode}</td>
                        <td style={{ padding: '14px 8px', fontWeight: 'var(--font-medium)' }}>{b.totalProduced.toLocaleString('en-IN')} units</td>
                        <td style={{ padding: '14px 8px', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>{formatCurrency(b.revenue)}</td>
                        <td style={{ padding: '14px 8px', color: 'var(--color-text-secondary)' }}>{formatCurrency(b.operatingCosts)}</td>
                        <td style={{ padding: '14px 8px', color: b.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-semibold)' }}>
                          {b.netProfit >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(b.netProfit))}
                        </td>
                        <td style={{ padding: '14px 8px', color: b.marginPercent >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'var(--font-medium)' }}>
                          {b.marginPercent.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 600,
                            background: b.status === 'active' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                            color: b.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)',
                          }}>
                            {b.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Low Stock alerts */}
          <div className="dashboard-v2__card dashboard-v2__card--alerts dashboard-v2__card--solid" style={{ flex: 1, padding: 24 }}>
            <div className="dashboard-v2__card-header" style={{ marginBottom: 20 }}>
              <h2 className="dashboard-v2__card-title">Pending Stock Alerts</h2>
              <span className="badge-critical-count" style={{
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: 'var(--text-xs)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                CRITICAL
              </span>
            </div>

            <div className="critical-alerts-list">
              {lowStockAlertItems.map((item, idx) => (
                <div className="critical-alert-item" key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div className="critical-alert-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-danger)' }}><AlertTriangle size={18} /></div>
                  <div className="critical-alert-details" style={{ flex: 1 }}>
                    <div className="critical-alert-name" style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{item.materialName}</div>
                    <div className="critical-alert-meta" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.infoText}</div>
                  </div>
                  <div className="critical-alert-right">
                    <span className="critical-alert-due" style={{
                      fontSize: 'var(--text-xs)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--color-warning-bg)',
                      color: 'var(--color-warning)',
                      fontWeight: 'var(--font-medium)'
                    }}>{item.statusLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

/* ── Branch operational dashboard ── */
  return (
    <div className="dashboard-v2">
      {/* Greetings banner */}
      <div className="dashboard-v2__welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="dashboard-v2__welcome-left">
          <div className="dashboard-v2__context-pill">
            <span className="dashboard-v2__context-icon" style={{ display: 'flex', alignItems: 'center' }}><Building2 size={14} /></span>
            <span>{currentBranchName} Overview</span>
          </div>
          <h1 className="dashboard-v2__welcome-title">Welcome back, {greetingName}!</h1>
          <p className="dashboard-v2__welcome-subtitle">
            Your manufacturing overview · {customStartDate ? new Date(customStartDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} to {customEndDate ? new Date(customEndDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>

        {/* Custom Date Picker Inputs */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{
                background: 'transparent',
                color: 'var(--color-text-primary)',
                border: 'none',
                padding: '4px 6px',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{
                background: 'transparent',
                color: 'var(--color-text-primary)',
                border: 'none',
                padding: '4px 6px',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats widgets grid */}
      <div className="dashboard-v2__kpi-grid">
        {kpiWidgets.map((kpi, index) => (
          <div className="kpi-card-v2" key={index}>
            <div className="kpi-card-v2__header">
              <span className="kpi-card-v2__label">{kpi.label}</span>
              <div className={`kpi-card-v2__icon-circle kpi-card-v2__icon-circle--${kpi.chipIndex}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="kpi-card-v2__value">{kpi.value}</div>
            <div className="kpi-card-v2__trend">
              <span className="kpi-card-v2__trend-label">{kpi.trendText}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Operational Intelligence KPI Row ── */}
      {(() => {
        const rawMaterials = rawMatRes?.data?.materials || [];
        const rawMatInStock = rawMaterials.filter(m => m.currentQuantity > 0).length;
        const rawMatTotal = rawMaterials.length;
        const totalRawQtyValue = rawMaterials.reduce((sum, m) => sum + (m.currentQuantity * (m.purchaseRate || 0)), 0);

        const fgItems = fgInvRes?.data?.items || [];
        const totalFGStock = fgItems.reduce((sum, item) => sum + (item.availableStock || 0), 0);
        const fgCategories = fgItems.filter(i => i.availableStock > 0).length;

        const activeLabourers = (labourListRes?.data?.labourers || []).filter(l => l.status === 'active').length;
        const lowStockMats = lowStockRes?.data?.materials?.length || 0;

        const opKPIs = [
          {
            label: 'RAW MATERIAL STOCK',
            value: `${rawMatInStock} / ${rawMatTotal}`,
            sub: `₹${Number(totalRawQtyValue).toLocaleString('en-IN')} stock value`,
            extra: `Bought: ₹${Number(dbStatsRes?.data?.kpi?.materialsPurchasesCost || 0).toLocaleString('en-IN')}`,
            icon: <Layers size={20} />,
            color: rawMatInStock < rawMatTotal ? 'var(--color-warning)' : 'var(--color-success)',
            link: '/raw-materials',
            linkLabel: 'Manage Stock',
          },
          {
            label: 'FINISHED GOODS IN STOCK',
            value: `${totalFGStock.toLocaleString('en-IN')} Units`,
            sub: `${fgCategories} product type(s) available`,
            icon: <ClipboardCheck size={20} />,
            color: 'var(--color-primary)',
            link: '/inventory/finished-goods',
            linkLabel: 'View Inventory',
          },
          {
            label: 'ACTIVE LABOURERS',
            value: `${activeLabourers} Workers`,
            sub: 'Available for deployment',
            icon: <Contact size={20} />,
            color: 'var(--color-accent)',
            link: '/labour',
            linkLabel: 'View Labour',
          },
          {
            label: 'LOW STOCK ALERTS',
            value: lowStockMats > 0 ? `${lowStockMats} Materials` : 'All Healthy ✓',
            sub: lowStockMats > 0 ? 'Below minimum threshold' : 'No action needed',
            icon: lowStockMats > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />,
            color: lowStockMats > 0 ? 'var(--color-danger)' : 'var(--color-success)',
            link: '/raw-materials',
            linkLabel: 'Check Materials',
          },
        ];

        return (
          <div className="dashboard-v2__op-kpis">
            {opKPIs.map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${kpi.color}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => navigate(kpi.link)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {kpi.label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', color: kpi.color }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {kpi.sub}
                </div>
                {kpi.extra && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                    {kpi.extra}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: kpi.color, fontWeight: 600, marginTop: '4px' }}>
                  → {kpi.linkLabel}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Main chart & top products split */}
      <div className="dashboard-v2__row-split">
        {/* Left: Spline Chart card */}
        {/* Left: Spline Chart card */}
        <div className="dashboard-v2__card dashboard-v2__card--chart" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="dashboard-v2__card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div>
                <h2 className="dashboard-v2__card-title" style={{ margin: 0 }}>Monthly Business Insights</h2>
                <div className="dashboard-v2__chart-highlight" style={{ marginTop: '4px' }}>
                  <span className="dashboard-v2__chart-value" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {activeTab === 'efficiency'
                      ? `${efficiencyPercent.toFixed(1)}%`
                      : activeTab === 'projects'
                      ? `${dbStatsRes?.data?.kpi?.activeProjects ?? 0} Projects`
                      : activeTab === 'production'
                      ? `${totalProductionToday.toLocaleString('en-IN')} Units`
                      : activeTab === 'expenses'
                      ? formatCurrency(dbStatsRes?.data?.kpi?.totalExpenses)
                      : activeTab === 'profit'
                      ? formatCurrency(dbStatsRes?.data?.kpi?.netProfit)
                      : formatCurrency(totalRevenueVal)}
                  </span>
                  <span className="dashboard-v2__chart-label" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                    Selected Period Total
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div className="dashboard-v2__chart-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
              {[
                { key: 'purchases', label: 'Purchases (Raw Mat.)' },
                { key: 'production', label: 'Production Units' },
                { key: 'expenses', label: 'Operating Costs (Karcha)' },
                { key: 'profit', label: 'Net Profit' },
                { key: 'projects', label: 'Projects/Sites' },
                { key: 'efficiency', label: 'Efficiency %' },
                { key: 'revenue', label: 'Revenue' }
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveTab(m.key)}
                  style={{
                    background: activeTab === m.key ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: activeTab === m.key ? '#fff' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-v2__chart-canvas" style={{ flex: 1, minHeight: '260px' }}>
            <svg viewBox="0 0 800 320" width="100%" height="100%" className="spline-svg">
              <defs>
                <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Dynamic Y Axis Labels */}
              {yLabels.map((item, i) => (
                <g key={i}>
                  <line
                    x1="65"
                    y1={item.y}
                    x2="760"
                    y2={item.y}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="53"
                    y={item.y + 4}
                    textAnchor="end"
                    fill="var(--color-text-secondary)"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {activeTab === 'efficiency'
                      ? `${item.val.toFixed(0)}%`
                      : activeTab === 'projects' || activeTab === 'production'
                      ? item.val.toLocaleString('en-IN')
                      : item.val >= 100000 
                      ? `₹${(item.val / 100000).toFixed(1)}L` 
                      : item.val >= 1000 
                      ? `₹${(item.val / 1000).toFixed(0)}k` 
                      : `₹${item.val.toFixed(0)}`}
                  </text>
                </g>
              ))}

              {/* Filled Area */}
              {areaPath && <path d={areaPath} fill="url(#splineGradient)" />}

              {/* Main Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Coordinate circles & labels */}
              {coords.map((c, i) => (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={activeHoverPoint === i ? 6 : 4}
                    fill={activeHoverPoint === i ? 'var(--color-primary)' : '#FFF'}
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                    onMouseEnter={() => setActiveHoverPoint(i)}
                    onMouseLeave={() => setActiveHoverPoint(null)}
                  />
                  {/* Monthly X Labels */}
                  {((chartData.length <= 12) || (i % 3 === 0)) && (
                    <text
                      x={c.x}
                      y="310"
                      textAnchor="middle"
                      fill="var(--color-text-secondary)"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {chartLabels[i]}
                    </text>
                  )}
                </g>
              ))}

              {/* Interactive Tooltip box */}
              {activeHoverPoint !== null && coords[activeHoverPoint] && (
                <g>
                  <rect
                    x={coords[activeHoverPoint].x - 65}
                    y={coords[activeHoverPoint].y - 45}
                    width="130"
                    height="32"
                    rx="6"
                    fill="var(--color-text-primary)"
                    opacity="0.9"
                  />
                  <text
                    x={coords[activeHoverPoint].x}
                    y={coords[activeHoverPoint].y - 25}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {activeTab === 'efficiency'
                      ? `Val: ${coords[activeHoverPoint].val.toFixed(1)}%`
                      : activeTab === 'projects'
                      ? `Val: ${coords[activeHoverPoint].val} Sites`
                      : activeTab === 'production'
                      ? `Val: ${coords[activeHoverPoint].val} Units`
                      : `Val: ${formatCurrency(coords[activeHoverPoint].val)}`}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Right: Top Precast Products card */}
        <div className="dashboard-v2__card dashboard-v2__card--products">
          <div className="dashboard-v2__card-header">
            <h2 className="dashboard-v2__card-title">Top Precast Products</h2>
            <div className="dashboard-v2__actions">
              <select className="dashboard-v2__select">
                <option>Monthly</option>
                <option>Weekly</option>
              </select>
            </div>
          </div>

          <div className="top-products-list">
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No finished goods inventory recorded yet.
              </div>
            ) : (
              topProducts.map((prod, idx) => (
                <div className="top-product-item" key={idx}>
                  <div className="top-product-item__icon-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx === 0 ? <Building2 size={16} style={{ color: 'var(--color-primary)' }} /> : idx === 1 ? <Package size={16} style={{ color: 'var(--color-primary)' }} /> : <Layers size={16} style={{ color: 'var(--color-primary)' }} />}
                  </div>
                  <div className="top-product-item__details">
                    <div className="top-product-item__name">{prod.productName}</div>
                    <div className="top-product-item__subtext">
                      Code: {prod.productCode || 'N/A'} • Available: {prod.available}
                    </div>
                  </div>
                  <div className="top-product-item__value">
                    {formatCurrency((prod.available || 0) * (prod.unitCost || 0))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Under list days bars */}
          <div className="daily-stats-row">
            {dynamicDailyStats.map((d, i) => (
              <div className="daily-stat-bar-col" key={i}>
                <div className="daily-stat-bar-track" title={`${Math.round(dailyStats[i].qty)} Units`}>
                  <div
                    className={`daily-stat-bar-fill daily-stat-bar-fill--${i}`}
                    style={{ height: `${d.value}%` }}
                  />
                </div>
                <span className="daily-stat-day">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Performance & Hourly patterns row */}
      <div className="dashboard-v2__row-split">
        {/* Left: Finished goods inventory stock share */}
        <div className="dashboard-v2__card dashboard-v2__card--branch-stats">
          <div className="dashboard-v2__card-header">
            <h2 className="dashboard-v2__card-title">Finished Goods Stock Share</h2>
            <div className="dashboard-v2__actions">
              <select className="dashboard-v2__select">
                <option>Value Share</option>
              </select>
            </div>
          </div>

          <div className="branch-performance-list">
            {inventoryStockShare.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No finished goods inventory recorded yet.
              </div>
            ) : (
              inventoryStockShare.map((item, idx) => (
                <div className="branch-perf-item" key={idx}>
                  <div className="branch-perf-header">
                    <span className="branch-perf-name">{item.name}</span>
                    <span className="branch-perf-pct">{item.share}%</span>
                  </div>
                  <div className="branch-perf-progress-bg">
                    <div
                      className={`branch-perf-progress-fill branch-perf-progress-fill--${idx % 4}`}
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                  <span className="branch-perf-footer">{item.available} units in stock</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Hourly production spline line */}
        <div className="dashboard-v2__card dashboard-v2__card--hourly">
          <div className="dashboard-v2__card-header">
            <div>
              <h2 className="dashboard-v2__card-title">Hourly Production Pattern</h2>
              <div className="dashboard-v2__chart-highlight">
                <span className="dashboard-v2__chart-value">{totalProductionToday.toLocaleString('en-IN')} Units Total</span>
                <span className={`dashboard-v2__chart-delta ${prodDeltaIsUp ? '' : 'dashboard-v2__chart-delta--down'}`}>
                  {prodDeltaIsUp ? '▲' : '▼'} {prodDeltaText} vs last month
                </span>
              </div>
            </div>
            <div className="dashboard-v2__actions">
              <select className="dashboard-v2__select">
                <option>Weekly</option>
                <option>Daily</option>
              </select>
            </div>
          </div>

          <div className="dashboard-v2__chart-canvas" style={{ height: '220px' }}>
            <svg viewBox="0 0 560 220" width="100%" height="100%" className="spline-svg">
              <defs>
                <linearGradient id="splineGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chip-blue-icon)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--chip-blue-icon)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Dynamic Y Axis Labels */}
              {hourlySplines.yLabels.map((item, i) => (
                <g key={i}>
                  <line
                    x1="45"
                    y1={item.y}
                    x2="530"
                    y2={item.y}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="35"
                    y={item.y + 3}
                    textAnchor="end"
                    fill="var(--color-text-secondary)"
                    fontSize="9"
                    fontWeight="500"
                  >
                    {item.val >= 1000 
                      ? `${(item.val / 1000).toFixed(1)}k` 
                      : Math.round(item.val)}
                  </text>
                </g>
              ))}

              {/* Area path */}
              {hourlySplines.areaPath && <path d={hourlySplines.areaPath} fill="url(#splineGradient2)" />}

              {/* Line path */}
              {hourlySplines.linePath && (
                <path
                  d={hourlySplines.linePath}
                  fill="none"
                  stroke="var(--chip-blue-icon)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Coordinates */}
              {hourlySplines.coords.map((c, i) => (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={activeHoverPoint2 === i ? 5 : 3.5}
                    fill={activeHoverPoint2 === i ? 'var(--chip-blue-icon)' : '#FFF'}
                    stroke="var(--chip-blue-icon)"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                    onMouseEnter={() => setActiveHoverPoint2(i)}
                    onMouseLeave={() => setActiveHoverPoint2(null)}
                  />
                  {/* Hourly X Labels */}
                  {i % 2 === 0 && (
                    <text
                      x={c.x}
                      y="212"
                      textAnchor="middle"
                      fill="var(--color-text-secondary)"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {hourlyLabels[i]}
                    </text>
                  )}
                </g>
              ))}

              {/* Tooltip */}
              {activeHoverPoint2 !== null && (
                <g>
                  <rect
                    x={hourlySplines.coords[activeHoverPoint2].x - 55}
                    y={hourlySplines.coords[activeHoverPoint2].y - 40}
                    width="110"
                    height="28"
                    rx="5"
                    fill="var(--color-text-primary)"
                    opacity="0.9"
                  />
                  <text
                    x={hourlySplines.coords[activeHoverPoint2].x}
                    y={hourlySplines.coords[activeHoverPoint2].y - 22}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Qty: {Math.round(hourlySplines.coords[activeHoverPoint2].val)} Units
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Recent Dispatches table section */}
      <div className="dashboard-v2__card dashboard-v2__table-card">
        <div className="dashboard-v2__card-header">
          <h2 className="dashboard-v2__card-title">Recent Dispatch Cases</h2>
          <Link to="/dispatch" className="dashboard-v2__link-action">
            View All Dispatches
          </Link>
        </div>

        <div className="dashboard-v2__table-wrapper">
          <table className="dashboard-v2__table">
            <thead>
              <tr>
                <th>Client Name / Project</th>
                <th>Dispatch Site</th>
                <th>Dispatch No.</th>
                <th>Status</th>
                <th>Last Update</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentDispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No recent dispatches logged.
                  </td>
                </tr>
              ) : (
                recentDispatches.map((disp, idx) => {
                  const totalQty = disp.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                  const clientName = disp.projectId?.projectName || 'General Client';
                  const siteName = disp.siteId?.siteName || 'Plant Location';
                  const formattedDate = new Date(disp.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={disp._id || idx}>
                      <td>
                        <div className="table-client-cell">
                          <div className={`table-client-avatar table-client-avatar--${idx % 3}`}>
                            {clientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="table-client-name">{clientName}</div>
                            <div className="table-client-meta">{totalQty} units packed</div>
                          </div>
                        </div>
                      </td>
                      <td>{siteName}</td>
                      <td>
                        <span className="table-disp-no">{disp.dispatchNumber}</span>
                      </td>
                      <td>
                        <span className={`table-badge table-badge--${disp.status}`}>
                          {disp.status === 'delivered'
                            ? 'Delivered'
                            : disp.status === 'dispatched'
                            ? 'Dispatched'
                            : 'Draft'}
                        </span>
                      </td>
                      <td>{formattedDate}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action-btn"
                            title="View"
                            onClick={() => navigate(`/dispatch`)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming tasks & alerts split */}
      <div className="dashboard-v2__row-split">
        {/* Left: Upcoming Installations */}
        <div className="dashboard-v2__card dashboard-v2__card--upcoming">
          <div className="dashboard-v2__card-header">
            <h2 className="dashboard-v2__card-title">Upcoming Installations</h2>
            <Link to="/installation" className="dashboard-v2__link-action">
              View Calendar
            </Link>
          </div>

          <div className="upcoming-appointments-list">
            {upcomingInstallations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No upcoming installations scheduled.
              </div>
            ) : (
              upcomingInstallations.map((item, idx) => (
                <div className="upcoming-appointment-item" key={idx}>
                  <div className="upcoming-date-badge">
                    <div className="upcoming-date-month">
                      {item.date.split(' ')[1]?.toUpperCase() || 'JUL'}
                    </div>
                    <div className="upcoming-date-day">{item.date.split(' ')[0] || '18'}</div>
                  </div>
                  <div className="upcoming-details">
                    <div className="upcoming-project-name">{item.projectName}</div>
                    <div className="upcoming-time-meta">{item.time}</div>
                  </div>
                  <span className={`upcoming-status-badge upcoming-status-badge--${item.status.toLowerCase().replace(' ', '')}`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Low Stock & Critical alerts */}
        <div className="dashboard-v2__card dashboard-v2__card--alerts">
          <div className="dashboard-v2__card-header">
            <h2 className="dashboard-v2__card-title">Pending Stock Alerts</h2>
            <span className="badge-critical-count">
              {rawLowStockCount} CRITICAL
            </span>
          </div>

          <div className="critical-alerts-list">
            {lowStockAlertItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No low stock alerts. All material levels healthy!
              </div>
            ) : (
              lowStockAlertItems.map((item, idx) => (
                <div className="critical-alert-item" key={idx}>
                  <div className="critical-alert-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-danger)' }}><AlertTriangle size={18} /></div>
                  <div className="critical-alert-details">
                    <div className="critical-alert-name">{item.materialName}</div>
                    <div className="critical-alert-meta">{item.infoText}</div>
                  </div>
                  <div className="critical-alert-right">
                    <span className="critical-alert-due">{item.statusLabel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
