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
import { useGetWallTemplatesQuery } from '../../store/api/wallTemplateApi';
import DataTable from '../../components/ui/DataTable';
import { Home, Layers, DollarSign } from 'lucide-react';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const ProjectSitesPage = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  // Queries
  const { data: projectRes } = useGetProjectQuery(projectId);
  const { data: sitesRes, isLoading } = useGetProjectSitesQuery(projectId);
  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const { data: templatesRes } = useGetWallTemplatesQuery({});
  
  const project = projectRes?.data?.project;
  const sites = sitesRes?.data?.sites || [];
  const branches = branchData?.data?.branches || [];
  const templatesList = templatesRes?.data?.templates || [];

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
    wallTemplateId: '',
    transportRatePerTrip: 0,
    labourRatePerManDay: 0,
    panelSellingPrice: 0,
    poleSellingPrice: 0,
    beamSellingPrice: 0,
    topBeamSellingPrice: 0,
    cementRate: 0,
    steelRate: 0,
    aggregateRate: 0,
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
      wallTemplateId: '',
      transportRatePerTrip: 0,
      labourRatePerManDay: 0,
      panelSellingPrice: 0,
      poleSellingPrice: 0,
      beamSellingPrice: 0,
      topBeamSellingPrice: 0,
      cementRate: 0,
      steelRate: 0,
      aggregateRate: 0,
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
      wallTemplateId: site.wallTemplateId?._id || site.wallTemplateId || '',
      transportRatePerTrip: site.transportRatePerTrip ?? 0,
      labourRatePerManDay: site.labourRatePerManDay ?? 0,
      panelSellingPrice: site.panelSellingPrice ?? 0,
      poleSellingPrice: site.poleSellingPrice ?? 0,
      beamSellingPrice: site.beamSellingPrice ?? 0,
      topBeamSellingPrice: site.topBeamSellingPrice ?? 0,
      cementRate: site.cementRate ?? 0,
      steelRate: site.steelRate ?? 0,
      aggregateRate: site.aggregateRate ?? 0,
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
        wallTemplateId: form.wallTemplateId || undefined,
        transportRatePerTrip: Number(form.transportRatePerTrip ?? 3500),
        labourRatePerManDay: Number(form.labourRatePerManDay ?? 800),
        panelSellingPrice: Number(form.panelSellingPrice || 0),
        poleSellingPrice: Number(form.poleSellingPrice || 0),
        beamSellingPrice: Number(form.beamSellingPrice || 0),
        topBeamSellingPrice: Number(form.topBeamSellingPrice || 0),
        cementRate: Number(form.cementRate || 0),
        steelRate: Number(form.steelRate || 0),
        aggregateRate: Number(form.aggregateRate || 0),
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
    { key: 'wallTemplateId', label: 'Wall Template', render: (val) => val?.name || '—' },
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
            { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Home size={14} /> Site Dashboard</span>, onClick: () => navigate(`/sites/${row._id}`), type: 'info' },
            { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Layers size={14} /> Calc Requirements</span>, onClick: () => navigate(`/sites/${row._id}/requirement-calculator`), type: 'primary' },
            { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14} /> View P&L / Costing</span>, onClick: () => navigate(`/costing/${row._id}`), type: 'success' },
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
            <PhoneInput
              placeholder="Engineer mobile"
              value={form.contactNumber}
              onChange={(val) => setForm({ ...form, contactNumber: val || '' })}
              defaultCountry="IN"
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
          <label className="field-label">Wall Template Category</label>
          <select
            className="field-select"
            value={form.wallTemplateId}
            onChange={(e) => setForm({ ...form, wallTemplateId: e.target.value })}
          >
            <option value="">Select Template...</option>
            {templatesList.map((t) => (
              <option key={t._id} value={t._id}>{t.name} ({t.category.replace('_', ' ')})</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Logistics Transport Rate (Per Trip)</label>
            <input
              type="number"
              className="field-input"
              value={form.transportRatePerTrip}
              onChange={(e) => setForm({ ...form, transportRatePerTrip: Number(e.target.value) })}
              placeholder="Leave 0 for default (₹3,500)"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Est. Labour Rate (Per Man-Day)</label>
            <input
              type="number"
              className="field-input"
              value={form.labourRatePerManDay}
              onChange={(e) => setForm({ ...form, labourRatePerManDay: Number(e.target.value) })}
              placeholder="Leave 0 for default (₹800)"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--color-primary-dark)', fontWeight: 700 }}>
            Site-Specific Pricing & Rates Override (Optional)
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            Leave fields at 0 to use standard prices/rates from Product Master and Raw Material Master.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Panel Price (per pc)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.panelSellingPrice}
                  onChange={(e) => setForm({ ...form, panelSellingPrice: Number(e.target.value) })}
                  placeholder="e.g. 700"
                />
              </div>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Pole Price (per pc)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.poleSellingPrice}
                  onChange={(e) => setForm({ ...form, poleSellingPrice: Number(e.target.value) })}
                  placeholder="e.g. 1400"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Beam Price (per pc)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.beamSellingPrice}
                  onChange={(e) => setForm({ ...form, beamSellingPrice: Number(e.target.value) })}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Top Beam Price (per pc)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.topBeamSellingPrice}
                  onChange={(e) => setForm({ ...form, topBeamSellingPrice: Number(e.target.value) })}
                  placeholder="e.g. 450"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Cement Rate (per kg)</label>
                <input
                  type="number"
                  className="field-input"
                  step="0.01"
                  value={form.cementRate}
                  onChange={(e) => setForm({ ...form, cementRate: Number(e.target.value) })}
                  placeholder="e.g. 8.5"
                />
              </div>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Steel Rate (per kg)</label>
                <input
                  type="number"
                  className="field-input"
                  step="0.01"
                  value={form.steelRate}
                  onChange={(e) => setForm({ ...form, steelRate: Number(e.target.value) })}
                  placeholder="e.g. 64"
                />
              </div>
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">Aggregate (per brass)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.aggregateRate}
                  onChange={(e) => setForm({ ...form, aggregateRate: Number(e.target.value) })}
                  placeholder="e.g. 4800"
                />
              </div>
            </div>
          </div>
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
