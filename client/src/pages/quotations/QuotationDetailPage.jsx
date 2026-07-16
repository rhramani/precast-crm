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
                <span>Sub Total (Net)</span>
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
    </div>
  );
};

export default QuotationDetailPage;
