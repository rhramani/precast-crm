import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetDistanceQuery,
} from '../../store/api/customerApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import AvatarInitials from '../../components/ui/AvatarInitials';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import { restrictPhoneNumber } from '../../utils/phoneUtils';

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
    mobile: '',
    email: '',
    gstNumber: '',
    dob: '',
    personalAddress: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [customerCountry, setCustomerCountry] = useState('IN');

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
      mobile: '',
      email: '',
      gstNumber: '',
      dob: '',
      personalAddress: '',
    });
    setCustomerCountry('IN');
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setForm({
      customerName: customer.customerName || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      gstNumber: customer.gstNumber || '',
      dob: customer.dob ? new Date(customer.dob).toISOString().split('T')[0] : '',
      personalAddress: customer.personalAddress || '',
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
    if (!form.mobile || !form.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!isValidPhoneNumber(form.mobile)) {
      errors.mobile = 'Please enter a valid mobile number for the selected country';
    }
    if (form.gstNumber && form.gstNumber.trim().length !== 15) {
      errors.gstNumber = 'GSTIN must be exactly 15 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = {
      ...form,
      dob: form.dob || null,
    };

    try {
      if (selectedCustomer) {
        await updateCustomer({ id: selectedCustomer._id, ...payload }).unwrap();
      } else {
        await createCustomer(payload).unwrap();
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
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AvatarInitials name={val || '?'} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{val}</span>
            {row.hasPendingPayment && (
              <span className="badge badge--danger" style={{ fontSize: '10px', marginTop: '2px', display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                ⚠️ Pending: ₹{row.outstandingAmount?.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'gstNumber', label: 'GSTIN' },
    {
      key: 'dob',
      label: 'DOB',
      render: (val) => val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
    },


    {
      key: 'totalInvoiced',
      label: 'Total Billed',
      render: (val) => (
        <span style={{ fontWeight: '600' }}>
          ₹{(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'outstandingAmount',
      label: 'Pending Payment',
      render: (val) => (
        <strong style={{ color: val > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
          ₹{(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </strong>
      )
    },
    {
      key: 'personalAddress',
      label: 'Personal Address',
      render: (val) => val ? (
        <span title={val} style={{ cursor: 'help' }}>
          {val.length > 30 ? val.substring(0, 30) + '...' : val}
        </span>
      ) : '—'
    },
    {
      key: 'siteAddress',
      label: 'Site Address(es)',
      render: (_, row) => {
        if (row.sitesList && row.sitesList.length > 0) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', whiteSpace: 'normal', minWidth: '185px' }}>
              {row.sitesList.map((site, index) => (
                <div key={site._id || index} style={{ borderBottom: index < row.sitesList.length - 1 ? '1px dashed var(--color-border)' : 'none', paddingBottom: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <span>{index + 1}. {site.siteAddress || '—'}</span>
                  <SiteDistance site={site} />
                </div>
              ))}
            </div>
          );
        }
        return '—';
      }
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
        getRowClassName={(row) => row.hasPendingPayment ? 'data-table__row--alert' : ''}
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
            <label className="field-label field-label--required">Mobile Number</label>
            <PhoneInput
              placeholder="Enter mobile number"
              value={form.mobile}
              onChange={(val) => setForm({ ...form, mobile: restrictPhoneNumber(val || '', customerCountry) })}
              onCountryChange={setCustomerCountry}
              defaultCountry="IN"
              international
              limitMaxLength
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

        <div className="field-group">
          <label className="field-label">GSTIN (GST Number)</label>
          <input
            type="text"
            className="field-input"
            value={form.gstNumber}
            onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase().replace(/\s/g, '') })}
            placeholder="15-digit GSTIN"
            maxLength={15}
          />
          {validationErrors.gstNumber && <span className="field-error">{validationErrors.gstNumber}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Date of Birth</label>
          <input
            type="date"
            className="field-input"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />
        </div>



        <div className="field-group">
          <label className="field-label">Personal Address</label>
          <textarea
            className="field-textarea"
            value={form.personalAddress}
            onChange={(e) => setForm({ ...form, personalAddress: e.target.value })}
            placeholder="Personal home/office address"
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

const DistanceBadge = ({ origin, destination }) => {
  const { data, isLoading, error } = useGetDistanceQuery({ origin, destination });

  if (isLoading) {
    return <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px', fontSize: '10px' }}>(loading...)</span>;
  }

  if (error || !data || !data.success || data.data.distanceKm === null) {
    return null;
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

  return (
    <a 
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="badge" 
      style={{ 
        marginLeft: '4px', 
        fontSize: '10px', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '2px',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: '#2563eb',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        textDecoration: 'none',
        cursor: 'pointer'
      }}
      title={`Click to open Google Maps directions from branch address: ${origin}`}
    >
      📍 {data.data.distanceKm} km
    </a>
  );
};

const SiteDistance = ({ site }) => {
  const origin = site.branchId?.address;
  const destination = site.siteAddress;

  if (!origin || !destination) {
    return null;
  }

  return <DistanceBadge origin={origin} destination={destination} />;
};

export default CustomersPage;
