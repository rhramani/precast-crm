import { useParams, useNavigate } from 'react-router-dom';
import { useGetInvoiceQuery, useCancelInvoiceMutation } from '../../store/api/invoiceApi';
import StatusBadge from '../../components/ui/StatusBadge';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: invoiceRes, isLoading, error } = useGetInvoiceQuery(id);
  const invoice = invoiceRes?.data;

  // Mutations
  const [cancelInvoice, { isLoading: isCancelling }] = useCancelInvoiceMutation();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading invoice statement...</div>;
  }

  if (error || !invoice) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load invoice details.
        <br />
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ marginTop: '16px' }}>Back</button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This action is irreversible.')) {
      return;
    }
    try {
      await cancelInvoice(invoice._id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to cancel the invoice');
    }
  };

  const balanceDue = invoice.grandTotal - (invoice.paidAmount || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px 24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <button onClick={() => navigate('/invoices')} className="btn btn--secondary">
          ← Back to Invoices
        </button>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button
              onClick={handleCancel}
              className="btn btn--danger"
              style={{ backgroundColor: 'var(--color-danger)', color: 'var(--color-text-inverse)' }}
              disabled={isCancelling}
            >
              Cancel Invoice
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn--secondary">
            🖨️ Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Sheet */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-border)', paddingBottom: '24px' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tax Invoice</span>
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: '4px 0 0 0', fontWeight: 'var(--font-bold)' }}>{invoice.invoiceNumber}</h1>
            <div style={{ marginTop: '12px' }}>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary-dark)' }}>PRECAST CRM GROUP</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', margin: '4px 0 0 0' }}>
              Factory Branch Invoice System
            </p>
          </div>
        </div>

        {/* Bill To / Info Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Billing Address</span>
            <strong>{invoice.customerId?.customerName}</strong>
            {invoice.customerId?.companyName && <div style={{ fontSize: 'var(--text-sm)' }}>{invoice.customerId.companyName}</div>}
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Phone: {invoice.customerId?.mobile} <br />
              {invoice.customerId?.gstNumber && <>GSTIN: {invoice.customerId.gstNumber}</>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Metadata</span>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              Project: <strong>{invoice.projectId?.projectName}</strong>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()} <br />
              Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ marginTop: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Product Name & Code</th>
                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Qty</th>
                <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Tax Rate</th>
                <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <strong>{item.productId?.productName}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.productId?.productCode}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {item.quantity} {item.productId?.unit}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {item.taxPercent}%
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    ₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Recaps */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'var(--text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
              <span>₹{invoice.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Tax (GST):</span>
              <span>₹{invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-border)', paddingTop: '10px', fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)' }}>
              <span>Grand Total:</span>
              <span>₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
              <span>Total Paid:</span>
              <span>₹{(invoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontWeight: 'var(--font-semibold)', color: balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              <span>Balance Due:</span>
              <span>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
