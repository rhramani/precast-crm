import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetDispatchQuery,
  useConfirmDispatchMutation,
  useConfirmDeliveryMutation,
} from '../../store/api/dispatchApi';
import StatusBadge from '../../components/ui/StatusBadge';

const DispatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: dispatchRes, isLoading, error } = useGetDispatchQuery(id);
  const dispatchData = dispatchRes?.data?.dispatch;

  const [confirmDispatch, { isLoading: isShipping }] = useConfirmDispatchMutation();
  const [confirmDelivery, { isLoading: isDelivering }] = useConfirmDeliveryMutation();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading dispatch dispatch log...</div>;
  }

  if (error || !dispatchData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load dispatch details.
        <br />
        <button onClick={() => navigate('/dispatch')} className="btn btn--secondary" style={{ marginTop: '16px' }}>
          Back to Dispatches
        </button>
      </div>
    );
  }

  const handleShip = async () => {
    if (!window.confirm('Are you sure you want to mark this vehicle as dispatched/shipped? This will deduct finished goods inventory.')) {
      return;
    }
    try {
      await confirmDispatch(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Dispatch operation failed');
    }
  };

  const handleDeliver = async () => {
    if (!window.confirm('Are you sure you want to confirm delivery at site?')) {
      return;
    }
    try {
      await confirmDelivery(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Delivery confirmation failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px 24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <button onClick={() => navigate('/dispatch')} className="btn btn--secondary">
          ← Back to Logs
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {dispatchData.status === 'draft' && (
            <button onClick={handleShip} className="btn btn--success" disabled={isShipping}>
              {isShipping ? 'Shipping...' : '🚛 Ship Vehicle'}
            </button>
          )}
          {dispatchData.status === 'dispatched' && (
            <button onClick={handleDeliver} className="btn btn--success" disabled={isDelivering}>
              {isDelivering ? 'Delivering...' : '✓ Confirm Delivery'}
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn--secondary">
            🖨️ Print Challan
          </button>
        </div>
      </div>

      {/* Challan Card */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        
        {/* Challan Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-border)', paddingBottom: '24px' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery Challan</span>
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: '4px 0 0 0', fontWeight: 'var(--font-bold)' }}>{dispatchData.dispatchNumber}</h1>
            <div style={{ marginTop: '12px' }}>
              <StatusBadge status={dispatchData.status} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>PRECAST CRM</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', margin: '4px 0 0 0' }}>
              Factory Dispatch Department
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
          {/* Customer / Site */}
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Delivery Destination</span>
            <strong>Project: {dispatchData.projectId?.projectName}</strong>
            <div style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Site: <strong>{dispatchData.siteId?.siteName}</strong>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Address: {dispatchData.siteId?.siteAddress || 'N/A'}
            </div>
          </div>

          {/* Dates & Logistics */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Logistics Details</span>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              Vehicle: <strong>{dispatchData.transportDetails?.vehicleNumber || '—'}</strong>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Driver: {dispatchData.transportDetails?.driverName || '—'} <br />
              Contact: {dispatchData.transportDetails?.contactNumber || '—'} <br />
              Helper: {dispatchData.transportDetails?.helperName || '—'}
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div style={{ display: 'flex', gap: '24px', backgroundColor: 'var(--color-bg)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginTop: '20px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          <div>Created: <strong>{new Date(dispatchData.createdAt).toLocaleString()}</strong></div>
          {dispatchData.dispatchedDate && (
            <div>Shipped: <strong>{new Date(dispatchData.dispatchedDate).toLocaleString()}</strong></div>
          )}
          {dispatchData.deliveredDate && (
            <div>Delivered: <strong>{new Date(dispatchData.deliveredDate).toLocaleString()}</strong></div>
          )}
        </div>

        {/* Materials Table */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '16px', fontWeight: 'var(--font-semibold)' }}>Precast Components Dispatched</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Product Details</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Product Code</th>
                <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {dispatchData.items?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <strong>{item.productId?.productName || 'Unknown Product'}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <code>{item.productId?.productCode || '—'}</code>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>
                    {item.quantity} {item.productId?.unit || 'pcs'}
                  </td>
                </tr>
              ))}
              {(!dispatchData.items || dispatchData.items.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No items in this dispatch challan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispatchDetailPage;
