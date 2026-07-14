import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetRawMaterialsInventoryQuery,
  useGetWipInventoryQuery,
  useGetFinishedGoodsInventoryQuery,
} from '../../store/api/inventoryApi';
import {
  useUpdateProductionOrderStatusMutation,
  useCompleteProductionOrderMutation,
} from '../../store/api/productionApi';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import FormDrawer from '../../components/ui/FormDrawer';
import './InventoryPage.css';

const TABS = [
  { key: 'raw', label: 'Raw Materials', icon: (
    <svg viewBox="0 0 24 24" className="inv-tab__icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  )},
  { key: 'wip', label: 'WIP Inventory', icon: (
    <svg viewBox="0 0 24 24" className="inv-tab__icon"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
  )},
  { key: 'finished', label: 'Finished Goods', icon: (
    <svg viewBox="0 0 24 24" className="inv-tab__icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  )},
];

const CATEGORY_MAP = {
  cement_wall: 'Cement Wall', compound_wall: 'Compound Wall',
  boundary_wall: 'Boundary Wall', pole: 'Pole', beam: 'Beam',
  top_beam: 'Top Beam', slab: 'Slab', paver_block: 'Paver Block',
  column: 'Column', custom: 'Custom Product',
};

// ── Tab 1: Raw Materials ─────────────────────────────────────────────
const RawMaterialsTab = () => {
  const { data: inventoryRes, isLoading } = useGetRawMaterialsInventoryQuery();
  const inventory = inventoryRes?.data?.items || [];
  const totalValuation = inventoryRes?.data?.totalValuation || 0;
  const lowStockCount = inventory.filter((m) => m.isLow).length;

  const columns = [
    { key: 'materialCode', label: 'Code', render: (val) => <code style={{ fontSize: '12px', background: 'var(--color-primary-light)', padding: '2px 6px', borderRadius: '4px' }}>{val}</code> },
    { key: 'materialName', label: 'Material Name' },
    { key: 'category', label: 'Category', render: (val) => <span style={{ textTransform: 'capitalize' }}>{val?.replace(/_/g, ' ')}</span> },
    {
      key: 'currentQuantity',
      label: 'Available Qty',
      render: (val, row) => (
        <span style={{ fontWeight: 600, color: row.isLow ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {val} {row.unit} {row.isLow && <span style={{ fontSize: '11px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '4px', padding: '1px 5px', marginLeft: '4px' }}>LOW</span>}
        </span>
      ),
    },
    { key: 'minimumQuantity', label: 'Min Threshold', render: (val, row) => `${val} ${row.unit}` },
    { key: 'purchaseRate', label: 'Unit Rate', render: (val) => `₹${val?.toFixed(2)}` },
    { key: 'totalValuation', label: 'Stock Value', render: (val) => <strong>₹{val?.toFixed(2)}</strong> },
  ];

  return (
    <div className="inv-tab-content animate-fade-in">
      <div className="inv-kpi-row">
        <div className="inv-kpi-card inv-kpi-card--blue">
          <div className="inv-kpi-label">Total Stock Valuation</div>
          <div className="inv-kpi-value">₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="inv-kpi-card inv-kpi-card--orange">
          <div className="inv-kpi-label">Low Stock Alerts</div>
          <div className="inv-kpi-value">{lowStockCount} <span style={{ fontSize: '14px', fontWeight: 400 }}>materials</span></div>
        </div>
        <div className="inv-kpi-card inv-kpi-card--green">
          <div className="inv-kpi-label">Total Materials</div>
          <div className="inv-kpi-value">{inventory.length}</div>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={inventory}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={inventory.length}
        emptyMessage="No raw material inventory records found."
      />
    </div>
  );
};

// ── Tab 2: WIP Inventory ─────────────────────────────────────────────
const WipTab = () => {
  const navigate = useNavigate();
  const { data: wipRes, isLoading, refetch } = useGetWipInventoryQuery();
  const [updateStatus] = useUpdateProductionOrderStatusMutation();
  const [completeOrder] = useCompleteProductionOrderMutation();

  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [completeForm, setCompleteForm] = useState({ producedQuantity: '', remarks: '' });
  const [validationErrors, setValidationErrors] = useState({});

  const wipItems = wipRes?.data?.items || [];
  const totalOrders = wipRes?.data?.totalOrders || 0;
  const totalVolume = wipRes?.data?.totalVolume || 0;

  const handleStatusTransition = async (orderId, nextStatus) => {
    try {
      await updateStatus({ id: orderId, status: nextStatus }).unwrap();
      refetch();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update order status');
    }
  };

  const handleOpenComplete = (order) => {
    setSelectedOrder(order);
    setCompleteForm({ producedQuantity: order.plannedQuantity || '', remarks: '' });
    setValidationErrors({});
    setCompleteDrawerOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const qty = Number(completeForm.producedQuantity);
    if (completeForm.producedQuantity === '' || isNaN(qty) || qty < 0) {
      setValidationErrors({ producedQuantity: 'Must be a valid produced quantity >= 0' });
      return;
    }
    try {
      await completeOrder({ id: selectedOrder.orderId, producedQuantity: qty, remarks: completeForm.remarks }).unwrap();
      setCompleteDrawerOpen(false);
      refetch();
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to complete order' });
    }
  };

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: (val) => <code style={{ fontSize: '12px', background: 'var(--color-warning-bg)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-warning)' }}>{val}</code> },
    { key: 'productName', label: 'Product Name' },
    { key: 'productCode', label: 'Code' },
    { key: 'plannedQuantity', label: 'Pipeline Volume' },
    { key: 'status', label: 'Stage', render: (val) => <StatusBadge status={val} /> },
    { key: 'startDate', label: 'Started', render: (val) => val ? new Date(val).toLocaleDateString('en-IN') : <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Pending</span> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/production/${row.orderId}`), type: 'info' },
          row.status === 'draft' && { label: 'Request Approval', onClick: () => handleStatusTransition(row.orderId, 'pending'), type: 'primary' },
          row.status === 'pending' && { label: 'Start Casting', onClick: () => handleStatusTransition(row.orderId, 'in_production'), type: 'success' },
          row.status === 'pending' && { label: 'Cancel Order', onClick: () => handleStatusTransition(row.orderId, 'cancelled'), type: 'danger' },
          row.status === 'in_production' && { label: 'Complete Casting', onClick: () => handleOpenComplete(row), type: 'success' },
          row.status === 'in_production' && { label: 'Cancel Order', onClick: () => handleStatusTransition(row.orderId, 'cancelled'), type: 'danger' },
        ].filter(Boolean);
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div className="inv-tab-content animate-fade-in">
      <div className="inv-kpi-row">
        <div className="inv-kpi-card inv-kpi-card--orange">
          <div className="inv-kpi-label">Active Batches</div>
          <div className="inv-kpi-value">{totalOrders}</div>
        </div>
        <div className="inv-kpi-card inv-kpi-card--blue">
          <div className="inv-kpi-label">Total Pipeline Volume</div>
          <div className="inv-kpi-value">{totalVolume} <span style={{ fontSize: '14px', fontWeight: 400 }}>pcs</span></div>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={wipItems}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={wipItems.length}
        emptyMessage="No active production orders in the WIP pipeline."
      />
      <FormDrawer
        open={completeDrawerOpen}
        onClose={() => setCompleteDrawerOpen(false)}
        title="Complete Casting Batch"
        footer={
          <>
            <button onClick={() => setCompleteDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleCompleteSubmit} className="btn btn--primary">Complete Order</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ display: 'block', marginBottom: '16px' }}>⚠️ {validationErrors.general}</div>}
        <div style={{ marginBottom: '16px', fontSize: 'var(--text-sm)', background: 'var(--color-primary-light)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          Order: <strong>{selectedOrder?.orderNumber}</strong><br />
          Planned: <strong>{selectedOrder?.plannedQuantity} pcs</strong>
        </div>
        <div className="field-group">
          <label className="field-label field-label--required">Actual Produced Quantity (Pcs)</label>
          <input type="number" className="field-input" value={completeForm.producedQuantity} onChange={(e) => setCompleteForm({ ...completeForm, producedQuantity: e.target.value })} placeholder="e.g. 100" />
          {validationErrors.producedQuantity && <span className="field-error">{validationErrors.producedQuantity}</span>}
        </div>
        <div className="field-group">
          <label className="field-label">Production Remarks</label>
          <textarea className="field-textarea" value={completeForm.remarks} onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })} placeholder="Curing status, wastage, or casting notes..." rows={3} />
        </div>
      </FormDrawer>
    </div>
  );
};

// ── Tab 3: Finished Goods ─────────────────────────────────────────────
const FinishedGoodsTab = () => {
  const { data: fgRes, isLoading } = useGetFinishedGoodsInventoryQuery();
  const inventory = fgRes?.data?.items || [];
  const totalVolume = fgRes?.data?.totalQuantity || 0;
  const dispatchReady = inventory.reduce((sum, i) => sum + (i.dispatchReadyStock || 0), 0);

  const columns = [
    { key: 'productCode', label: 'Code', render: (val) => <code style={{ fontSize: '12px', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-success)' }}>{val}</code> },
    { key: 'productName', label: 'Product Name' },
    { key: 'category', label: 'Category', render: (val) => CATEGORY_MAP[val] || val },
    { key: 'availableStock', label: 'Available', render: (val, row) => <strong style={{ color: 'var(--color-success)' }}>{val} {row.unit || ''}</strong> },
    { key: 'reservedStock', label: 'Reserved', render: (val, row) => `${val} ${row.unit || ''}` },
    { key: 'dispatchReadyStock', label: 'Dispatch Ready', render: (val, row) => <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>{val} {row.unit || ''}</span> },
    { key: 'damagedStock', label: 'Damaged', render: (val, row) => val > 0 ? <span style={{ color: 'var(--color-danger)' }}>{val} {row.unit || ''}</span> : <span style={{ color: 'var(--color-text-secondary)' }}>—</span> },
  ];

  return (
    <div className="inv-tab-content animate-fade-in">
      <div className="inv-kpi-row">
        <div className="inv-kpi-card inv-kpi-card--green">
          <div className="inv-kpi-label">Total Finished Stock</div>
          <div className="inv-kpi-value">{totalVolume.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 400 }}>units</span></div>
        </div>
        <div className="inv-kpi-card inv-kpi-card--blue">
          <div className="inv-kpi-label">Dispatch Ready</div>
          <div className="inv-kpi-value">{dispatchReady.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 400 }}>units</span></div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-label">Product Types</div>
          <div className="inv-kpi-value">{inventory.length}</div>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={inventory}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={inventory.length}
        emptyMessage="No finished goods records found. Complete a production order to populate stock."
      />
    </div>
  );
};

// ── Main Inventory Page ───────────────────────────────────────────────
const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('raw');

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Inventory Dashboard</h1>
          <p className="inv-subtitle">Monitor raw materials, work-in-progress batches, and finished goods stock</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="inv-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`inv-tab ${activeTab === tab.key ? 'inv-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span className="inv-tab__label">{tab.label}</span>
            {activeTab === tab.key && <span className="inv-tab__indicator" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="inv-content">
        {activeTab === 'raw' && <RawMaterialsTab />}
        {activeTab === 'wip' && <WipTab />}
        {activeTab === 'finished' && <FinishedGoodsTab />}
      </div>
    </div>
  );
};

export default InventoryPage;
