import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useUpdateBranchStatusMutation,
  useUpdateBranchSubscriptionMutation,
  useDeleteBranchMutation,
} from '../../store/api/branchApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import AvatarInitials from '../../components/ui/AvatarInitials';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const BranchesPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const { data, isLoading } = useGetBranchesQuery({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });

  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [updateBranchStatus] = useUpdateBranchStatusMutation();
  const [updateBranchSubscription] = useUpdateBranchSubscriptionMutation();
  const [deleteBranch] = useDeleteBranchMutation();
  const [showBranchPassword, setShowBranchPassword] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Subscription drawer
  const [subDrawerOpen, setSubDrawerOpen] = useState(false);
  const [subBranch, setSubBranch] = useState(null);
  const [subForm, setSubForm] = useState({ plan: 'trial', status: 'active', startDate: '', expiryDate: '', maxUsers: 5 });
  const [subErrors, setSubErrors] = useState({});

  const handleOpenSubscription = (branch) => {
    setSubBranch(branch);
    setSubForm({
      plan:       branch.subscription?.plan       || 'trial',
      status:     branch.subscription?.status     || 'active',
      startDate:  branch.subscription?.startDate  ? branch.subscription.startDate.split('T')[0] : '',
      expiryDate: branch.subscription?.expiryDate ? branch.subscription.expiryDate.split('T')[0] : '',
      maxUsers:   branch.subscription?.maxUsers   ?? 5,
    });
    setSubErrors({});
    setSubDrawerOpen(true);
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();
    setSubErrors({});
    try {
      await updateBranchSubscription({
        id:         subBranch._id,
        plan:       subForm.plan,
        status:     subForm.status,
        startDate:  subForm.startDate || undefined,
        expiryDate: subForm.expiryDate || undefined,
        maxUsers:   Number(subForm.maxUsers),
      }).unwrap();
      setSubDrawerOpen(false);
    } catch (err) {
      setSubErrors({ general: err?.data?.message || 'Failed to update subscription.' });
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null); // null means "Add" mode
  const [form, setForm] = useState({
    branchName: '',
    branchCode: '',
    address: '',
    contactPerson: '',
    mobileNumber: '',
    gstNumber: '',
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleOpenAdd = () => {
    setSelectedBranch(null);
    setForm({
      branchName: '',
      branchCode: '',
      address: '',
      contactPerson: '',
      mobileNumber: '',
      gstNumber: '',
      email: '',
      password: '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setSelectedBranch(branch);
    setForm({
      branchName: branch.branchName || '',
      branchCode: branch.branchCode || '',
      address: branch.address || '',
      contactPerson: branch.contactPerson || '',
      mobileNumber: branch.mobileNumber || '',
      gstNumber: branch.gstNumber || '',
      email: branch.email || '',
      password: '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    try {
      await updateBranchStatus({ id: branch._id, status: newStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update branch status.');
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (validationErrors[e.target.name]) {
      setValidationErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    // Client side basic validation
    const errors = {};
    if (!form.branchName.trim()) errors.branchName = 'Branch name is required';

    if (!form.email.trim()) errors.email = 'Email is required';
    if (!selectedBranch && !form.password.trim()) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedBranch) {
        await updateBranch({ id: selectedBranch._id, ...form }).unwrap();
      } else {
        await createBranch(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      if (err?.data?.errors) {
        // Map backend validation array/object if present
        const backendErrors = {};
        err.data.errors.forEach((msg) => {
          if (msg.includes('branchName')) backendErrors.branchName = msg;
          else if (msg.includes('branchCode')) backendErrors.branchCode = msg;
          else if (msg.includes('email')) backendErrors.email = msg;
          else if (msg.includes('password')) backendErrors.password = msg;
          else backendErrors.general = msg;
        });
        setValidationErrors(backendErrors);
      } else {
        setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
      }
    }
  };

  const handleDeleteBranch = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteBranch(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete branch.');
    }
  };

  const columns = [
    { key: 'branchCode', label: 'Code', sortable: true },
    {
      key: 'branchName',
      label: 'Branch',
      sortable: true,
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AvatarInitials name={val || '?'} colorIndex={2} />
          <span>{val}</span>
        </div>
      ),
    },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'gstNumber', label: 'GSTIN' },
    {
      key: 'address',
      label: 'Address',
      render: (val) => (
        <span
          style={{
            display: 'inline-block',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={val || ''}
        >
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={val} />
          <button
            onClick={() => handleStatusToggle(row)}
            className="btn btn--secondary btn--sm"
          >
            Toggle
          </button>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Subscription', onClick: () => handleOpenSubscription(row), type: 'info' },
            { label: 'Edit Branch', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteBranch(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <DataTable
        title="Branches"
        columns={columns}
        data={data?.data?.branches || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Branch
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedBranch ? 'Edit Branch' : 'Add Branch'}
        footer={
          <>
            <button
              onClick={() => setDrawerOpen(false)}
              className="btn btn--secondary"
              disabled={isCreating || isUpdating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn--primary"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        {validationErrors.general && (
          <div className="field-error" style={{ marginBottom: '12px' }}>
            {validationErrors.general}
          </div>
        )}

        <div className="field-group">
          <label className="field-label field-label--required">Branch Name</label>
          <input
            name="branchName"
            type="text"
            className="field-input"
            value={form.branchName}
            onChange={handleChange}
            placeholder="e.g. Main Factory"
          />
          {validationErrors.branchName && (
            <span className="field-error">{validationErrors.branchName}</span>
          )}
        </div>



        <div className="field-group">
          <label className="field-label">Address</label>
          <textarea
            name="address"
            className="field-textarea"
            value={form.address}
            onChange={handleChange}
            placeholder="Complete branch address"
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Contact Person</label>
            <input
              name="contactPerson"
              type="text"
              className="field-input"
              value={form.contactPerson}
              onChange={handleChange}
              placeholder="Full name"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Mobile Number</label>
            <PhoneInput
              placeholder="Enter mobile number"
              value={form.mobileNumber}
              onChange={(val) => setForm({ ...form, mobileNumber: val || '' })}
              defaultCountry="IN"
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">GSTIN (GST Number)</label>
          <input
            name="gstNumber"
            type="text"
            className="field-input"
            value={form.gstNumber}
            onChange={handleChange}
            placeholder="15-digit GSTIN"
          />
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Email Address</label>
          <input
            name="email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={handleChange}
            placeholder="branch@organization.com"
          />
          {validationErrors.email && (
            <span className="field-error">{validationErrors.email}</span>
          )}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">
            Password {selectedBranch && '(Leave blank to keep current)'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              name="password"
              type={showBranchPassword ? 'text' : 'password'}
              className="field-input"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter secure password"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowBranchPassword(!showBranchPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showBranchPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
          {validationErrors.password && (
            <span className="field-error">{validationErrors.password}</span>
          )}
        </div>
      </FormDrawer>
      {/* Subscription Drawer */}
      {subBranch && (
        <FormDrawer
          open={subDrawerOpen}
          onClose={() => setSubDrawerOpen(false)}
          title={`Subscription — ${subBranch.branchName}`}
          footer={
            <>
              <button onClick={() => setSubDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
              <button onClick={handleSubscriptionSubmit} className="btn btn--primary">Save Subscription</button>
            </>
          }
        >
          {subErrors.general && <div className="field-error" style={{ marginBottom: 12 }}>{subErrors.general}</div>}

          <div className="field-group">
            <label className="field-label">Plan</label>
            <select className="field-select" value={subForm.plan} onChange={e => setSubForm({ ...subForm, plan: e.target.value })}>
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Subscription Status</label>
            <select className="field-select" value={subForm.status} onChange={e => setSubForm({ ...subForm, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">Start Date</label>
              <input type="date" className="field-input" value={subForm.startDate}
                onChange={e => setSubForm({ ...subForm, startDate: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label">Expiry Date</label>
              <input type="date" className="field-input" value={subForm.expiryDate}
                onChange={e => setSubForm({ ...subForm, expiryDate: e.target.value })} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Max Users</label>
            <input type="number" className="field-input" min="1" value={subForm.maxUsers}
              onChange={e => setSubForm({ ...subForm, maxUsers: e.target.value })} />
          </div>
        </FormDrawer>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? All associated data will be removed."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default BranchesPage;
