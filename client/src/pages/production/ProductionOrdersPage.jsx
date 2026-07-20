import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetProductionOrdersQuery,
  useCreateProductionOrderMutation,
  useUpdateProductionOrderStatusMutation,
  useCompleteProductionOrderMutation,
  useUpdateProductionOrderMutation,
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
  const [updateOrder] = useUpdateProductionOrderMutation();

  // Modal / Drawer States
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    plannedQuantity: '',
    orderNumber: '',
    startDate: '',
    branchId: '',
  });

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    productId: '',
    plannedQuantity: '',
    orderNumber: '',
    startDate: '',
    branchId: '',
    status: '',
  });

  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    producedQuantity: '',
    damagedQuantity: '0',
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
      damagedQuantity: order.damagedQuantity || '0',
      remarks: order.remarks || '',
    });
    setValidationErrors({});
    setCompleteDrawerOpen(true);
  };

  const handleOpenEdit = (order) => {
    setEditForm({
      id: order._id,
      productId: order.productId?._id || order.productId || '',
      plannedQuantity: order.plannedQuantity,
      orderNumber: order.orderNumber || '',
      startDate: order.startDate ? new Date(order.startDate).toISOString().split('T')[0] : '',
      branchId: order.branchId || '',
      status: order.status,
    });
    setValidationErrors({});
    setEditDrawerOpen(true);
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};
    if (!editForm.productId) errors.productId = 'Product is required';
    if (!editForm.plannedQuantity || Number(editForm.plannedQuantity) <= 0) errors.plannedQuantity = 'Quantity must be greater than 0';
    if (userRole === 'super_admin' && !editForm.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await updateOrder({
        id: editForm.id,
        productId: editForm.productId,
        plannedQuantity: Number(editForm.plannedQuantity),
        orderNumber: editForm.orderNumber || undefined,
        startDate: editForm.startDate || null,
        branchId: editForm.branchId || undefined,
      }).unwrap();
      setEditDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to update production order' });
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const qty = Number(completeForm.producedQuantity);
    const damagedQty = Number(completeForm.damagedQuantity || 0);

    const errors = {};
    if (completeForm.producedQuantity === '' || isNaN(qty) || qty < 0) {
      errors.producedQuantity = 'Must be a valid produced quantity >= 0';
    }
    if (completeForm.damagedQuantity !== '' && (isNaN(damagedQty) || damagedQty < 0)) {
      errors.damagedQuantity = 'Damaged quantity must be a non-negative number';
    } else if (damagedQty > qty) {
      errors.damagedQuantity = 'Damaged quantity cannot exceed actual produced quantity';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await completeOrder({
        id: selectedOrder._id,
        producedQuantity: qty,
        damagedQuantity: damagedQty,
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
    { key: 'plannedQuantity', label: 'Planned Quantity', render: (val, row) => `${val} ${row.productId?.unit || ''}` },
    {
      key: 'producedQuantity',
      label: 'Produced Quantity',
      render: (val, row) => {
        if (row.status === 'completed') {
          const damaged = row.damagedQuantity || 0;
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{val}</span> {row.productId?.unit || ''}
              {damaged > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '2px' }}>
                  ⚠️ {damaged} damaged (Loss: ₹{(damaged * (row.bomId?.calculatedCost || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                </div>
              )}
            </div>
          );
        }
        return `${val} ${row.productId?.unit || ''}`;
      },
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'startDate',
      label: 'Start / Completion Dates',
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
          row.status !== 'completed' && row.status !== 'cancelled' && { label: 'Edit Order', onClick: () => handleOpenEdit(row), type: 'primary' },
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
        title="Production Orders Pipeline"
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
          <label className="field-label field-label--required">Product</label>
          <select
            className="field-select"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Choose Product...</option>
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
          <label className="field-label">Damaged Quantity</label>
          <input
            type="number"
            className="field-input"
            value={completeForm.damagedQuantity}
            onChange={(e) => setCompleteForm({ ...completeForm, damagedQuantity: e.target.value })}
            placeholder="e.g. 5"
          />
          {validationErrors.damagedQuantity && <span className="field-error">{validationErrors.damagedQuantity}</span>}
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

      {/* Drawer 3: Edit Production Order */}
      <FormDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit Production Order"
        footer={
          <>
            <button onClick={() => setEditDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleEditSubmit} className="btn btn--primary">Save Changes</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Product</label>
          <select
            className="field-select"
            value={editForm.productId}
            onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
            disabled={editForm.status !== 'draft'}
          >
            <option value="">Choose Product...</option>
            {products
              .filter((p) => p.status === 'active' || p._id === editForm.productId)
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.productName} ({p.productCode})
                </option>
              ))}
          </select>
          {editForm.status !== 'draft' && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
              Product cannot be changed after submitting for production.
            </span>
          )}
          {validationErrors.productId && <span className="field-error">{validationErrors.productId}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Planned Quantity</label>
            <input
              type="number"
              className="field-input"
              value={editForm.plannedQuantity}
              onChange={(e) => setEditForm({ ...editForm, plannedQuantity: e.target.value })}
              placeholder="e.g. 100"
            />
            {validationErrors.plannedQuantity && <span className="field-error">{validationErrors.plannedQuantity}</span>}
          </div>
          <div className="field-group">
            <label className="field-label">Order Number</label>
            <input
              type="text"
              className="field-input"
              value={editForm.orderNumber}
              onChange={(e) => setEditForm({ ...editForm, orderNumber: e.target.value })}
              placeholder="e.g. PRD-12345"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Target Start Date</label>
            <input
              type="date"
              className="field-input"
              value={editForm.startDate}
              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={editForm.branchId}
                onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                disabled={editForm.status !== 'draft'}
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
              {editForm.status !== 'draft' && (
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                  Branch cannot be changed after submitting for production.
                </span>
              )}
              {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
            </div>
          )}
        </div>
      </FormDrawer>
    </div>
  );
};

export default ProductionOrdersPage;
