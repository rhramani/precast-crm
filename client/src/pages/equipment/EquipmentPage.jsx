import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetEquipmentListQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useAllocateEquipmentMutation,
  useReleaseEquipmentMutation,
  useDeleteEquipmentMutation,
} from '../../store/api/equipmentApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import './EquipmentPage.css';

const TYPE_MAP = {
  crane: '🏗️ Crane',
  jcb: '🚜 JCB Excavator',
  vehicle: '🚛 Transport Vehicle',
  other: '⚙️ Other Machinery',
};

const EquipmentPage = () => {
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetEquipmentListQuery({
    page,
    limit,
    search,
    status: statusFilter,
    type: typeFilter,
    sortBy,
    sortOrder,
  });

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  // Mutations
  const [createEquipment] = useCreateEquipmentMutation();
  const [updateEquipment] = useUpdateEquipmentMutation();
  const [allocateEquipment] = useAllocateEquipmentMutation();
  const [releaseEquipment] = useReleaseEquipmentMutation();
  const [deleteEquipment] = useDeleteEquipmentMutation();

  // Dialog & Drawer States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null); // null = add, otherwise edit
  
  const [form, setForm] = useState({
    name: '',
    type: 'crane',
    ratePerDay: '',
    branchId: '',
  });

  const [allocateDrawerOpen, setAllocateDrawerOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    projectId: '',
    siteId: '',
  });
  const [projectSites, setProjectSites] = useState([]);

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
    setSelectedEquipment(null);
    setForm({
      name: '',
      type: 'crane',
      ratePerDay: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (eq) => {
    setSelectedEquipment(eq);
    setForm({
      name: eq.name || '',
      type: eq.type || 'crane',
      ratePerDay: eq.ratePerDay || '',
      branchId: eq.branchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenAllocate = (eq) => {
    setSelectedEquipment(eq);
    setAllocationForm({ projectId: '', siteId: '' });
    setProjectSites([]);
    setValidationErrors({});
    setAllocateDrawerOpen(true);
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  const handleProjectChange = async (projectId) => {
    setAllocationForm((prev) => ({ ...prev, projectId, siteId: '' }));
    if (!projectId) {
      setProjectSites([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load project sites');
      }
      const body = await res.json();
      setProjectSites(body?.data?.sites || []);
    } catch (err) {
      alert(err.message || 'Failed to load project sites');
    }
  };

  const handleRelease = async (eqId) => {
    if (!window.confirm('Are you sure you want to release this machinery back to the available fleet?')) {
      return;
    }
    try {
      await releaseEquipment(eqId).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Release failed');
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteEquipment(confirmDialog.id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Delete operation failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    
    const errors = {};
    if (!form.name.trim()) errors.name = 'Equipment name is required';
    if (!form.ratePerDay) errors.ratePerDay = 'Daily allocation cost rate is required';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        ratePerDay: Number(form.ratePerDay),
        branchId: form.branchId || undefined,
      };

      if (selectedEquipment) {
        await updateEquipment({ id: selectedEquipment._id, ...payload }).unwrap();
      } else {
        await createEquipment(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to save machinery record.' });
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    if (!allocationForm.siteId) {
      setValidationErrors({ siteId: 'Please select a destination site for deployment' });
      return;
    }

    try {
      await allocateEquipment({
        id: selectedEquipment._id,
        siteId: allocationForm.siteId,
      }).unwrap();
      setAllocateDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Allocation operation failed' });
    }
  };

  const columns = [
    { key: 'name', label: 'Equipment Name', sortable: true },
    { key: 'type', label: 'Machinery Type', render: (val) => TYPE_MAP[val] || val },
    { key: 'ratePerDay', label: 'Daily Cost Rate (₹)', render: (val) => `₹${val?.toLocaleString()}` },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'allocatedTo',
      label: 'Deployment Location',
      render: (val, row) => (
        val ? (
          <span style={{ fontSize: '12px' }}>
            📍 {val.siteName}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>—</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const actions = [
          row.status === 'available' && { label: 'Deploy to Site', onClick: () => handleOpenAllocate(row), type: 'primary' },
          row.status === 'allocated' && { label: 'Release to Yard', onClick: () => handleRelease(row._id), type: 'success' },
          { label: 'Edit Equipment', onClick: () => handleOpenEdit(row), type: 'secondary' },
          { label: 'Decommission', onClick: () => handleDeleteClick(row._id), type: 'danger' }
        ].filter(Boolean);

        return <ActionsDropdown actions={actions} />;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Fleet & Equipment Registry"
        subtitle="Manage branch cranes, JCBs, mixers, and fleet deployment costing parameters."
        columns={columns}
        data={data?.data?.equipment || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        filters={
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="filter-group">
              <label className="field-label">Machinery Type</label>
              <select
                className="field-select"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Types</option>
                <option value="crane">🏗️ Crane</option>
                <option value="jcb">🚜 JCB</option>
                <option value="vehicle">🚛 Vehicle</option>
                <option value="other">⚙️ Other</option>
              </select>
            </div>
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
                <option value="available">Available (Yard)</option>
                <option value="allocated">Allocated (Site)</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Register Machinery
          </button>
        }
      />

      {/* Drawer 1: Add / Edit Equipment */}
      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedEquipment ? 'Edit Equipment Details' : 'Register New Machinery'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save Machinery</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Equipment Name / Registration No.</label>
          <input
            type="text"
            className="field-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Hydra Crane MH-12-PQ-4567"
          />
          {validationErrors.name && <span className="field-error">{validationErrors.name}</span>}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Equipment Type</label>
          <select
            className="field-select"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="crane">🏗️ Crane</option>
            <option value="jcb">🚜 JCB Excavator</option>
            <option value="vehicle">🚛 Transport Vehicle</option>
            <option value="other">⚙️ Other Machinery</option>
          </select>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Daily Cost Rate (₹)</label>
          <input
            type="number"
            className="field-input"
            value={form.ratePerDay}
            onChange={(e) => setForm({ ...form, ratePerDay: e.target.value })}
            placeholder="e.g. 5000"
          />
          {validationErrors.ratePerDay && <span className="field-error">{validationErrors.ratePerDay}</span>}
        </div>

        {userRole === 'super_admin' && (
          <div className="field-group">
            <label className="field-label field-label--required">Assign to Branch</label>
            <select
              className="field-select"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Choose branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
            {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
          </div>
        )}
      </FormDrawer>

      {/* Drawer 2: Deploy / Allocate to Site */}
      <FormDrawer
        open={allocateDrawerOpen}
        onClose={() => setAllocateDrawerOpen(false)}
        title={`Deploy ${selectedEquipment?.name} to Project`}
        footer={
          <>
            <button onClick={() => setAllocateDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleAllocateSubmit} className="btn btn--primary">Confirm Deployment</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div style={{ marginBottom: '16px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Allocate <strong>{selectedEquipment?.name}</strong> to an active site location. Daily cost rates will sum into project costing metrics.
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Select Customer Project</label>
          <select
            className="field-select"
            value={allocationForm.projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">Choose Project...</option>
            {projects
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Erection Site Destination</label>
          <select
            className="field-select"
            value={allocationForm.siteId}
            onChange={(e) => setAllocationForm({ ...allocationForm, siteId: e.target.value })}
            disabled={projectSites.length === 0}
          >
            <option value="">
              {projectSites.length === 0 ? 'Select project first...' : 'Select site location...'}
            </option>
            {projectSites.map((s) => (
              <option key={s._id} value={s._id}>{s.siteName} ({s.siteAddress})</option>
            ))}
          </select>
          {validationErrors.siteId && <span className="field-error">{validationErrors.siteId}</span>}
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Decommission Equipment"
        message="Are you sure you want to permanently decommission and delete this machinery from the fleet record?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default EquipmentPage;
