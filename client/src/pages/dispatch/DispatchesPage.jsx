import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetDispatchesQuery,
  useCreateDispatchMutation,
  useUpdateDispatchMutation,
  useConfirmDispatchMutation,
  useConfirmDeliveryMutation,
} from '../../store/api/dispatchApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { useGetFinishedGoodsInventoryQuery } from '../../store/api/inventoryApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const DispatchesPage = () => {
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
  const { data, isLoading } = useGetDispatchesQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const { data: finishedGoodsRes } = useGetFinishedGoodsInventoryQuery();
  const finishedGoods = finishedGoodsRes?.data?.items || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createDispatch] = useCreateDispatchMutation();
  const [updateDispatch] = useUpdateDispatchMutation();
  const [confirmDispatch] = useConfirmDispatchMutation();
  const [confirmDelivery] = useConfirmDeliveryMutation();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [form, setForm] = useState({
    projectId: '',
    siteId: '',
    dispatchNumber: '',
    branchId: '',
    vehicleNumber: '',
    driverName: '',
    contactNumber: '',
    helperName: '',
  });

  const [items, setItems] = useState([]);
  const [stageItem, setStageItem] = useState({
    productId: '',
    quantity: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Dynamic project sites lookup
  const [projectSites, setProjectSites] = useState([]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  // Fetch sites for selected project
  const handleProjectChange = async (projectId) => {
    setForm((prev) => ({ ...prev, projectId, siteId: '' }));
    if (!projectId) {
      setProjectSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load project sites');
      }
      const resData = await response.json();
      if (resData.success) {
        setProjectSites(resData.data.sites || []);
      } else {
        throw new Error(resData.message || 'Failed to load project sites');
      }
    } catch (e) {
      setProjectSites([]);
      alert(e.message || 'Failed to load project sites');
    }
  };

  const handleOpenAdd = () => {
    setSelectedDispatch(null);
    setForm({
      projectId: '',
      siteId: '',
      dispatchNumber: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
      vehicleNumber: '',
      driverName: '',
      contactNumber: '',
      helperName: '',
    });
    setItems([]);
    setProjectSites([]);
    setStageItem({ productId: '', quantity: '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (disp) => {
    setSelectedDispatch(disp);
    setForm({
      projectId: disp.projectId?._id || disp.projectId || '',
      siteId: disp.siteId?._id || disp.siteId || '',
      dispatchNumber: disp.dispatchNumber || '',
      branchId: disp.branchId || '',
      vehicleNumber: disp.transportDetails?.vehicleNumber || '',
      driverName: disp.transportDetails?.driverName || '',
      contactNumber: disp.transportDetails?.contactNumber || '',
      helperName: disp.transportDetails?.helperName || '',
    });

    // Populate sites list for that project
    const projId = disp.projectId?._id || disp.projectId;
    if (projId) {
      try {
        const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || 'Failed to load project sites');
        }
        const resData = await response.json();
        if (resData.success) {
          setProjectSites(resData.data.sites || []);
        } else {
          throw new Error(resData.message || 'Failed to load project sites');
        }
      } catch (e) {
        setProjectSites([]);
        alert(e.message || 'Failed to load project sites');
      }
    }

    setItems(
      disp.items.map((it) => ({
        productId: it.productId?._id || it.productId,
        productName: it.productId?.productName || 'Product',
        productCode: it.productId?.productCode || '',
        quantity: it.quantity,
      }))
    );
    setStageItem({ productId: '', quantity: '' });
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

    const prod = finishedGoods.find((fg) => fg.productId === stageItem.productId);
    if (!prod) return;

    if (items.some((it) => it.productId === prod.productId)) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Product is already added' }));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: prod.productId,
        productName: prod.productName,
        productCode: prod.productCode,
        quantity: qty,
      },
    ]);
    setStageItem({ productId: '', quantity: '' });
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmDispatch = async (id) => {
    if (!confirm('Are you sure you want to mark this dispatch as shipped? This will deduct finished goods inventory.')) return;
    try {
      await confirmDispatch(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Dispatch confirmation failed.');
    }
  };

  const handleConfirmDelivery = async (id) => {
    try {
      await confirmDelivery(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Delivery confirmation failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.projectId) errors.projectId = 'Project mapping is required';
    if (!form.siteId)    errors.siteId = 'Site destination is required';
    if (items.length === 0) errors.general = 'Add at least one precast product to dispatch';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        projectId: form.projectId,
        siteId: form.siteId,
        dispatchNumber: form.dispatchNumber || undefined,
        branchId: form.branchId || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        transportDetails: {
          vehicleNumber: form.vehicleNumber,
          driverName: form.driverName,
          contactNumber: form.contactNumber,
          helperName: form.helperName,
        },
      };

      if (selectedDispatch) {
        await updateDispatch({ id: selectedDispatch._id, ...payload }).unwrap();
      } else {
        await createDispatch(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const columns = [
    { key: 'dispatchNumber', label: 'Dispatch Number', sortable: true },
    { key: 'projectId', label: 'Project', render: (val) => val?.projectName || '—' },
    { key: 'siteId', label: 'Laying Site', render: (val) => val?.siteName || '—' },
    {
      key: 'transport',
      label: 'Vehicle / Driver',
      render: (_, row) => (
        <span style={{ fontSize: '11px' }}>
          <strong>{row.transportDetails?.vehicleNumber || '—'}</strong>
          <span style={{ display: 'block', color: 'var(--color-text-secondary)' }}>
            {row.transportDetails?.driverName || '—'}
          </span>
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'dates',
      label: 'Dispatch / Delivery Dates',
      render: (_, row) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Out: {row.dispatchedDate ? new Date(row.dispatchedDate).toLocaleDateString() : '—'} /{' '}
          In: {row.deliveredDate ? new Date(row.deliveredDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/dispatch/${row._id}`), type: 'info' },
          row.status === 'draft' && { label: 'Edit Dispatch', onClick: () => handleOpenEdit(row), type: 'primary' },
          row.status === 'draft' && { label: 'Ship Vehicle', onClick: () => handleConfirmDispatch(row._id), type: 'success' },
          row.status === 'dispatched' && { label: 'Confirm Delivered', onClick: () => handleConfirmDelivery(row._id), type: 'success' }
        ];
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Dispatches Log"
        columns={columns}
        data={data?.data?.dispatches || []}
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
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Log Dispatch
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedDispatch ? 'Edit Dispatch' : 'Log Dispatch'}
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
            <label className="field-label field-label--required">Project</label>
            <select
              className="field-select"
              value={form.projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={!!selectedDispatch}
            >
              <option value="">Choose project...</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
            </select>
            {validationErrors.projectId && <span className="field-error">{validationErrors.projectId}</span>}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Site Destination</label>
            <select
              className="field-select"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              disabled={!form.projectId || !!selectedDispatch}
            >
              <option value="">Select Site...</option>
              {projectSites.map((s) => (
                <option key={s._id} value={s._id}>{s.siteName}</option>
              ))}
            </select>
            {validationErrors.siteId && <span className="field-error">{validationErrors.siteId}</span>}
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
                disabled={!!selectedDispatch}
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

        <h4 style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>Transport Logistics</h4>
        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Vehicle / Lorry Number</label>
            <input
              type="text"
              className="field-input"
              value={form.vehicleNumber}
              onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
              placeholder="e.g. MH-12-PQ-9999"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Driver Name</label>
            <input
              type="text"
              className="field-input"
              value={form.driverName}
              onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              placeholder="Full Name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Driver Mobile</label>
            <input
              type="text"
              className="field-input"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              placeholder="Mobile"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Helper Name</label>
            <input
              type="text"
              className="field-input"
              value={form.helperName}
              onChange={(e) => setForm({ ...form, helperName: e.target.value })}
              placeholder="Helper Name"
            />
          </div>
        </div>

        {/* Staging dispatches items */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4>Dispatched Finished Goods</h4>
          {validationErrors.itemError && <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>{validationErrors.itemError}</span>}

          <div className="form-row form-row--dynamic-3" style={{ gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div className="field-group">
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Select Product</label>
              <select
                className="field-select"
                value={stageItem.productId}
                onChange={(e) => setStageItem({ ...stageItem, productId: e.target.value })}
              >
                <option value="">Choose product...</option>
                {finishedGoods.map((fg) => (
                  <option key={fg.productId} value={fg.productId}>
                    {fg.productName} ({fg.productCode}) | Avail: {fg.availableStock} {fg.unit}
                  </option>
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
                  <th className="data-table__th">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-secondary)' }}>No items added yet.</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="data-table__row">
                      <td className="data-table__td">{item.productName} ({item.productCode})</td>
                      <td className="data-table__td">{item.quantity}</td>
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

export default DispatchesPage;
