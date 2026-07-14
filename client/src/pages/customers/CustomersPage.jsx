import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from '../../store/api/customerApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import AvatarInitials from '../../components/ui/AvatarInitials';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const CustomersPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetCustomersQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  // Mutations
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState({
    customerName: '',
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstNumber: '',
    address: '',
    creditLimit: 0,
    paymentTerms: '',
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
    setSelectedCustomer(null);
    setForm({
      customerName: '',
      companyName: '',
      contactPerson: '',
      mobile: '',
      email: '',
      gstNumber: '',
      address: '',
      creditLimit: 0,
      paymentTerms: '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setForm({
      customerName: customer.customerName || '',
      companyName: customer.companyName || '',
      contactPerson: customer.contactPerson || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      gstNumber: customer.gstNumber || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit || 0,
      paymentTerms: customer.paymentTerms || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (customer) => {
    const nextStatus = customer.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCustomer({ id: customer._id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update customer status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.customerName.trim()) errors.customerName = 'Customer name is required';
    if (!form.mobile.trim())       errors.mobile = 'Mobile number is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedCustomer) {
        await updateCustomer({ id: selectedCustomer._id, ...form }).unwrap();
      } else {
        await createCustomer(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const navigate = useNavigate();

  const handleDeleteCustomer = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteCustomer(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete customer.');
    }
  };

  const columns = [
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AvatarInitials name={val || '?'} />
          <span>{val}</span>
        </div>
      ),
    },
    { key: 'companyName', label: 'Company', sortable: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'gstNumber', label: 'GSTIN' },
    { key: 'creditLimit', label: 'Credit Limit', render: (val) => `₹${val?.toLocaleString() ?? 0}` },
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
            { label: 'View Details', onClick: () => navigate(`/customers/${row._id}`), type: 'info' },
            { label: 'Edit Customer', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteCustomer(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Customer Directory"
        columns={columns}
        data={data?.data?.customers || []}
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Customer
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Customer Name</label>
          <input
            type="text"
            className="field-input"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="e.g. Rajesh Patil"
          />
          {validationErrors.customerName && <span className="field-error">{validationErrors.customerName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Company Name</label>
            <input
              type="text"
              className="field-input"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="e.g. Patil Infra Corp"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Contact Person</label>
            <input
              type="text"
              className="field-input"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="Full name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Mobile Number</label>
            <PhoneInput
              placeholder="Enter mobile number"
              value={form.mobile}
              onChange={(val) => setForm({ ...form, mobile: val || '' })}
              defaultCountry="IN"
            />
            {validationErrors.mobile && <span className="field-error">{validationErrors.mobile}</span>}
          </div>
          <div className="field-group">
            <label className="field-label">Email Address</label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="client@company.com"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">GSTIN (GST Number)</label>
            <input
              type="text"
              className="field-input"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              placeholder="15-digit GSTIN"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Credit Limit (₹)</label>
            <input
              type="number"
              className="field-input"
              value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Payment Terms</label>
          <input
            type="text"
            className="field-input"
            value={form.paymentTerms}
            onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            placeholder="e.g. 30 Days Net, 50% Advance"
          />
        </div>

        <div className="field-group">
          <label className="field-label">Billing Address</label>
          <textarea
            className="field-textarea"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Full business office address"
            rows={3}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? All outstanding invoices and quotation histories will be deleted."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default CustomersPage;
