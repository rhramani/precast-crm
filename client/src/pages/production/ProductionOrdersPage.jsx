import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetProductionOrdersQuery,
  useCreateProductionOrderMutation,
  useUpdateProductionOrderStatusMutation,
  useCompleteProductionOrderMutation,
} from '../../store/api/productionApi';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const ProductionOrdersPage = () => {
  const navigate = useNavigate();
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetProductionOrdersQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: productsRes } = useGetProductsQuery({ limit: 100 });
  const products = productsRes?.data?.products || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createOrder] = useCreateProductionOrderMutation();
  const [updateStatus] = useUpdateProductionOrderStatusMutation();
  const [completeOrder] = useCompleteProductionOrderMutation();

  // Modal / Drawer States
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    plannedQuantity: '',
    orderNumber: '',
    startDate: '',
    branchId: '',
  });

  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    producedQuantity: '',
    remarks: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleOpenAdd = () => {
    setForm({
      productId: '',
      plannedQuantity: '',
      orderNumber: '',
      startDate: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setValidationErrors({});
    setCreateDrawerOpen(true);
  };

  const handleOpenComplete = (order) => {
    setSelectedOrder(order);
    setCompleteForm({
      producedQuantity: order.plannedQuantity,
      remarks: '',
    });
    setValidationErrors({});
    setCompleteDrawerOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};
    if (!form.productId) errors.productId = 'Product is required';
    if (!form.plannedQuantity || Number(form.plannedQuantity) <= 0) errors.plannedQuantity = 'Quantity must be greater than 0';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await createOrder({
        productId: form.productId,
        plannedQuantity: Number(form.plannedQuantity),
        orderNumber: form.orderNumber || undefined,
        startDate: form.startDate || undefined,
        branchId: form.branchId || undefined,
      }).unwrap();
      setCreateDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to create production order' });
    }
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
      await completeOrder({
        id: selectedOrder._id,
        producedQuantity: qty,
        remarks: completeForm.remarks,
      }).unwrap();
      setCompleteDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to complete production order' });
    }
  };

  const handleStatusTransition = async (orderId, nextStatus) => {
    try {
      await updateStatus({ id: orderId, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update order status');
    }
  };

  const columns = [
    { key: 'orderNumber', label: 'Order Number', sortable: true },
    { key: 'productId', label: 'Product', render: (val) => val?.productName || '—' },
    { key: 'plannedQuantity', label: 'Planned Qty', render: (val, row) => `${val} ${row.productId?.unit || ''}` },
    { key: 'producedQuantity', label: 'Produced Qty', render: (val, row) => `${val} ${row.productId?.unit || ''}` },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'startDate',
      label: 'Dates (Start / Complete)',
      render: (_, row) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          S: {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'} /{' '}
          C: {row.completedDate ? new Date(row.completedDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/production/${row._id}`), type: 'info' },
          row.status === 'draft' && { label: 'Request Approval', onClick: () => handleStatusTransition(row._id, 'pending'), type: 'primary' },
          row.status === 'pending' && { label: 'Start Production', onClick: () => handleStatusTransition(row._id, 'in_production'), type: 'success' },
          row.status === 'pending' && { label: 'Cancel Order', onClick: () => handleStatusTransition(row._id, 'cancelled'), type: 'danger' },
          row.status === 'in_production' && { label: 'Complete Order', onClick: () => handleOpenComplete(row), type: 'success' },
          row.status === 'in_production' && { label: 'Cancel Order', onClick: () => handleStatusTransition(row._id, 'cancelled'), type: 'danger' },
          { divider: true },
          { label: 'Check Capacity', onClick: () => navigate(`/production/capacity-calculator`), type: 'primary' }
        ];
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Routing Tabs */}
      <div className="navigation-tabs">
        <NavLink
          end
          to="/production"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          🏭 Production Orders
        </NavLink>
        <NavLink
          to="/production/capacity-calculator"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          🧮 Capacity Calculator
        </NavLink>
      </div>

      <DataTable
        title="Production Orders pipeline"
        columns={columns}
        data={data?.data?.orders || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        filters={
          <div className="filter-group">
            <label className="field-label">Status</label>
            <select
              className="field-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="in_production">In Production</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + New Production Order
          </button>
        }
      />

      {/* Drawer 1: Create Production Order */}
      <FormDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Create Production Order"
        footer={
          <>
            <button onClick={() => setCreateDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleCreateSubmit} className="btn btn--primary">Create</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Select Product</label>
          <select
            className="field-select"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Choose product...</option>
            {products
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.productName} ({p.productCode})
                </option>
              ))}
          </select>
          {validationErrors.productId && <span className="field-error">{validationErrors.productId}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Planned Quantity</label>
            <input
              type="number"
              className="field-input"
              value={form.plannedQuantity}
              onChange={(e) => setForm({ ...form, plannedQuantity: e.target.value })}
              placeholder="e.g. 100"
            />
            {validationErrors.plannedQuantity && <span className="field-error">{validationErrors.plannedQuantity}</span>}
          </div>
          <div className="field-group">
            <label className="field-label">Order Number (Optional)</label>
            <input
              type="text"
              className="field-input"
              value={form.orderNumber}
              onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
              placeholder="Auto-generated if blank"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Target Start Date</label>
            <input
              type="date"
              className="field-input"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
              {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
            </div>
          )}
        </div>
      </FormDrawer>

      {/* Drawer 2: Complete Production Order */}
      <FormDrawer
        open={completeDrawerOpen}
        onClose={() => setCompleteDrawerOpen(false)}
        title="Complete Production Order"
        footer={
          <>
            <button onClick={() => setCompleteDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleCompleteSubmit} className="btn btn--primary">Complete Order</button>
          </>
        }
      >
        {validationErrors.general && (
          <div className="field-error" style={{ display: 'block', marginBottom: '16px' }}>
            ⚠️ {validationErrors.general}
          </div>
        )}

        <div style={{ marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
          Order: <strong>{selectedOrder?.orderNumber}</strong><br />
          Planned: <strong>{selectedOrder?.plannedQuantity} {selectedOrder?.productId?.unit}</strong>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Actual Produced Quantity</label>
          <input
            type="number"
            className="field-input"
            value={completeForm.producedQuantity}
            onChange={(e) => setCompleteForm({ ...completeForm, producedQuantity: e.target.value })}
            placeholder="e.g. 100"
          />
          {validationErrors.producedQuantity && <span className="field-error">{validationErrors.producedQuantity}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Production Remarks / Notes</label>
          <textarea
            className="field-textarea"
            value={completeForm.remarks}
            onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
            placeholder="Wastage notes, concrete mix logs, batch indicators..."
            rows={3}
          />
        </div>
      </FormDrawer>
    </div>
  );
};

export default ProductionOrdersPage;
