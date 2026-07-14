import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useCancelInvoiceMutation,
} from '../../store/api/invoiceApi';
import { useGetCustomersQuery } from '../../store/api/customerApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const InvoicesPage = () => {
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
  const { data, isLoading } = useGetInvoicesQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: customersRes } = useGetCustomersQuery({ limit: 100 });
  const customers = customersRes?.data?.customers || [];

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const { data: productsRes } = useGetProductsQuery({ limit: 100 });
  const products = productsRes?.data?.products || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createInvoice] = useCreateInvoiceMutation();
  const [cancelInvoice] = useCancelInvoiceMutation();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    projectId: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    branchId: '',
  });

  const [items, setItems] = useState([]);
  const [stageItem, setStageItem] = useState({
    productId: '',
    quantity: '',
    rate: '',
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
      customerId: '',
      projectId: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setItems([]);
    setStageItem({ productId: '', quantity: '', rate: '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleAddItem = () => {
    setValidationErrors({});
    if (!stageItem.productId) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Select product' }));
      return;
    }
    const qty = Number(stageItem.quantity);
    if (!stageItem.quantity || isNaN(qty) || qty <= 0) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Quantity must be > 0' }));
      return;
    }
    const rate = Number(stageItem.rate);
    if (!stageItem.rate || isNaN(rate) || rate < 0) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Rate must be >= 0' }));
      return;
    }

    const prod = products.find((p) => p._id === stageItem.productId);
    if (!prod) return;

    if (items.some((it) => it.productId === prod._id)) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Product already added' }));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: prod._id,
        productName: prod.productName,
        productCode: prod.productCode,
        quantity: qty,
        rate,
        taxPercent: 18,
      },
    ]);
    setStageItem({ productId: '', quantity: '', rate: '' });
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCancelInvoice = async (id) => {
    if (!confirm('Are you sure you want to cancel this invoice? This action is irreversible.')) return;
    try {
      await cancelInvoice(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Invoice cancellation failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.customerId) errors.customerId = 'Customer mapping is required';
    if (!form.projectId)  errors.projectId = 'Project mapping is required';
    if (items.length === 0) errors.general = 'Add at least one item line to generate an invoice';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        customerId: form.customerId,
        projectId: form.projectId,
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceDate: form.invoiceDate || undefined,
        dueDate: form.dueDate || undefined,
        branchId: form.branchId || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          rate: it.rate,
          taxPercent: it.taxPercent,
        })),
      };

      await createInvoice(payload).unwrap();
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Invoice creation failed.' });
    }
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice No.', sortable: true },
    {
      key: 'customerId',
      label: 'Customer Client',
      render: (val) => (
        <span>
          <strong>{val?.customerName}</strong>
          {val?.companyName && <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-secondary)' }}>{val.companyName}</span>}
        </span>
      ),
    },
    { key: 'projectId', label: 'Project', render: (val) => val?.projectName || '—' },
    { key: 'grandTotal', label: 'Grand Total', render: (val) => `₹${val.toLocaleString()}` },
    {
      key: 'paymentProgress',
      label: 'Paid / Balance',
      render: (_, row) => (
        <span style={{ fontSize: '11px' }}>
          ₹{row.paidAmount.toLocaleString()} / <span style={{ color: 'var(--color-danger)' }}>₹{(row.grandTotal - row.paidAmount).toLocaleString()}</span>
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'invoiceDate',
      label: 'Billing Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const canCancel = row.status !== 'cancelled' && row.status !== 'paid';
        return (
          <ActionsDropdown
            actions={[
              { label: 'View Details', onClick: () => navigate(`/invoices/${row._id}`), type: 'info' },
              canCancel && { label: 'Cancel Invoice', onClick: () => handleCancelInvoice(row._id), type: 'danger' }
            ]}
          />
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Client Invoices"
        columns={columns}
        data={data?.data?.invoices || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        exportable={true}
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
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Generate Invoice
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Generate Invoice"
        width="600px"
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Create</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ display: 'block', marginBottom: '12px' }}>{validationErrors.general}</div>}

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Client / Customer</label>
            <select
              className="field-select"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">Choose customer...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.customerName}</option>
              ))}
            </select>
            {validationErrors.customerId && <span className="field-error">{validationErrors.customerId}</span>}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Select Project</label>
            <select
              className="field-select"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">Choose project...</option>
              {projects
                .filter((p) => p.customerId?._id === form.customerId || p.customerId === form.customerId)
                .map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))}
            </select>
            {validationErrors.projectId && <span className="field-error">{validationErrors.projectId}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Invoice Date</label>
            <input
              type="date"
              className="field-input"
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Due Date</label>
            <input
              type="date"
              className="field-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
        {userRole === 'super_admin' && (
          <div className="form-row">
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
          </div>
        )}

        {/* Dynamic invoice items staging */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4>Line Items</h4>
          {validationErrors.itemError && <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>{validationErrors.itemError}</span>}

          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div className="field-group">
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Select Product</label>
              <select
                className="field-select"
                value={stageItem.productId}
                onChange={(e) => setStageItem({ ...stageItem, productId: e.target.value })}
              >
                <option value="">Choose product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.productName} ({p.productCode})</option>
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
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Rate (₹)</label>
              <input
                type="number"
                className="field-input"
                value={stageItem.rate}
                onChange={(e) => setStageItem({ ...stageItem, rate: e.target.value })}
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
                  <th className="data-table__th">Product</th>
                  <th className="data-table__th">Quantity</th>
                  <th className="data-table__th">Unit Rate</th>
                  <th className="data-table__th">Total (Net)</th>
                  <th className="data-table__th">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-secondary)' }}>No items added yet.</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="data-table__row">
                      <td className="data-table__td">{item.productName} ({item.productCode})</td>
                      <td className="data-table__td">{item.quantity}</td>
                      <td className="data-table__td">₹{item.rate}</td>
                      <td className="data-table__td">₹{(item.quantity * item.rate).toLocaleString()}</td>
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
    </div>
  );
};

export default InvoicesPage;
