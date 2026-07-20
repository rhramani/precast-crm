import { useState } from 'react';
import {
  useGetLabourersQuery,
  useCreateLabourMutation,
  useUpdateLabourMutation,
  useDeleteLabourMutation,
} from '../../store/api/labourApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import { restrictPhoneNumber } from '../../utils/phoneUtils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const LabourPage = () => {
  // Labour list states (for Directory tab)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [filterSites, setFilterSites] = useState([]);

  // Queries for Directory tab
  const { data, isLoading } = useGetLabourersQuery({
    page,
    limit,
    search,
    projectId: projectFilter,
    siteId: siteFilter
  });
  const labourers = data?.data?.labourers || [];

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const [createLabour] = useCreateLabourMutation();
  const [updateLabour] = useUpdateLabourMutation();
  const [deleteLabour] = useDeleteLabourMutation();

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  const handleDeleteLabour = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    try {
      await deleteLabour(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete labour.');
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [form, setForm] = useState({
    labourName: '',
    mobileNumber: '',
    labourType: 'helper',
    dailyWages: 11,
    projectId: '',
    siteId: '',
  });
  const [projectSites, setProjectSites] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [labourMobileCountry, setLabourMobileCountry] = useState('IN');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  const handleProjectFilterChange = async (projId) => {
    setProjectFilter(projId);
    setSiteFilter('');
    setPage(1);
    if (!projId) {
      setFilterSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const resData = await response.json();
        setFilterSites(resData.data.sites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProjectChange = async (projId) => {
    setForm((prev) => ({ ...prev, projectId: projId, siteId: '' }));
    if (!projId) {
      setProjectSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const resData = await response.json();
        setProjectSites(resData.data.sites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setSelectedLabour(null);
    setForm({
      labourName: '',
      mobileNumber: '',
      labourType: 'helper',
      dailyWages: 11,
      projectId: '',
      siteId: '',
    });
    setProjectSites([]);
    setLabourMobileCountry('IN');
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (labour) => {
    setSelectedLabour(labour);
    setForm({
      labourName: labour.labourName || '',
      mobileNumber: labour.mobileNumber || '',
      labourType: labour.labourType || 'helper',
      dailyWages: labour.dailyWages || 11,
      projectId: labour.projectId?._id || labour.projectId || '',
      siteId: labour.siteId?._id || labour.siteId || '',
    });
    setValidationErrors({});

    const projId = labour.projectId?._id || labour.projectId;
    if (projId) {
      try {
        const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (response.ok) {
          const resData = await response.json();
          setProjectSites(resData.data.sites || []);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setProjectSites([]);
    }
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (labour) => {
    const nextStatus = labour.status === 'active' ? 'inactive' : 'active';
    try {
      await updateLabour({ id: labour._id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.labourName.trim())   errors.labourName = 'Labour name is required';
    if (!form.mobileNumber || !form.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!isValidPhoneNumber(form.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid mobile number for the selected country';
    }
    if (form.dailyWages < 0)       errors.dailyWages = 'Wage rate must be >= 0';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedLabour) {
        await updateLabour({ id: selectedLabour._id, ...form }).unwrap();
      } else {
        await createLabour(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const columns = [
    { key: 'labourName', label: 'Labour Name', sortable: true },
    { key: 'labourType', label: 'Crew Type', render: (val) => val.toUpperCase().replace('_', ' ') },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'projectId', label: 'Assigned Project', render: (val) => val?.projectName || '—' },
    { key: 'siteId', label: 'Assigned Site', render: (val) => val?.siteName || '—' },
    { key: 'dailyWages', label: 'Daily Wage Rate (₹)', render: (val) => `₹${val}/SQFT` },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={val} />
          <button onClick={() => handleStatusToggle(row)} className="btn btn--secondary btn--sm" style={{ padding: '2px 6px', fontSize: '10px' }}>Toggle</button>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Edit Labour', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteLabour(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  const wageOptions = [11, 12, 13, 14, 15];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Filter Bar ── */}
      <div className="glass-card" style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '20px',
        borderLeft: '4px solid var(--color-primary)'
      }}>
        <div className="field-group" style={{ flex: '1 1 200px', margin: 0 }}>
          <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Filter by Project</label>
          <select
            className="field-select"
            value={projectFilter}
            onChange={(e) => handleProjectFilterChange(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.projectName}</option>
            ))}
          </select>
        </div>

        <div className="field-group" style={{ flex: '1 1 200px', margin: 0 }}>
          <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Filter by Site</label>
          <select
            className="field-select"
            value={siteFilter}
            disabled={!projectFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Sites</option>
            {filterSites.map((s) => (
              <option key={s._id} value={s._id}>{s.siteName}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        title="Labour Profiles Directory"
        columns={columns}
        data={labourers}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={setSearch}
        isLoading={isLoading}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary" style={{ borderRadius: '24px', padding: '8px 20px' }}>
            + Add Labour Profile
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedLabour ? 'Edit Labour Profile' : 'Add Labour Profile'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Labour Name</label>
          <input
            type="text"
            className="field-input"
            value={form.labourName}
            onChange={(e) => setForm({ ...form, labourName: e.target.value })}
            placeholder="e.g. Ramesh Pujari"
          />
          {validationErrors.labourName && <span className="field-error">{validationErrors.labourName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Mobile Number</label>
            <PhoneInput
              placeholder="Enter mobile number"
              value={form.mobileNumber}
              onChange={(val) => setForm({ ...form, mobileNumber: restrictPhoneNumber(val || '', labourMobileCountry) })}
              onCountryChange={setLabourMobileCountry}
              defaultCountry="IN"
              international
              limitMaxLength
            />
            {validationErrors.mobileNumber && <span className="field-error">{validationErrors.mobileNumber}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Crew Type</label>
            <select
              className="field-select"
              value={form.labourType}
              onChange={(e) => setForm({ ...form, labourType: e.target.value })}
            >
              <option value="mason">Mason</option>
              <option value="bar_bender">Bar Bender</option>
              <option value="carpenter">Carpenter</option>
              <option value="helper">Helper</option>
              <option value="operator">Operator</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Daily Wage Rate (₹)</label>
            <select
              className="field-select"
              value={form.dailyWages}
              onChange={(e) => setForm({ ...form, dailyWages: Number(e.target.value) })}
            >
              {wageOptions.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}
                </option>
              ))}
              {form.dailyWages && !wageOptions.includes(Number(form.dailyWages)) && (
                <option value={form.dailyWages}>{form.dailyWages}</option>
              )}
            </select>
            {validationErrors.dailyWages && <span className="field-error">{validationErrors.dailyWages}</span>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary-dark)', margin: '0 0 16px 0' }}>
            Site Allocation (Optional)
          </p>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">Assign to Project</label>
              <select
                className="field-select"
                value={form.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Assign to Site</label>
              <select
                className="field-select"
                value={form.siteId}
                disabled={!form.projectId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {projectSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.siteName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Labour Profile"
        message="Are you sure you want to delete this labourer?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default LabourPage;
