import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetQuotationQuery,
  useUpdateQuotationStatusMutation,
} from '../../store/api/quotationApi';
import StatusBadge from '../../components/ui/StatusBadge';
import './QuotationDetail.css';

/* ── Status flow definition ──────────────────────────────── */
const STATUS_FLOW = [
  { key: 'draft',    label: 'Draft' },
  { key: 'sent',     label: 'Sent to Client' },
  { key: 'accepted', label: 'Accepted' },
];

const getStepClass = (stepKey, currentStatus) => {
  if (currentStatus === 'rejected') {
    if (stepKey === 'draft' || stepKey === 'sent') return 'qd-status-step--done';
    return 'qd-status-step--rejected';
  }
  const flowIdx = STATUS_FLOW.findIndex((s) => s.key === stepKey);
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  if (flowIdx < currentIdx) return 'qd-status-step--done';
  if (flowIdx === currentIdx) return 'qd-status-step--active';
  return '';
};

/* ── Currency formatter ──────────────────────────────────── */
const fmt = (n) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const toWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
  };

  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero';
  return numToWords(rounded);
};

/* ── Main Component ──────────────────────────────────────── */
const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showGST, setShowGST] = useState(true); // true = with GST, false = without GST

  const { data: quoteRes, isLoading, error } = useGetQuotationQuery(id);
  const [updateStatus, { isLoading: statusLoading }] = useUpdateQuotationStatusMutation();

  /* ── Loading / Error ─────────────────────────────────── */
  if (isLoading) {
    return <div className="qd-loading">Loading quotation…</div>;
  }

  const quote = quoteRes?.data?.quotation;

  if (error || !quote) {
    return (
      <div className="qd-loading">
        <span style={{ color: 'var(--color-danger)' }}>⚠️ Quotation not found.</span>
        <button onClick={() => navigate('/quotations')} className="btn btn--secondary">← Back</button>
      </div>
    );
  }

  const customer = quote.customerId;
  const project = quote.projectId;
  const status = quote.status;
  const isEditable = status === 'draft';
  const isFinal = status === 'accepted' || status === 'rejected';

  // Determine if it is Intra-State (CGST + SGST) or Inter-State (IGST)
  const getGstType = () => {
    const branchGst = quote.branchId?.gstNumber || '';
    const customerGst = customer?.gstNumber || '';
    if (branchGst.length >= 2 && customerGst.length >= 2) {
      return branchGst.substring(0, 2) === customerGst.substring(0, 2) ? 'intra' : 'inter';
    }
    return 'intra'; // Default/fallback to CGST + SGST
  };

  const gstType = getGstType();

  /* ── Status transitions ───────────────────────────────── */
  const handleStatus = async (nextStatus) => {
    try {
      await updateStatus({ id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update status');
    }
  };


  return (
    <div className="qd-page">
      {/* ── Header ── */}
      <div className="qd-header">
        <button className="qd-header__back" onClick={() => navigate('/quotations')}>
          ← Quotations
        </button>

        <div className="qd-header__info">
          <h1 className="qd-header__number">
            {quote.quoteNumber}
            <StatusBadge status={status} />
          </h1>
          <div className="qd-header__meta">
            <span>
              <strong>{customer?.customerName}</strong>
              {customer?.companyName && ` — ${customer.companyName}`}
            </span>
            <span className="qd-header__meta-sep">|</span>
            <span>Project: <strong>{project?.projectName || '—'}</strong></span>
          </div>
        </div>

        <div className="qd-header__actions">
          <button
            className="btn btn--secondary"
            onClick={() => window.print()}
            title="Print / Save as PDF"
          >
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      {/* ── Credit limit warning ── */}
      {quote.remarks && (
        <div className="qd-warning">
          <span>⚠️</span>
          <span>{quote.remarks}</span>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="qd-grid">

        {/* ── Left: Items + Totals ── */}
        <div className="qd-items-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div className="qd-panel">
            {/* ── GST Toggle ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="qd-panel__title" style={{ margin: 0 }}>Line Items</h3>
              <div style={{
                display: 'inline-flex',
                background: 'var(--color-primary-light)',
                padding: 4,
                borderRadius: 100,
                gap: 4,
                border: '1px solid rgba(var(--color-primary-rgb), 0.1)',
              }}>
                <button
                  onClick={() => setShowGST(false)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 100,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: !showGST ? 'var(--color-primary)' : 'transparent',
                    color: !showGST ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    boxShadow: !showGST ? '0 2px 8px rgba(var(--color-primary-rgb), 0.2)' : 'none',
                  }}
                >
                  Without GST
                </button>
                <button
                  onClick={() => setShowGST(true)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 100,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: showGST ? 'var(--color-primary)' : 'transparent',
                    color: showGST ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                    boxShadow: showGST ? '0 2px 8px rgba(var(--color-primary-rgb), 0.2)' : 'none',
                  }}
                >
                  With GST
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="qd-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th className="right">Quantity</th>
                    <th className="right">Unit Rate (₹)</th>
                    <th className="right">Net Amount (₹)</th>
                    {showGST && (
                      gstType === 'intra' ? (
                        <>
                          <th className="right">CGST (%)</th>
                          <th className="right">CGST (₹)</th>
                          <th className="right">SGST (%)</th>
                          <th className="right">SGST (₹)</th>
                        </>
                      ) : (
                        <>
                          <th className="right">IGST (%)</th>
                          <th className="right">IGST (₹)</th>
                        </>
                      )
                    )}
                    <th className="right">{showGST ? 'Total (₹)' : 'Amount (₹)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, idx) => {
                    const net = item.quantity * item.rate;
                    const taxRate = item.taxPercent ?? 18;
                    const taxAmt = net * (taxRate / 100);
                    const total = net + taxAmt;
                    const prod = item.productId;
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--color-text-disabled)', width: 32 }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontWeight: 'var(--font-medium)' }}>
                            {prod?.productName || 'Unknown Product'}
                          </span>
                          {prod?.productCode && (
                            <span className="qd-items-table__product-code">{prod.productCode}</span>
                          )}
                        </td>
                        <td className="right num">{item.quantity}</td>
                        <td className="right num">{fmt(item.rate)}</td>
                        <td className="right num">{fmt(net)}</td>
                        {showGST && (
                          gstType === 'intra' ? (
                            <>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {(taxRate / 2).toFixed(1)}%
                              </td>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {fmt(taxAmt / 2)}
                              </td>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {(taxRate / 2).toFixed(1)}%
                              </td>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {fmt(taxAmt / 2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {taxRate}%
                              </td>
                              <td className="right num" style={{ color: 'var(--color-text-secondary)' }}>
                                {fmt(taxAmt)}
                              </td>
                            </>
                          )
                        )}
                        <td className="right num" style={{ fontWeight: 'var(--font-medium)' }}>
                          {showGST ? fmt(total) : fmt(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="qd-totals">
              <div className="qd-totals__row qd-totals__row--sub">
                <span>Sub Total — Combined Project Cost (Excl. Tax)</span>
                <span>{fmt(quote.subTotal)}</span>
              </div>
              {showGST ? (
                <>
                  {gstType === 'intra' ? (
                    <>
                      <div className="qd-totals__row qd-totals__row--sub">
                        <span>CGST</span>
                        <span>{fmt(quote.taxAmount / 2)}</span>
                      </div>
                      <div className="qd-totals__row qd-totals__row--sub">
                        <span>SGST</span>
                        <span>{fmt(quote.taxAmount / 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="qd-totals__row qd-totals__row--sub">
                      <span>IGST</span>
                      <span>{fmt(quote.taxAmount)}</span>
                    </div>
                  )}
                  <div className="qd-totals__row qd-totals__row--grand">
                    <span>Grand Total <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'rgba(255,255,255,0.75)', marginLeft: 6 }}>(Incl. GST)</span></span>
                    <span>{fmt(quote.grandTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="qd-totals__row qd-totals__row--grand">
                  <span>Total <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'rgba(255,255,255,0.75)', marginLeft: 6 }}>(Excl. GST)</span></span>
                  <span>{fmt(quote.subTotal)}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Right: Sidebar ── */}
        <div className="qd-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quote info */}
          <div className="qd-panel">
            <h3 className="qd-panel__title">Quote Details</h3>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Quote Number</span>
              <span className="qd-info-row__value">{quote.quoteNumber}</span>
            </div>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Created</span>
              <span className="qd-info-row__value">
                {new Date(quote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Valid Until</span>
              <span className="qd-info-row__value">
                {quote.validUntil
                  ? new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Items</span>
              <span className="qd-info-row__value">{quote.items.length} product(s)</span>
            </div>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Grand Total</span>
              <span className="qd-info-row__value" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-bold)' }}>
                {fmt(quote.grandTotal)}
              </span>
            </div>
          </div>

          {/* Client info */}
          <div className="qd-panel">
            <h3 className="qd-panel__title">Client</h3>
            <div className="qd-info-row">
              <span className="qd-info-row__label">Name</span>
              <span className="qd-info-row__value">{customer?.customerName || '—'}</span>
            </div>
            {customer?.companyName && (
              <div className="qd-info-row">
                <span className="qd-info-row__label">Company</span>
                <span className="qd-info-row__value">{customer.companyName}</span>
              </div>
            )}
            {customer?.mobile && (
              <div className="qd-info-row">
                <span className="qd-info-row__label">Mobile</span>
                <span className="qd-info-row__value">{customer.mobile}</span>
              </div>
            )}
            {customer?.gstNumber && (
              <div className="qd-info-row">
                <span className="qd-info-row__label">GSTIN</span>
                <span className="qd-info-row__value" style={{ fontSize: 'var(--text-xs)' }}>{customer.gstNumber}</span>
              </div>
            )}
          </div>

          {/* Status flow */}
          <div className="qd-panel">
            <h3 className="qd-panel__title">Status Flow</h3>
            <div className="qd-status-flow">
              {STATUS_FLOW.map((step) => (
                <div key={step.key} className={`qd-status-step ${getStepClass(step.key, status)}`}>
                  <div className="qd-status-step__dot" />
                  <span>{step.label}</span>
                </div>
              ))}
              {status === 'rejected' && (
                <div className="qd-status-step qd-status-step--rejected">
                  <div className="qd-status-step__dot" />
                  <span>Rejected</span>
                </div>
              )}
            </div>

            {/* Status action buttons */}
            {!isFinal && (
              <div className="qd-action-group">
                {status === 'draft' && (
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%' }}
                    onClick={() => handleStatus('sent')}
                    disabled={statusLoading}
                  >
                    📤 Send to Client
                  </button>
                )}
                {status === 'sent' && (
                  <>
                    <button
                      className="btn btn--primary"
                      style={{ width: '100%', background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                      onClick={() => handleStatus('accepted')}
                      disabled={statusLoading}
                    >
                      ✅ Mark Accepted
                    </button>
                    <button
                      className="btn btn--secondary"
                      style={{ width: '100%', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      onClick={() => {
                        if (window.confirm('Mark this quotation as rejected?')) handleStatus('rejected');
                      }}
                      disabled={statusLoading}
                    >
                      ❌ Mark Rejected
                    </button>
                  </>
                )}
              </div>
            )}

            {isFinal && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: status === 'accepted' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  color: status === 'accepted' ? 'var(--color-success)' : 'var(--color-danger)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                {status === 'accepted' ? '✅ Quotation accepted — no further changes possible.' : '❌ Quotation rejected.'}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Printable Invoice/Quotation Document (Only visible in Print) ── */}
      <div className="printable-quote-doc">
        {/* Header Section */}
        <div className="pq-header-table">
          <div className="pq-company-details">
            <h2 className="pq-company-name">{quote.branchId?.branchName || 'GIR Precast'}</h2>
            <p className="pq-company-text">{quote.branchId?.address || 'Industrial Area Phase 2, Delhi, India'}</p>
            <p className="pq-company-text">Email: {quote.branchId?.email || 'branch@girprecast.com'} | Contact: {quote.branchId?.mobileNumber || '+919999999999'}</p>
            {quote.branchId?.gstNumber && <p className="pq-company-text"><strong>GSTIN: {quote.branchId?.gstNumber}</strong></p>}
          </div>
          <div className="pq-quote-meta">
            <h1 className="pq-title">SALES QUOTATION</h1>
            <table className="pq-meta-table">
              <tbody>
                <tr>
                  <td><strong>Quote No:</strong></td>
                  <td>{quote.quoteNumber}</td>
                </tr>
                <tr>
                  <td><strong>Date:</strong></td>
                  <td>{new Date(quote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td><strong>Valid Until:</strong></td>
                  <td>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                </tr>
                <tr>
                  <td><strong>Status:</strong></td>
                  <td style={{ textTransform: 'uppercase' }}>{quote.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="pq-bill-to">
          <h3 className="pq-section-title">QUOTATION FOR (CLIENT):</h3>
          <div className="pq-client-details">
            <p className="pq-client-name"><strong>{customer?.customerName || '—'}</strong></p>
            {customer?.companyName && <p className="pq-client-text">{customer.companyName}</p>}
            {customer?.address && <p className="pq-client-text">{customer.address}</p>}
            {customer?.mobile && <p className="pq-client-text">Mobile: {customer.mobile}</p>}
            {customer?.email && <p className="pq-client-text">Email: {customer.email}</p>}
            {customer?.gstNumber && <p className="pq-client-text"><strong>GSTIN: {customer.gstNumber}</strong></p>}
          </div>
        </div>

        {project && (
          <div className="pq-project-info">
            <p><strong>Project Name:</strong> {project.projectName}</p>
            {project.description && <p><strong>Description:</strong> {project.description}</p>}
          </div>
        )}

        {/* Items Table */}
        <table className="pq-items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Description</th>
              <th className="right">Qty</th>
              <th className="right">Unit Rate (₹)</th>
              <th className="right">Net Amount (₹)</th>
              {showGST && (
                gstType === 'intra' ? (
                  <>
                    <th className="right">CGST</th>
                    <th className="right">SGST</th>
                  </>
                ) : (
                  <th className="right">IGST</th>
                )
              )}
              <th className="right">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, idx) => {
              const net = item.quantity * item.rate;
              const taxRate = item.taxPercent ?? 18;
              const taxAmt = net * (taxRate / 100);
              const total = net + taxAmt;
              const prod = item.productId;
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{prod?.productName || 'Unknown Product'}</strong>
                    {prod?.productCode && <span className="pq-item-code"> ({prod.productCode})</span>}
                  </td>
                  <td className="right">{item.quantity}</td>
                  <td className="right">{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="right">{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  {showGST && (
                    gstType === 'intra' ? (
                      <>
                        <td className="right">{(taxRate / 2)}%<br/><span className="pq-tax-val">₹{(taxAmt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                        <td className="right">{(taxRate / 2)}%<br/><span className="pq-tax-val">₹{(taxAmt / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                      </>
                    ) : (
                      <td className="right">{taxRate}%<br/><span className="pq-tax-val">₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                    )
                  )}
                  <td className="right">{(showGST ? total : net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="pq-totals-section">
          <div className="pq-totals-box">
            <table className="pq-totals-table">
              <tbody>
                <tr>
                  <td>Sub Total (Net):</td>
                  <td className="right">₹{quote.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                {showGST && (
                  gstType === 'intra' ? (
                    <>
                      <tr>
                        <td>CGST:</td>
                        <td className="right">₹{(quote.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td>SGST:</td>
                        <td className="right">₹{(quote.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td>IGST:</td>
                      <td className="right">₹{quote.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                )}
                <tr className="pq-grand-total-row">
                  <td><strong>Grand Total ({showGST ? 'Incl. GST' : 'Excl. GST'}):</strong></td>
                  <td className="right"><strong>₹{(showGST ? quote.grandTotal : quote.subTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in words */}
        <div className="pq-amount-words">
          <p><strong>Amount in Words:</strong> {toWords(showGST ? quote.grandTotal : quote.subTotal)} Rupees Only</p>
        </div>

        {/* Footer info: Bank Details + Terms */}
        <div className="pq-footer-details">
          <div className="pq-terms">
            <h4>Terms & Conditions</h4>
            <ol>
              <li>Price Validity: Quote is valid until the validity date listed above.</li>
              <li>Delivery: As per mutual agreement and schedule.</li>
              <li>Payment Terms: {customer?.paymentTerms || 'Standard Terms Apply'}.</li>
              <li>Taxes: GST charged at {showGST ? '18%' : 'applicable rates'} (as displayed above).</li>
            </ol>
          </div>
          <div className="pq-signatures">
            <div className="pq-signature-box">
              <p style={{ height: 50 }}></p>
              <div className="pq-signature-line">Customer Signature / Acceptance</div>
            </div>
            <div className="pq-signature-box">
              <p style={{ height: 50 }}></p>
              <div className="pq-signature-line">Authorized Signatory</div>
              <p style={{ fontSize: 9, marginTop: 4, color: '#666' }}>for {quote.branchId?.branchName || 'GIR Precast'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetailPage;
