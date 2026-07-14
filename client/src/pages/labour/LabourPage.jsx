import { useState } from 'react';
import {
  useGetLabourersQuery,
  useCreateLabourMutation,
  useUpdateLabourMutation,
  useDeleteLabourMutation,
} from '../../store/api/labourApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const LabourPage = () => {
  // Labour list states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetLabourersQuery({ page, limit, search });
  const labourers = data?.data?.labourers || [];

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
    dailyWages: 0,
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleOpenAdd = () => {
    setSelectedLabour(null);
    setForm({
      labourName: '',
      mobileNumber: '',
      labourType: 'helper',
      dailyWages: 0,
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (labour) => {
    setSelectedLabour(labour);
    setForm({
      labourName: labour.labourName || '',
      mobileNumber: labour.mobileNumber || '',
      labourType: labour.labourType || 'helper',
      dailyWages: labour.dailyWages || 0,
    });
    setValidationErrors({});
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
    if (!form.mobileNumber.trim()) errors.mobileNumber = 'Mobile number is required';
    if (form.dailyWages < 0)       errors.dailyWages = 'Daily wage rate must be >= 0';

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
    { key: 'dailyWages', label: 'Daily Wage Rate', render: (val) => `₹${val}/day` },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
          <button onClick={handleOpenAdd} className="btn btn--primary">
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
              onChange={(val) => setForm({ ...form, mobileNumber: val || '' })}
              defaultCountry="IN"
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

        <div className="field-group">
          <label className="field-label field-label--required">Daily Wage Rate</label>
          <input
            type="number"
            className="field-input"
            value={form.dailyWages}
            onChange={(e) => setForm({ ...form, dailyWages: Number(e.target.value) })}
          />
          {validationErrors.dailyWages && <span className="field-error">{validationErrors.dailyWages}</span>}
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Labour Profile"
        message="Are you sure you want to delete this labourer? All daily attendance records for this labourer will be lost."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default LabourPage;
