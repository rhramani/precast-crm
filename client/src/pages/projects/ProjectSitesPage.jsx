import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetProjectSitesQuery,
  useGetProjectQuery,
  useCreateSiteMutation,
  useUpdateSiteMutation,
  useUpdateSiteStatusMutation,
  useDeleteSiteMutation,
} from '../../store/api/projectApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const ProjectSitesPage = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  // Queries
  const { data: projectRes } = useGetProjectQuery(projectId);
  const { data: sitesRes, isLoading } = useGetProjectSitesQuery(projectId);
  const { data: branchData } = useGetBranchesQuery({ limit: 100 });

  const project = projectRes?.data?.project;
  const sites = sitesRes?.data?.sites || [];
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createSite] = useCreateSiteMutation();
  const [updateSite] = useUpdateSiteMutation();
  const [updateStatus] = useUpdateSiteStatusMutation();
  const [deleteSite] = useDeleteSiteMutation();

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  const handleDeleteSite = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    try {
      await deleteSite(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete site.');
    }
  };

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form, setForm] = useState({
    siteName: '',
    siteAddress: '',
    siteEngineer: '',
    contactNumber: '',
    startDate: '',
    endDate: '',
    siteArea: 0,
    branchId: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleOpenAdd = () => {
    setSelectedSite(null);
    setForm({
      siteName: '',
      siteAddress: '',
      siteEngineer: '',
      contactNumber: '',
      startDate: '',
      endDate: '',
      siteArea: 0,
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (site) => {
    setSelectedSite(site);
    setForm({
      siteName: site.siteName || '',
      siteAddress: site.siteAddress || '',
      siteEngineer: site.siteEngineer || '',
      contactNumber: site.contactNumber || '',
      startDate: site.startDate ? site.startDate.split('T')[0] : '',
      endDate: site.endDate ? site.endDate.split('T')[0] : '',
      siteArea: site.siteArea || 0,
      branchId: site.branchId?._id || site.branchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (site) => {
    const statuses = ['planned', 'in_progress', 'completed', 'on_hold'];
    const currentIdx = statuses.indexOf(site.status);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];

    try {
      await updateStatus({ id: site._id, projectId, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update site status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.siteName.trim()) errors.siteName = 'Site name is required';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        projectId,
        siteName: form.siteName,
        siteAddress: form.siteAddress || undefined,
        siteEngineer: form.siteEngineer || undefined,
        contactNumber: form.contactNumber || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        siteArea: Number(form.siteArea || 0),
        branchId: form.branchId || undefined,
      };

      if (selectedSite) {
        await updateSite({ id: selectedSite._id, projectId, ...payload }).unwrap();
      } else {
        await createSite(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const columns = [
    { key: 'siteName', label: 'Site Name' },
    { key: 'siteAddress', label: 'Location' },
    { key: 'siteEngineer', label: 'Engineer' },
    { key: 'contactNumber', label: 'Contact' },
    { key: 'siteArea', label: 'Wall Length', render: (val) => `${val} meters` },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'dates',
      label: 'Dates (Start / End)',
      render: (_, row) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'} /{' '}
          {row.endDate ? new Date(row.endDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: '🏠 Site Dashboard', onClick: () => navigate(`/sites/${row._id}`), type: 'info' },
            { label: '📊 Calc Requirements', onClick: () => navigate(`/sites/${row._id}/requirement-calculator`), type: 'primary' },
            { label: '💸 View P&L / Costing', onClick: () => navigate(`/costing/${row._id}`), type: 'success' },
            { divider: true },
            { label: 'Edit Site', onClick: () => handleOpenEdit(row), type: 'primary' },
            { label: 'Next Status', onClick: () => handleStatusToggle(row), type: 'success' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteSite(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/projects')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Projects
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Project Sites List
          </h1>
          {project && (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
              Project: <strong>{project.projectName}</strong> | Client: <strong>{project.customerId?.customerName}</strong>
            </p>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sites}
        isLoading={isLoading}
        limit={100}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        total={sites.length}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Project Site
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedSite ? 'Edit Project Site' : 'Add Project Site'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Site Name</label>
          <input
            type="text"
            className="field-input"
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            placeholder="e.g. Phase 1 Laying Area"
          />
          {validationErrors.siteName && <span className="field-error">{validationErrors.siteName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Site Engineer</label>
            <input
              type="text"
              className="field-input"
              value={form.siteEngineer}
              onChange={(e) => setForm({ ...form, siteEngineer: e.target.value })}
              placeholder="e.g. Ramesh K."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Contact Number</label>
            <input
              type="text"
              className="field-input"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              placeholder="Engineer mobile"
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
          <div className="field-group">
            <label className="field-label">Target End Date</label>
            <input
              type="date"
              className="field-input"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Wall Linear Length (Meters)</label>
            <input
              type="number"
              className="field-input"
              value={form.siteArea}
              onChange={(e) => setForm({ ...form, siteArea: Number(e.target.value) })}
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                disabled={!!selectedSite}
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

        <div className="field-group">
          <label className="field-label">Site Address / Landmark</label>
          <textarea
            className="field-textarea"
            value={form.siteAddress}
            onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
            placeholder="Complete site coordinates/location details..."
            rows={3}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Project Site"
        message="Are you sure you want to delete this project site? This action is permanent and all associated requirement calculations will be deleted."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default ProjectSitesPage;
