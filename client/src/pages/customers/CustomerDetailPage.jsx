import { useState } from 'react';
import { Edit2, ClipboardList, Receipt, DollarSign, CheckCircle, AlertTriangle, History } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import {
  useGetCustomerQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerOutstandingQuery,
  useUpdateCustomerMutation,
} from '../../store/api/customerApi';
import { useCreatePaymentMutation, useGetPaymentsQuery } from '../../store/api/paymentApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import './CustomerDetail.css';
import { restrictPhoneNumber } from '../../utils/phoneUtils';

/* ── Avatar helper ───────────────────────────────────────── */
const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

/* ── Stat Card ───────────────────────────────────────────── */
const StatCard = ({ label, value, valueClass, sub }) => (
  <div className="cd-stat-card">
    <span className="cd-stat-card__label">{label}</span>
    <span className={`cd-stat-card__value ${valueClass || ''}`}>{value}</span>
    {sub && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{sub}</span>}
  </div>
);

/* ── Info Item ───────────────────────────────────────────── */
const InfoItem = ({ label, value }) => (
  <div className="cd-info-item">
    <div className="cd-info-item__label">{label}</div>
    <div className={`cd-info-item__value ${!value ? 'cd-info-item__value--empty' : ''}`}>
      {value || '—'}
    </div>
  </div>
);

/* ── Main Component ──────────────────────────────────────── */
const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [customerCountry, setCustomerCountry] = useState('IN');

  /* ── Queries ─────────────────────────────────────────── */
  const { data: custRes, isLoading: custLoading, error: custError } = useGetCustomerQuery(id);
  const { data: ledgerRes, isLoading: ledgerLoading } = useGetCustomerLedgerQuery(id);
  const { data: outstandingRes, isLoading: outLoading } = useGetCustomerOutstandingQuery(id);
  const { data: projectsRes } = useGetProjectsQuery({ limit: 200 });

  const customer = custRes?.data?.customer;
  const ledger = ledgerRes?.data;
  const outstanding = outstandingRes?.data;
  const allProjects = projectsRes?.data?.projects || [];
  const customerProjects = allProjects.filter(
    (p) => (p.customerId?._id || p.customerId) === id
  );

  /* ── Mutations ───────────────────────────────────────── */
  const [updateCustomer] = useUpdateCustomerMutation();

  /* ── Redux auth state ── */
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  /* ── Log Payment states ── */
  const [createPayment] = useCreatePaymentMutation();
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    paymentNumber: '',
    paymentDate: '',
    referenceNumber: '',
    remarks: '',
    branchId: '',
  });
  const [paymentValidationErrors, setPaymentValidationErrors] = useState({});

  /* ── Extra queries ── */
  const { data: paymentsRes, isLoading: paymentsLoading } = useGetPaymentsQuery({ customerId: id });
  const payments = paymentsRes?.data?.payments || [];


  const handleOpenLogPayment = () => {
    setPaymentForm({
      amount: '',
      paymentMethod: 'bank_transfer',
      paymentNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setPaymentValidationErrors({});
    setPaymentDrawerOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentValidationErrors({});

    const errors = {};
    const amt = Number(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    if (userRole === 'super_admin' && !paymentForm.branchId) {
      errors.branchId = 'Branch assignment is required';
    }

    if (Object.keys(errors).length > 0) {
      setPaymentValidationErrors(errors);
      return;
    }

    try {
      await createPayment({
        customerId: id,
        ...paymentForm,
      }).unwrap();
      setPaymentDrawerOpen(false);
    } catch (err) {
      setPaymentValidationErrors({ general: err?.data?.message || 'Payment registry failed.' });
    }
  };

  /* ── Edit Drawer ─────────────────────────────────────── */
  const handleOpenEdit = () => {
    setForm({
      customerName: customer?.customerName || '',
      mobile: customer?.mobile || '',
      email: customer?.email || '',
      gstNumber: customer?.gstNumber || '',
      dob: customer?.dob ? new Date(customer.dob).toISOString().split('T')[0] : '',
      personalAddress: customer?.personalAddress || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};
    if (!form.customerName?.trim()) errors.customerName = 'Customer name is required';
    if (!form.mobile || !form.mobile.trim()) {
      errors.mobile = 'Mobile is required';
    } else if (!isValidPhoneNumber(form.mobile)) {
      errors.mobile = 'Please enter a valid mobile number for the selected country';
    }
    if (form.gstNumber && form.gstNumber.trim().length !== 15) {
      errors.gstNumber = 'GSTIN must be exactly 15 characters';
    }
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    const payload = {
      ...form,
      dob: form.dob || null,
    };

    try {
      await updateCustomer({ id, ...payload }).unwrap();
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save failed.' });
    }
  };

  /* ── Loading / Error states ──────────────────────────── */
  if (custLoading) {
    return <div className="cd-loading">Loading customer profile…</div>;
  }
  if (custError || !customer) {
    return (
      <div className="cd-loading" style={{ flexDirection: 'column', gap: 12 }}>
        <span style={{ color: 'var(--color-danger)' }}>⚠️ Customer not found.</span>
        <button onClick={() => navigate('/customers')} className="btn btn--secondary">← Back to Customers</button>
      </div>
    );
  }

  /* ── Outstanding stats ───────────────────────────────── */
  const outstandingAmt = outstanding?.outstandingAmount ?? 0;
  const creditLimit = customer.creditLimit || 0;
  const creditUsed = outstanding?.creditUsedPercent ?? 0;
  const totalInvoiced = outstanding?.totalInvoiced ?? 0;
  const projectCount = outstanding?.projectCount ?? customerProjects.length;

  const creditBarClass =
    creditUsed >= 90 ? 'cd-credit-bar__fill--danger' :
    creditUsed >= 70 ? 'cd-credit-bar__fill--warning' : '';

  return (
    <div className="cd-page">
      {/* ── Back Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="cd-header__back" onClick={() => navigate('/customers')}>
          ← Back to Customers
        </button>
      </div>

      {/* ── Profile Header Card ── */}
      <div className="cd-header-card">
        <div className="cd-header__identity">
          <div className="cd-avatar-ring">
            <div className="cd-avatar">{getInitials(customer.customerName)}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 className="cd-header__name">{customer.customerName}</h1>
              <StatusBadge status={customer.status} />
            </div>
            <p className="cd-header__company">
              {customer.mobile} {customer.email ? `· ${customer.email}` : ''}
            </p>
          </div>
        </div>
        <div className="cd-header__actions">
          <button className="btn btn--white" onClick={handleOpenEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 size={14} />
            Edit Profile
          </button>
          <button className="btn btn--glass" onClick={handleOpenLogPayment} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={14} />
            Log Payment
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="cd-stats">
        <div className="cd-stat-card cd-stat-card--info">
          <span className="cd-stat-card__label">Total Payment to Receive</span>
          <span className="cd-stat-card__value" style={{ color: 'var(--color-info)' }}>
            {`₹${totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {`${ledger?.transactions?.length ?? 0} invoice(s)`}
          </span>
        </div>

        <div className="cd-stat-card cd-stat-card--success">
          <span className="cd-stat-card__label">Total Payment Received</span>
          <span className="cd-stat-card__value cd-stat-card__value--success">
            {`₹${(outstanding?.totalPaid ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            Received so far
          </span>
        </div>

        <div className={`cd-stat-card ${outstandingAmt > 0 ? 'cd-stat-card--danger' : 'cd-stat-card--success'}`}>
          <span className="cd-stat-card__label">Pending Payment</span>
          <span className={`cd-stat-card__value ${outstandingAmt > 0 ? 'cd-stat-card__value--danger' : 'cd-stat-card__value--success'}`}>
            {`₹${outstandingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {outstandingAmt === 0 ? 'All clear' : 'Pending collection'}
          </span>
        </div>

        <div className="cd-stat-card cd-stat-card--warning">
          <span className="cd-stat-card__label">Active Projects</span>
          <span className="cd-stat-card__value" style={{ color: 'var(--color-warning)' }}>
            {projectCount}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            Linked to this customer
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="cd-tabs">
        {['overview', 'invoices', 'payments', 'outstanding'].map((tab) => (
          <button
            key={tab}
            className={`cd-tab ${activeTab === tab ? 'cd-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {tab === 'overview' && <><ClipboardList size={15} /> Overview</>}
            {tab === 'invoices' && <><Receipt size={15} /> Invoice Ledger</>}
            {tab === 'payments' && <><History size={15} /> Payment History</>}
            {tab === 'outstanding' && <><DollarSign size={15} /> Outstanding</>}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Contact info */}
          <div className="cd-panel">
            <h3 className="cd-panel__title">Contact Information</h3>
            <div className="cd-info-grid">
              <InfoItem label="Mobile" value={customer.mobile} />
              <InfoItem label="Email" value={customer.email} />
              <InfoItem label="GSTIN (GST Number)" value={customer.gstNumber} />
              <InfoItem label="Date of Birth" value={customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'} />
              <InfoItem label="Member Since" value={new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            </div>
            <div className="cd-address-container">
              <div className="cd-address-card">
                <div className="cd-address-card__title">Personal Address</div>
                <div className={`cd-address-card__content ${!customer.personalAddress ? 'cd-info-item__value--empty' : ''}`}>
                  {customer.personalAddress || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Projects */}
          <div className="cd-panel">
            <h3 className="cd-panel__title">Linked Projects ({customerProjects.length})</h3>
            {customerProjects.length === 0 ? (
              <div className="cd-empty">
                <div className="cd-empty__icon" style={{ opacity: 0.5 }}><ClipboardList size={40} /></div>
                <div className="cd-empty__text">No projects linked to this customer yet.</div>
              </div>
            ) : (
              <div className="cd-projects-grid">
                {customerProjects.map((proj) => (
                  <div key={proj._id} className="cd-project-card">
                    <div className="cd-project-card__name">{proj.projectName}</div>
                    {proj.description && (
                      <div className="cd-project-card__meta">{proj.description}</div>
                    )}
                    <div className="cd-project-card__footer">
                      <StatusBadge status={proj.status} />
                      <Link
                        to={`/projects/${proj._id}/sites`}
                        className="btn btn--secondary btn--sm"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        View Sites →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Invoice Ledger ── */}
      {activeTab === 'invoices' && (
        <div className="cd-panel">
          <h3 className="cd-panel__title">Invoice Ledger</h3>
          {ledgerLoading ? (
            <div className="cd-loading">Loading ledger…</div>
          ) : !ledger?.transactions?.length ? (
            <div className="cd-empty">
              <div className="cd-empty__icon" style={{ opacity: 0.5 }}><Receipt size={40} /></div>
              <div className="cd-empty__text">No invoices raised for this customer yet.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="cd-ledger-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Project</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td style={{ fontWeight: 'var(--font-medium)' }}>{tx.invoiceNumber}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{tx.projectName}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="amount">₹{tx.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="amount" style={{ color: 'var(--color-success)' }}>
                        ₹{(tx.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className={`amount ${tx.balance > 0 ? 'balance-negative' : 'balance-positive'}`}>
                        ₹{tx.balance.toLocaleString('en-IN')}
                      </td>
                      <td><StatusBadge status={tx.status} /></td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary row */}
                <tfoot>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    <td colSpan={4} style={{ fontWeight: 'var(--font-semibold)', padding: '10px 12px', borderTop: '2px solid var(--color-border)' }}>
                      Total
                    </td>
                    <td className="amount" style={{ borderTop: '2px solid var(--color-border)', fontWeight: 'var(--font-semibold)' }}>
                      ₹{(ledger.summary?.totalInvoiced || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="amount" style={{ borderTop: '2px solid var(--color-border)', fontWeight: 'var(--font-semibold)', color: 'var(--color-success)' }}>
                      ₹{(ledger.summary?.totalPaid || 0).toLocaleString('en-IN')}
                    </td>
                    <td className={`amount ${ledger.summary?.outstandingAmount > 0 ? 'balance-negative' : 'balance-positive'}`}
                      style={{ borderTop: '2px solid var(--color-border)', fontWeight: 'var(--font-bold)' }}>
                      ₹{(ledger.summary?.outstandingAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ borderTop: '2px solid var(--color-border)' }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Outstanding ── */}
      {activeTab === 'outstanding' && (
        <div className="cd-panel">
          <h3 className="cd-panel__title">Outstanding Summary</h3>
          {outLoading ? (
            <div className="cd-loading">Computing outstanding…</div>
          ) : (
            <>
              <div className="cd-outstanding-grid">
                <div className="cd-outstanding-item">
                  <div className="cd-outstanding-item__label">Total Invoiced</div>
                  <div className="cd-outstanding-item__value" style={{ color: 'var(--color-text-primary)' }}>
                    ₹{(outstanding?.totalInvoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="cd-outstanding-item">
                  <div className="cd-outstanding-item__label">Total Paid</div>
                  <div className="cd-outstanding-item__value" style={{ color: 'var(--color-success)' }}>
                    ₹{(outstanding?.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="cd-outstanding-item">
                  <div className="cd-outstanding-item__label">Outstanding Balance</div>
                  <div
                    className="cd-outstanding-item__value"
                    style={{ color: outstandingAmt > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
                  >
                    ₹{outstandingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {outstandingAmt === 0 ? (
                <div
                  style={{
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    color: 'var(--color-success)',
                    fontWeight: 'var(--font-medium)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> No outstanding balance — this customer is fully settled.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    color: 'var(--color-danger)',
                    fontWeight: 'var(--font-medium)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} /> Outstanding of ₹{outstandingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} is pending collection.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Payment History ── */}
      {activeTab === 'payments' && (
        <div className="cd-panel">
          <h3 className="cd-panel__title">Payment History</h3>
          {paymentsLoading ? (
            <div className="cd-loading">Loading payments…</div>
          ) : !payments.length ? (
            <div className="cd-empty">
              <div className="cd-empty__icon" style={{ opacity: 0.5 }}><DollarSign size={40} /></div>
              <div className="cd-empty__text">No payments recorded for this customer yet.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="cd-ledger-table">
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Payment Date</th>
                    <th>Payment Method</th>
                    <th>Reference Number</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 'var(--font-medium)' }}>{p.paymentNumber}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {p.paymentMethod?.replace('_', ' ')}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.referenceNumber || '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.remarks || '—'}</td>
                      <td className="amount" style={{ color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>
                        ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    <td colSpan={5} style={{ fontWeight: 'var(--font-semibold)', padding: '10px 12px', borderTop: '2px solid var(--color-border)' }}>
                      Total Received
                    </td>
                    <td className="amount" style={{ borderTop: '2px solid var(--color-border)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>
                      ₹{payments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Log Payment Drawer ── */}
      <FormDrawer
        open={paymentDrawerOpen}
        onClose={() => setPaymentDrawerOpen(false)}
        title={`Log Payment - ${customer.customerName}`}
        footer={
          <>
            <button onClick={() => setPaymentDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handlePaymentSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {paymentValidationErrors.general && (
          <div className="field-error" style={{ display: 'block', marginBottom: 12 }}>{paymentValidationErrors.general}</div>
        )}

        <div
          style={{
            background: 'var(--color-bg)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            borderLeft: '4px solid var(--color-primary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Customer Name: <strong>{customer.customerName}</strong><br />
          Outstanding Balance: <strong style={{ color: 'var(--color-danger)' }}>₹{outstandingAmt?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Payment Amount (₹)</label>
            <input
              type="number"
              className="field-input"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="e.g. 50000"
            />
            {paymentValidationErrors.amount && <span className="field-error">{paymentValidationErrors.amount}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Payment Date</label>
            <input
              type="date"
              className="field-input"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Payment Mode</label>
            <select
              className="field-select"
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/UPI)</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Reference Number</label>
            <input
              type="text"
              className="field-input"
              value={paymentForm.referenceNumber}
              onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
              placeholder="Transaction ID / Cheque No."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Voucher Number (Optional)</label>
            <input
              type="text"
              className="field-input"
              value={paymentForm.paymentNumber}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentNumber: e.target.value })}
              placeholder="Auto-generated if blank"
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={paymentForm.branchId}
                onChange={(e) => setPaymentForm({ ...paymentForm, branchId: e.target.value })}
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
              {paymentValidationErrors.branchId && <span className="field-error">{paymentValidationErrors.branchId}</span>}
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-label">Remarks / Description</label>
          <textarea
            className="field-textarea"
            value={paymentForm.remarks}
            onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
            placeholder="Add payment notes..."
            rows={3}
          />
        </div>
      </FormDrawer>

      {/* ── Edit Drawer ── */}
      {form && (
        <FormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Edit Customer"
          footer={
            <>
              <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn btn--primary">Save Changes</button>
            </>
          }
        >
          {validationErrors.general && (
            <div className="field-error" style={{ display: 'block', marginBottom: 12 }}>{validationErrors.general}</div>
          )}

          <div className="field-group">
            <label className="field-label field-label--required">Customer Name</label>
            <input
              type="text"
              className="field-input"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
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
              <label className="field-label">Email</label>
              <input type="email" className="field-input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">GSTIN (GST Number)</label>
            <input type="text" className="field-input" value={form.gstNumber}
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
            <textarea className="field-textarea" value={form.personalAddress} rows={3}
              onChange={(e) => setForm({ ...form, personalAddress: e.target.value })} />
          </div>
        </FormDrawer>
      )}
    </div>
  );
};

export default CustomerDetailPage;
