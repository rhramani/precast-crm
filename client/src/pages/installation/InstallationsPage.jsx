import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetInstallationsQuery,
  useCreateInstallationMutation,
  useUpdateInstallationMutation,
  useUpdateInstallationStatusMutation,
} from '../../store/api/installationApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const InstallationsPage = () => {
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
  const { data, isLoading } = useGetInstallationsQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const { data: productsRes } = useGetProductsQuery({ limit: 100 });
  const products = productsRes?.data?.products || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createInstallation] = useCreateInstallationMutation();
  const [updateInstallation] = useUpdateInstallationMutation();
  const [updateStatus] = useUpdateInstallationStatusMutation();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInstall, setSelectedInstall] = useState(null);
  const [form, setForm] = useState({
    projectId: '',
    siteId: '',
    installNumber: '',
    branchId: '',
    teamSize: 0,
    labourCount: 0,
  });

  const [itemsInstalled, setItemsInstalled] = useState([]);
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

  // Fetch sites for selected project
  const handleProjectChange = async (projectId) => {
    setForm((prev) => ({ ...prev, projectId, siteId: '' }));
    if (!projectId) {
      setProjectSites([]);
      return;
    }
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const resData = await response.json();
      if (resData.success) {
        setProjectSites(resData.data.sites || []);
      }
    } catch (e) {
      setProjectSites([]);
    }
  };

  const handleOpenAdd = () => {
    setSelectedInstall(null);
    setForm({
      projectId: '',
      siteId: '',
      installNumber: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
      teamSize: 0,
      labourCount: 0,
    });
    setItemsInstalled([]);
    setProjectSites([]);
    setStageItem({ productId: '', quantity: '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (inst) => {
    setSelectedInstall(inst);
    setForm({
      projectId: inst.projectId?._id || inst.projectId || '',
      siteId: inst.siteId?._id || inst.siteId || '',
      installNumber: inst.installNumber || '',
      branchId: inst.branchId || '',
      teamSize: inst.teamSize || 0,
      labourCount: inst.labourCount || 0,
    });

    // Populate sites list for that project
    const projId = inst.projectId?._id || inst.projectId;
    if (projId) {
      try {
        const response = await fetch(`/api/v1/projects/${projId}/sites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const resData = await response.json();
        if (resData.success) {
          setProjectSites(resData.data.sites || []);
        }
      } catch (e) {
        setProjectSites([]);
      }
    }

    setItemsInstalled(
      inst.itemsInstalled.map((it) => ({
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

    const prod = products.find((p) => p._id === stageItem.productId);
    if (!prod) return;

    if (itemsInstalled.some((it) => it.productId === prod._id)) {
      setValidationErrors((prev) => ({ ...prev, itemError: 'Product is already added' }));
      return;
    }

    setItemsInstalled((prev) => [
      ...prev,
      {
        productId: prod._id,
        productName: prod.productName,
        productCode: prod.productCode,
        quantity: qty,
      },
    ]);
    setStageItem({ productId: '', quantity: '' });
  };

  const handleRemoveItem = (idx) => {
    setItemsInstalled((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStatusTransition = async (id, nextStatus) => {
    try {
      await updateStatus({ id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update installation status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.projectId) errors.projectId = 'Project mapping is required';
    if (!form.siteId)    errors.siteId = 'Site layout target is required';
    if (itemsInstalled.length === 0) errors.general = 'Add at least one installed product log';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        projectId: form.projectId,
        siteId: form.siteId,
        installNumber: form.installNumber || undefined,
        branchId: form.branchId || undefined,
        itemsInstalled: itemsInstalled.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        teamSize: Number(form.teamSize || 0),
        labourCount: Number(form.labourCount || 0),
      };

      if (selectedInstall) {
        await updateInstallation({ id: selectedInstall._id, ...payload }).unwrap();
      } else {
        await createInstallation(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const columns = [
    { key: 'installNumber', label: 'Install Log No.', sortable: true },
    { key: 'projectId', label: 'Project', render: (val) => val?.projectName || '—' },
    { key: 'siteId', label: 'Site Name', render: (val) => val?.siteName || '—' },
    {
      key: 'crew',
      label: 'Crews / Labourers',
      render: (_, row) => (
        <span style={{ fontSize: '11px' }}>
          Teams: <strong>{row.teamSize || 0}</strong> / Labourers: <strong>{row.labourCount || 0}</strong>
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'dates',
      label: 'Dates (Start / Completed)',
      render: (_, row) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Start: {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'} /{' '}
          Done: {row.completedDate ? new Date(row.completedDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          { label: 'View Details', onClick: () => navigate(`/installation/${row._id}`), type: 'info' },
          row.status === 'planned' && { label: 'Edit Crew', onClick: () => handleOpenEdit(row), type: 'primary' },
          row.status === 'planned' && { label: 'Start Crew', onClick: () => handleStatusTransition(row._id, 'in_progress'), type: 'success' },
          row.status === 'in_progress' && { label: 'Complete Install', onClick: () => handleStatusTransition(row._id, 'completed'), type: 'success' }
        ];
        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Installation Logs"
        columns={columns}
        data={data?.data?.installations || []}
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
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Log Installation
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedInstall ? 'Edit Installation' : 'Log Installation'}
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
              disabled={!!selectedInstall}
            >
              <option value="">Choose project...</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
            </select>
            {validationErrors.projectId && <span className="field-error">{validationErrors.projectId}</span>}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Laying Site</label>
            <select
              className="field-select"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              disabled={!form.projectId || !!selectedInstall}
            >
              <option value="">Select Site...</option>
              {projectSites.map((s) => (
                <option key={s._id} value={s._id}>{s.siteName}</option>
              ))}
            </select>
            {validationErrors.siteId && <span className="field-error">{validationErrors.siteId}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Sequence Number (Optional)</label>
            <input
              type="text"
              className="field-input"
              value={form.installNumber}
              onChange={(e) => setForm({ ...form, installNumber: e.target.value })}
              placeholder="Auto-generated if blank"
              disabled={!!selectedInstall}
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                disabled={!!selectedInstall}
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
            <label className="field-label">Crews Assigned</label>
            <input
              type="number"
              className="field-input"
              value={form.teamSize}
              onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) })}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Total Labourers Count</label>
            <input
              type="number"
              className="field-input"
              value={form.labourCount}
              onChange={(e) => setForm({ ...form, labourCount: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Dynamic staging installation items */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4>Installed Products Logs</h4>
          {validationErrors.itemError && <span className="field-error" style={{ display: 'block', marginBottom: '8px' }}>{validationErrors.itemError}</span>}

          <div className="form-row" style={{ gridTemplateColumns: '3fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
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
                {itemsInstalled.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-secondary)' }}>No items logged yet.</td>
                  </tr>
                ) : (
                  itemsInstalled.map((item, idx) => (
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

export default InstallationsPage;
