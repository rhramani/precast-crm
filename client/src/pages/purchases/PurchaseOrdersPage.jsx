import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useGetSuppliersQuery,
} from '../../store/api/purchaseApi';
import { useGetRawMaterialsQuery } from '../../store/api/rawMaterialApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const PurchaseOrdersPage = () => {
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
  const { data, isLoading } = useGetPurchaseOrdersQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: suppliersRes } = useGetSuppliersQuery({ limit: 100 });
  const suppliers = suppliersRes?.data?.suppliers || [];

  const { data: rawMaterialsRes } = useGetRawMaterialsQuery({ limit: 100 });
  const rawMaterials = rawMaterialsRes?.data?.materials || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createOrder] = useCreatePurchaseOrderMutation();
  const [updateOrder] = useUpdatePurchaseOrderMutation();
  const [receiveOrder] = useReceivePurchaseOrderMutation();

  // Drawer States
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({
    supplierId: '',
    poNumber: '',
    expectedDeliveryDate: '',
    branchId: '',
  });

  const [items, setItems] = useState([]);
  const [stageItem, setStageItem] = useState({
    materialId: '',
    quantity: '',
    purchaseRate: '',
  });

  const [receiveDrawerOpen, setReceiveDrawerOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ remarks: '' });

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
    setSelectedOrder(null);
    setForm({
      supplierId: '',
      poNumber: '',
      expectedDeliveryDate: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setItems([]);
    setStageItem({ materialId: '', quantity: '', purchaseRate: '' });
    setValidationErrors({});
    setCreateDrawerOpen(true);
  };

  const handleOpenEdit = (order) => {
    setSelectedOrder(order);
    setForm({
      supplierId: order.supplierId?._id || order.supplierId || '',
      poNumber: order.poNumber || '',
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
      branchId: order.branchId || '',
    });
    setItems(
      order.items.map((it) => ({
        materialId: it.materialId?._id || it.materialId,
        materialName: it.materialId?.materialName || 'Material',
        materialCode: it.materialId?.materialCode || '',
        unit: it.materialId?.unit || '',
        quantity: it.quantity,
        purchaseRate: it.purchaseRate,
      }))
    );
    setStageItem({ materialId: '', quantity: '', purchaseRate: '' });
    setValidationErrors({});
    setCreateDrawerOpen(true);
  };

  const handleOpenReceive = (order) => {
    setSelectedOrder(order);
    setReceiveForm({ remarks: '' });
    setValidationErrors({});
    setReceiveDrawerOpen(true);
  };

  const handleAddItem = () => {
    setValidationErrors({});
    if (!stageItem.materialId) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Select raw material' }));
      return;
    }
    const qty = Number(stageItem.quantity);
    if (!stageItem.quantity || isNaN(qty) || qty <= 0) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Quantity must be > 0' }));
      return;
    }
    const rate = Number(stageItem.purchaseRate);
    if (!stageItem.purchaseRate || isNaN(rate) || rate < 0) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Rate must be >= 0' }));
      return;
    }

    const mat = rawMaterials.find((m) => m._id === stageItem.materialId);
    if (!mat) return;

    if (items.some((it) => it.materialId === mat._id)) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Material is already added' }));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        materialId: mat._id,
        materialName: mat.materialName,
        materialCode: mat.materialCode,
        unit: mat.unit,
        quantity: qty,
        purchaseRate: rate,
      },
    ]);
    setStageItem({ materialId: '', quantity: '', purchaseRate: '' });
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.supplierId) errors.supplierId = 'Supplier is required';
    if (items.length === 0) errors.general = 'Add at least one raw material to the PO';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        supplierId: form.supplierId,
        poNumber: form.poNumber || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        branchId: form.branchId || undefined,
        items: items.map((it) => ({
          materialId: it.materialId,
          quantity: it.quantity,
          purchaseRate: it.purchaseRate,
        })),
      };

      if (selectedOrder) {
        await updateOrder({ id: selectedOrder._id, ...payload }).unwrap();
      } else {
        await createPurchaseOrder(payload).unwrap();
      }
      setCreateDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    try {
      await receiveOrder({ id: selectedOrder._id, remarks: receiveForm.remarks }).unwrap();
      setReceiveDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Goods receipt transaction failed.' });
    }
  };

  const handlePOStatusTransition = async (orderId, nextStatus) => {
    try {
      await updateOrder({ id: orderId, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update order status');
    }
  };

  const columns = [
    { key: 'poNumber', label: 'PO Number', sortable: true },
    { key: 'supplierId', label: 'Supplier', render: (val) => val?.supplierName || '—' },
    { key: 'grandTotal', label: 'Total Value', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'expectedDeliveryDate',
      label: 'Delivery Date',
      render: (_, row) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Exp: {row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate).toLocaleDateString() : '—'} /{' '}
          Recv: {row.receivedDate ? new Date(row.receivedDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/purchases/orders/${row._id}`), type: 'info' },
          row.status === 'draft' && { label: 'Edit PO', onClick: () => handleOpenEdit(row), type: 'primary' },
          row.status === 'draft' && { label: 'Place Order', onClick: () => handlePOStatusTransition(row._id, 'ordered'), type: 'success' },
          row.status === 'ordered' && { label: 'Receive Goods', onClick: () => handleOpenReceive(row), type: 'success' },
          row.status === 'ordered' && { label: 'Cancel PO', onClick: () => handlePOStatusTransition(row._id, 'cancelled'), type: 'danger' }
        ];
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Routing Tabs */}
      <div className="navigation-tabs">
        <NavLink
          end
          to="/purchases"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          📋 Purchase Orders
        </NavLink>
        <NavLink
          to="/purchases/suppliers"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          👥 Suppliers
        </NavLink>
      </div>

      <DataTable
        title="Purchase Orders catalog"
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
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + New Purchase Order
          </button>
        }
      />

      {/* Drawer 1: Create/Edit PO */}
      <FormDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title={selectedOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
        width="600px"
        footer={
          <>
            <button onClick={() => setCreateDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleCreateSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ display: 'block', marginBottom: '12px' }}>{validationErrors.general}</div>}

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Supplier</label>
            <select
              className="field-select"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              disabled={!!selectedOrder}
            >
              <option value="">Choose supplier...</option>
              {suppliers
                .filter((s) => s.status === 'active')
                .map((s) => (
                  <option key={s._id} value={s._id}>{s.supplierName}</option>
                ))}
            </select>
            {validationErrors.supplierId && <span className="field-error">{validationErrors.supplierId}</span>}
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                disabled={!!selectedOrder}
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

        <div className="form-row">

          <div className="field-group">
            <label className="field-label">Delivery Date</label>
            <input
              type="date"
              className="field-input"
              value={form.expectedDeliveryDate}
              onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
            />
          </div>
        </div>

        {/* Dynamic items staging */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
          <h4>Raw Material Items</h4>
          {validationErrors.itemError && <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>{validationErrors.itemError}</span>}

          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div className="field-group">
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Select Raw Material</label>
              <select
                className="field-select"
                value={stageItem.materialId}
                onChange={(e) => setStageItem({ ...stageItem, materialId: e.target.value })}
              >
                <option value="">Choose material...</option>
                {rawMaterials.map((m) => (
                  <option key={m._id} value={m._id}>{m.materialName} ({m.materialCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Qty</label>
              <input
                type="number"
                className="field-input"
                value={stageItem.quantity}
                onChange={(e) => setStageItem({ ...stageItem, quantity: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Purchase Rate (₹)</label>
              <input
                type="number"
                className="field-input"
                value={stageItem.purchaseRate}
                onChange={(e) => setStageItem({ ...stageItem, purchaseRate: e.target.value })}
              />
            </div>
            <button type="button" onClick={handleAddItem} className="btn btn--secondary" style={{ height: '36px' }}>
              Add
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr className="data-table__head">
                  <th className="data-table__th">Material Name</th>
                  <th className="data-table__th">Quantity</th>
                  <th className="data-table__th">Unit Rate</th>
                  <th className="data-table__th">Total (Net)</th>
                  <th className="data-table__th">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-secondary)' }}>No materials added yet.</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="data-table__row">
                      <td className="data-table__td">{item.materialName}</td>
                      <td className="data-table__td">{item.quantity} {item.unit}</td>
                      <td className="data-table__td">₹{item.purchaseRate}</td>
                      <td className="data-table__td">₹{(item.quantity * item.purchaseRate).toLocaleString()}</td>
                      <td className="data-table__td">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="btn btn--danger btn--sm">Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormDrawer>

      {/* Drawer 2: Receive Goods PO */}
      <FormDrawer
        open={receiveDrawerOpen}
        onClose={() => setReceiveDrawerOpen(false)}
        title="Receive Purchase Order Goods"
        footer={
          <>
            <button onClick={() => setReceiveDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleReceiveSubmit} className="btn btn--primary">Confirm Receipt</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ display: 'block', marginBottom: '12px' }}>{validationErrors.general}</div>}

        <div style={{ marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
          PO Number: <strong>{selectedOrder?.poNumber}</strong><br />
          Supplier: <strong>{selectedOrder?.supplierId?.supplierName}</strong>
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          By confirming receipt, the quantities in this purchase order will be added to the raw materials inventory automatically, and corresponding in ledger logs will be appended.
        </p>

        <div className="field-group">
          <label className="field-label">Receipt Notes / Remarks</label>
          <textarea
            className="field-textarea"
            value={receiveForm.remarks}
            onChange={(e) => setReceiveForm({ ...receiveForm, remarks: e.target.value })}
            placeholder="Add invoice numbers, quality check parameters..."
            rows={3}
          />
        </div>
      </FormDrawer>
    </div>
  );
};

export default PurchaseOrdersPage;
