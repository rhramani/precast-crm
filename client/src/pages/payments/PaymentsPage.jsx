import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetPaymentsQuery,
  useCreatePaymentMutation,
} from '../../store/api/paymentApi';
import { useGetCustomersQuery } from '../../store/api/customerApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';

const PaymentsPage = () => {
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetPaymentsQuery({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });

  const { data: customersRes } = useGetCustomersQuery({ limit: 100 });
  const customers = customersRes?.data?.customers || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createPayment] = useCreatePaymentMutation();

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    paymentNumber: '',
    paymentDate: '',
    referenceNumber: '',
    remarks: '',
    branchId: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Active customer outstanding details
  const [outstandingInfo, setOutstandingInfo] = useState(null);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Fetch live outstanding details for selected customer
  const handleCustomerChange = async (customerId) => {
    setForm((prev) => ({ ...prev, customerId }));
    if (!customerId) {
      setOutstandingInfo(null);
      return;
    }
    try {
      const response = await fetch(`/api/v1/customers/${customerId}/outstanding`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const resData = await response.json();
      if (resData.success) {
        setOutstandingInfo(resData.data);
      }
    } catch (e) {
      setOutstandingInfo(null);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      customerId: '',
      amount: '',
      paymentMethod: 'bank_transfer',
      paymentNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setOutstandingInfo(null);
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.customerId) errors.customerId = 'Customer is required';
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await createPayment(form).unwrap();
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Payment registry failed.' });
    }
  };

  const columns = [
    { key: 'paymentNumber', label: 'Voucher Number', sortable: true },
    {
      key: 'customerId',
      label: 'Customer Client',
      render: (val) => (
        <span>
          <strong>{val?.customerName}</strong>
          {val?.companyName && <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-secondary)' }}>{val.companyName}</span>}
        </span>
      ),
    },
    { key: 'amount', label: 'Payment Amount', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'paymentMethod', label: 'Payment Mode', render: (val) => val.replace('_', ' ').toUpperCase() },
    { key: 'referenceNumber', label: 'Ref/Transaction No.' },
    {
      key: 'paymentDate',
      label: 'Payment Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    { key: 'remarks', label: 'Voucher Remarks' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Client Payments"
        columns={columns}
        data={data?.data?.payments || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        exportable={true}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Log Payment Receipt
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Payment Receipt"
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Select Customer</label>
          <select
            className="field-select"
            value={form.customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
          >
            <option value="">Choose customer...</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>{c.customerName}</option>
            ))}
          </select>
          {validationErrors.customerId && <span className="field-error">{validationErrors.customerId}</span>}
        </div>

        {/* Live Outstanding Info banner */}
        {outstandingInfo && (
          <div
            style={{
              background: 'var(--color-background)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              borderLeft: '4px solid var(--color-accent)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Outstanding Balance: <strong style={{ color: 'var(--color-danger)' }}>₹{outstandingInfo.outstandingAmount?.toLocaleString()}</strong><br />
            Allowed Credit Limit: <strong>₹{outstandingInfo.creditLimit?.toLocaleString()}</strong>
          </div>
        )}

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Payment Amount (₹)</label>
            <input
              type="number"
              className="field-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 50000"
            />
            {validationErrors.amount && <span className="field-error">{validationErrors.amount}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Payment Date</label>
            <input
              type="date"
              className="field-input"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Payment Mode</label>
            <select
              className="field-select"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/UPI)</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Reference Number (UPI/Bank/Cheque)</label>
            <input
              type="text"
              className="field-input"
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              placeholder="Transaction ID"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Voucher Number (Optional)</label>
            <input
              type="text"
              className="field-input"
              value={form.paymentNumber}
              onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
              placeholder="Auto-generated if blank"
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
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
          <label className="field-label">Remarks / Description</label>
          <textarea
            className="field-textarea"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="Add payment notes..."
            rows={3}
          />
        </div>
      </FormDrawer>
    </div>
  );
};

export default PaymentsPage;
