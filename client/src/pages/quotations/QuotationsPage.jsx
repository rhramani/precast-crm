import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetQuotationsQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
} from '../../store/api/quotationApi';
import { useGetCustomersQuery } from '../../store/api/customerApi';
import { useGetProjectsQuery, useLazyGetCombinedRequirementsQuery } from '../../store/api/projectApi';
import { useGetProductsQuery } from '../../store/api/productApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const QuotationsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetQuotationsQuery({
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

  // Mutations
  const [createQuotation] = useCreateQuotationMutation();
  const [updateQuotation] = useUpdateQuotationMutation();
  const [updateStatus] = useUpdateQuotationStatusMutation();
  const [deleteQuotation] = useDeleteQuotationMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  const navigate = useNavigate();

  const [triggerGetCombinedReqs, { isLoading: importLoading }] = useLazyGetCombinedRequirementsQuery();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [form, setForm] = useState({
    customerId: '',
    projectId: '',
    quoteNumber: '',
    validUntil: '',
  });

  // Staged Quote Items
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
    setSelectedQuote(null);
    setForm({
      customerId: '',
      projectId: '',
      quoteNumber: '',
      validUntil: '',
    });
    setItems([]);
    setStageItem({ productId: '', quantity: '', rate: '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (quote) => {
    setSelectedQuote(quote);
    setForm({
      customerId: quote.customerId?._id || quote.customerId || '',
      projectId: quote.projectId?._id || quote.projectId || '',
      quoteNumber: quote.quoteNumber || '',
      validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : '',
    });
    setItems(
      quote.items.map((it) => ({
        productId: it.productId?._id || it.productId,
        productName: it.productId?.productName || 'Product',
        productCode: it.productId?.productCode || '',
        quantity: it.quantity,
        rate: it.rate,
        taxPercent: it.taxPercent || 18,
      }))
    );
    setStageItem({ productId: '', quantity: '', rate: '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleAddItem = () => {
    setValidationErrors({});
    if (!stageItem.productId) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Select a product' }));
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
      setValidationErrors((prev) => ({ ...prev, itemError: 'Product is already added' }));
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

  const handleStatusTransition = async (id, nextStatus) => {
    try {
      await updateStatus({ id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update quotation status');
    }
  };

  const handleImportFromSites = async () => {
    if (!form.projectId) return;
    try {
      const res = await triggerGetCombinedReqs(form.projectId).unwrap();
      if (res && res.success && res.data) {
        if (res.data.length === 0) {
          alert("No requirement calculations found for this project's sites. Please calculate requirements for sites first.");
          return;
        }

        const importedItems = res.data.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          quantity: item.quantity,
          rate: item.rate,
          taxPercent: item.taxPercent || 18
        }));

        setItems(importedItems);
      }
    } catch (err) {
      alert(err?.data?.message || 'Failed to import requirements.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.customerId) errors.customerId = 'Customer is required';
    if (!form.projectId)  errors.projectId = 'Project is required';
    if (items.length === 0) errors.general = 'Add at least one item to the quotation';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        customerId: form.customerId,
        projectId: form.projectId,
        quoteNumber: form.quoteNumber || undefined,
        validUntil: form.validUntil || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          rate: it.rate,
          taxPercent: it.taxPercent,
        })),
      };

      if (selectedQuote) {
        await updateQuotation({ id: selectedQuote._id, ...payload }).unwrap();
      } else {
        await createQuotation(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const handleDeleteQuotation = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteQuotation(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete quotation.');
    }
  };

  const columns = [
    { key: 'quoteNumber', label: 'Quote Number', sortable: true },
    {
      key: 'customerId',
      label: 'Customer',
      render: (val) => (
        <span>
          <strong>{val?.customerName}</strong>
          {val?.companyName && <span style={{ fontSize: 'var(--text-xs)', display: 'block', color: 'var(--color-text-secondary)' }}>{val.companyName}</span>}
        </span>
      ),
    },
    { key: 'projectId', label: 'Project Name', render: (val) => val?.projectName || '—' },
    { key: 'grandTotal', label: 'Grand Total (₹)', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'validUntil',
      label: 'Valid Until',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/quotations/${row._id}`), type: 'info' },
          row.status === 'draft' && { label: 'Edit Quote', onClick: () => handleOpenEdit(row), type: 'primary' },
          row.status === 'draft' && { label: 'Send Quote', onClick: () => handleStatusTransition(row._id, 'sent'), type: 'success' },
          row.status === 'sent' && { label: 'Accept Quote', onClick: () => handleStatusTransition(row._id, 'accepted'), type: 'success' },
          row.status === 'sent' && { label: 'Reject Quote', onClick: () => handleStatusTransition(row._id, 'rejected'), type: 'danger' },
          { divider: true },
          { label: 'Delete', onClick: () => handleDeleteQuotation(row._id), type: 'danger' }
        ];
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Sales Quotations Pipeline"
        columns={columns}
        data={data?.data?.quotations || []}
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
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + New Quotation
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedQuote ? 'Edit Quotation' : 'Create Quotation'}
        width="600px"
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ display: 'block', marginBottom: '12px' }}>{validationErrors.general}</div>}

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Customer</label>
            <select
              className="field-select"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              disabled={!!selectedQuote}
            >
              <option value="">Choose customer...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.customerName}</option>
              ))}
            </select>
            {validationErrors.customerId && <span className="field-error">{validationErrors.customerId}</span>}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Project</label>
            <select
              className="field-select"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              disabled={!!selectedQuote}
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

        {form.projectId && !selectedQuote && (
          <button
            type="button"
            onClick={handleImportFromSites}
            className="btn btn--secondary btn--sm"
            style={{ marginBottom: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            disabled={importLoading}
          >
            {importLoading ? 'Importing...' : '⚡ Import items from Project Sites calculations'}
          </button>
        )}

        <div className="form-row">

          <div className="field-group">
            <label className="field-label">Valid Until</label>
            <input
              type="date"
              className="field-input"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
            />
          </div>
        </div>

        {/* Dynamic quote item staging */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
          <h4>Line Items</h4>
          {validationErrors.itemError && <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>{validationErrors.itemError}</span>}

          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div className="field-group">
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Product</label>
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
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Quantity</label>
              <input
                type="number"
                className="field-input"
                value={stageItem.quantity}
                onChange={(e) => setStageItem({ ...stageItem, quantity: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Unit Rate (₹)</label>
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

          {/* Staged Items list */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr className="data-table__head">
                  <th className="data-table__th">Product</th>
                  <th className="data-table__th">Quantity</th>
                  <th className="data-table__th">Unit Rate (₹)</th>
                  <th className="data-table__th">Total (₹)</th>
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
                      <td className="data-table__td">{item.productName}</td>
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action is permanent."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default QuotationsPage;
