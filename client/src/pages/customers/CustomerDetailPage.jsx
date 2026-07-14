import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useGetCustomerQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerOutstandingQuery,
  useUpdateCustomerMutation,
} from '../../store/api/customerApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import './CustomerDetail.css';

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
  <div>
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

  /* ── Edit Drawer ─────────────────────────────────────── */
  const handleOpenEdit = () => {
    setForm({
      customerName: customer?.customerName || '',
      companyName: customer?.companyName || '',
      contactPerson: customer?.contactPerson || '',
      mobile: customer?.mobile || '',
      email: customer?.email || '',
      gstNumber: customer?.gstNumber || '',
      address: customer?.address || '',
      creditLimit: customer?.creditLimit || 0,
      paymentTerms: customer?.paymentTerms || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};
    if (!form.customerName?.trim()) errors.customerName = 'Customer name is required';
    if (!form.mobile?.trim()) errors.mobile = 'Mobile is required';
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    try {
      await updateCustomer({ id, ...form }).unwrap();
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
      {/* ── Header ── */}
      <div className="cd-header">
        <button className="cd-header__back" onClick={() => navigate('/customers')}>
          ← Customers
        </button>
        <div className="cd-header__identity">
          <div className="cd-avatar">{getInitials(customer.customerName)}</div>
          <div>
            <h1 className="cd-header__name">{customer.customerName}</h1>
            <p className="cd-header__company">
              {customer.companyName || 'Individual'} · {customer.mobile}
            </p>
          </div>
          <StatusBadge status={customer.status} />
        </div>
        <div className="cd-header__actions">
          <button className="btn btn--secondary" onClick={handleOpenEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 14, height: 14 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="cd-stats">
        <div className="cd-stat-card">
          <span className="cd-stat-card__label">Credit Limit</span>
          <span className="cd-stat-card__value cd-stat-card__value--primary">
            {creditLimit > 0 ? `₹${creditLimit.toLocaleString('en-IN')}` : 'Unlimited'}
          </span>
          {creditLimit > 0 && (
            <>
              <div className="cd-credit-bar">
                <div
                  className={`cd-credit-bar__fill ${creditBarClass}`}
                  style={{ width: `${creditUsed}%` }}
                />
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {creditUsed}% used
              </span>
            </>
          )}
        </div>

        <StatCard
          label="Outstanding Balance"
          value={`₹${outstandingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          valueClass={outstandingAmt > 0 ? 'cd-stat-card__value--danger' : 'cd-stat-card__value--success'}
          sub={outstandingAmt === 0 ? 'All clear' : 'Pending collection'}
        />

        <StatCard
          label="Total Invoiced"
          value={`₹${totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          sub={`${ledger?.transactions?.length ?? 0} invoice(s)`}
        />

        <StatCard
          label="Active Projects"
          value={projectCount}
          sub="Linked to this customer"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="cd-tabs">
        {['overview', 'invoices', 'outstanding'].map((tab) => (
          <button
            key={tab}
            className={`cd-tab ${activeTab === tab ? 'cd-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📋 Overview'}
            {tab === 'invoices' && '🧾 Invoice Ledger'}
            {tab === 'outstanding' && '💰 Outstanding'}
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
              <InfoItem label="Contact Person" value={customer.contactPerson} />
              <InfoItem label="GSTIN (GST Number)" value={customer.gstNumber} />
              <InfoItem label="Payment Terms" value={customer.paymentTerms} />
              <InfoItem label="Member Since" value={new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            </div>
            {customer.address && (
              <div style={{ marginTop: 20 }}>
                <div className="cd-info-item__label">Billing Address</div>
                <div className="cd-info-item__value" style={{ whiteSpace: 'pre-line' }}>{customer.address}</div>
              </div>
            )}
          </div>

          {/* Linked Projects */}
          <div className="cd-panel">
            <h3 className="cd-panel__title">Linked Projects ({customerProjects.length})</h3>
            {customerProjects.length === 0 ? (
              <div className="cd-empty">
                <div className="cd-empty__icon">📁</div>
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
              <div className="cd-empty__icon">🧾</div>
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
                {creditLimit > 0 && (
                  <div className="cd-outstanding-item">
                    <div className="cd-outstanding-item__label">Credit Limit</div>
                    <div
                      className="cd-outstanding-item__value"
                      style={{ color: creditUsed >= 90 ? 'var(--color-danger)' : 'var(--color-primary)' }}
                    >
                      ₹{creditLimit.toLocaleString('en-IN')}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal', display: 'block', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {creditUsed}% utilized
                      </span>
                    </div>
                  </div>
                )}
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
                  ✅ No outstanding balance — this customer is fully settled.
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
                  ⚠️ Outstanding of ₹{outstandingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} is pending collection.
                  {creditLimit > 0 && outstandingAmt > creditLimit && (
                    <span style={{ display: 'block', marginTop: 4 }}>
                      🔴 Exceeds credit limit by ₹{(outstandingAmt - creditLimit).toLocaleString('en-IN')}.
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
              <label className="field-label">Company Name</label>
              <input type="text" className="field-input" value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label">Contact Person</label>
              <input type="text" className="field-input" value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label field-label--required">Mobile Number</label>
              <input type="text" className="field-input" value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              {validationErrors.mobile && <span className="field-error">{validationErrors.mobile}</span>}
            </div>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input type="email" className="field-input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">GSTIN (GST Number)</label>
              <input type="text" className="field-input" value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            </div>
            <div className="field-group">
              <label className="field-label">Credit Limit (₹)</label>
              <input type="number" className="field-input" value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Payment Terms</label>
            <input type="text" className="field-input" value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              placeholder="e.g. 30 Days Net" />
          </div>

          <div className="field-group">
            <label className="field-label">Billing Address</label>
            <textarea className="field-textarea" value={form.address} rows={3}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </FormDrawer>
      )}
    </div>
  );
};

export default CustomerDetailPage;
