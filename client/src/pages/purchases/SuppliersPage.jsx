import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from '../../store/api/purchaseApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const SuppliersPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetSuppliersQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  // Mutations
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  const handleDeleteSupplier = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    try {
      await deleteSupplier(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete supplier.');
    }
  };

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [form, setForm] = useState({
    supplierName: '',
    contactPerson: '',
    mobileNumber: '',
    email: '',
    address: '',
    gstNumber: '',
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
    setSelectedSupplier(null);
    setForm({
      supplierName: '',
      contactPerson: '',
      mobileNumber: '',
      email: '',
      address: '',
      gstNumber: '',
      paymentTerms: '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setForm({
      supplierName: supplier.supplierName || '',
      contactPerson: supplier.contactPerson || '',
      mobileNumber: supplier.mobileNumber || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      paymentTerms: supplier.paymentTerms || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (supplier) => {
    const nextStatus = supplier.status === 'active' ? 'inactive' : 'active';
    try {
      await updateSupplier({ id: supplier._id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to toggle supplier status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.supplierName.trim()) errors.supplierName = 'Supplier name is required';
    if (!form.mobileNumber.trim()) errors.mobileNumber = 'Mobile number is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedSupplier) {
        await updateSupplier({ id: selectedSupplier._id, ...form }).unwrap();
      } else {
        await createSupplier(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const columns = [
    { key: 'supplierName', label: 'Supplier Name', sortable: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'gstNumber', label: 'GSTIN (GST Number)' },
    { key: 'paymentTerms', label: 'Payment Terms' },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={val} />
          <button
            onClick={() => handleStatusToggle(row)}
            className="btn btn--secondary btn--sm"
            style={{ padding: '2px 6px', fontSize: '10px' }}
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
            { label: 'Edit Supplier', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteSupplier(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Routing Tabs */}
      <div className="navigation-tabs">
        <NavLink
          end
          to="/purchases"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          📋 Purchase Orders
        </NavLink>
        <NavLink
          to="/purchases/suppliers"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          👥 Suppliers
        </NavLink>
      </div>

      <DataTable
        title="Suppliers directory"
        columns={columns}
        data={data?.data?.suppliers || []}
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
            + Add Supplier
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Supplier Name</label>
          <input
            type="text"
            className="field-input"
            value={form.supplierName}
            onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            placeholder="e.g. Quality Concrete Aggregate Suppliers"
          />
          {validationErrors.supplierName && <span className="field-error">{validationErrors.supplierName}</span>}
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Email Address</label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="billing@supplier.com"
            />
          </div>
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
        </div>

        <div className="field-group">
          <label className="field-label">Payment Terms</label>
          <input
            type="text"
            className="field-input"
            value={form.paymentTerms}
            onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            placeholder="e.g. 15 Days Net, Cash On Delivery"
          />
        </div>

        <div className="field-group">
          <label className="field-label">Office Address</label>
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
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action is permanent and cannot be undone if they are not referenced in existing orders."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default SuppliersPage;
