import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetProductionOrderQuery,
  useUpdateProductionOrderStatusMutation,
  useCompleteProductionOrderMutation,
} from '../../store/api/productionApi';
import StatusBadge from '../../components/ui/StatusBadge';
import FormDrawer from '../../components/ui/FormDrawer';

const ProductionOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: orderRes, isLoading, error } = useGetProductionOrderQuery(id);
  const order = orderRes?.data;

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateProductionOrderStatusMutation();
  const [completeOrder, { isLoading: isCompleting }] = useCompleteProductionOrderMutation();

  // Local state
  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    producedQuantity: '',
    remarks: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading production order details...</div>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load production order details.
        <br />
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ marginTop: '16px' }}>Back</button>
      </div>
    );
  }

  const handleStatusTransition = async (nextStatus) => {
    if (nextStatus === 'cancelled' && !window.confirm('Are you sure you want to cancel this production order?')) {
      return;
    }
    try {
      await updateStatus({ id: order._id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || `Failed to update status to ${nextStatus}`);
    }
  };

  const handleOpenComplete = () => {
    setCompleteForm({
      producedQuantity: order.plannedQuantity,
      remarks: '',
    });
    setValidationErrors({});
    setCompleteDrawerOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const qty = Number(completeForm.producedQuantity);
    if (!completeForm.producedQuantity || isNaN(qty) || qty < 0) {
      setValidationErrors({ producedQuantity: 'Produced quantity must be a non-negative number' });
      return;
    }

    try {
      await completeOrder({
        id: order._id,
        producedQuantity: qty,
        remarks: completeForm.remarks,
      }).unwrap();
      setCompleteDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Completion operation failed.' });
    }
  };

  const renderActionButtons = () => {
    if (order.status === 'completed' || order.status === 'cancelled') return null;

    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {order.status === 'draft' && (
          <button
            onClick={() => handleStatusTransition('pending')}
            className="btn btn--primary"
            disabled={isUpdatingStatus}
          >
            Submit for Production
          </button>
        )}

        {order.status === 'pending' && (
          <button
            onClick={() => handleStatusTransition('in_production')}
            className="btn btn--primary"
            disabled={isUpdatingStatus}
          >
            Start Production
          </button>
        )}

        {order.status === 'in_production' && (
          <button
            onClick={handleOpenComplete}
            className="btn btn--success"
            style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-inverse)' }}
            disabled={isCompleting}
          >
            Complete Order
          </button>
        )}

        <button
          onClick={() => handleStatusTransition('cancelled')}
          className="btn btn--danger"
          style={{ backgroundColor: 'var(--color-danger)', color: 'var(--color-text-inverse)' }}
          disabled={isUpdatingStatus}
        >
          Cancel Order
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/production')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Production Order: {order.orderNumber}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Product: <strong>{order.productId?.productName} ({order.productId?.productCode})</strong>
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Info Card */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📋 General Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>BOM Version:</span>
              <strong>v{order.bomId?.version || 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Planned Qty:</span>
              <strong>{order.plannedQuantity} {order.productId?.unit || 'units'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Produced Qty:</span>
              <strong>{order.producedQuantity || 0} {order.productId?.unit || 'units'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Start Date:</span>
              <strong>{order.startDate ? new Date(order.startDate).toLocaleDateString() : 'Not Started'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Completed Date:</span>
              <strong>{order.completedDate ? new Date(order.completedDate).toLocaleDateString() : 'N/A'}</strong>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            {renderActionButtons()}
          </div>
        </div>

        {/* Materials Table */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            🧱 Raw Material Consumption
          </h3>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Material</th>
                  <th style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>Required</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {order.materialsConsumed?.map((item) => {
                  const hasShortage = item.materialId?.currentQuantity < item.quantity;
                  return (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 0' }}>
                        <div>{item.materialId?.materialName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.materialId?.materialCode}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {item.quantity.toLocaleString()} {item.materialId?.unit}
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right', color: hasShortage ? 'var(--color-danger)' : 'var(--color-text-primary)', fontWeight: hasShortage ? 'bold' : 'normal' }}>
                        {item.materialId?.currentQuantity?.toLocaleString()} {item.materialId?.unit}
                        {hasShortage && order.status !== 'completed' && <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-danger)' }}>Low Stock</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complete Order Drawer */}
      <FormDrawer
        open={completeDrawerOpen}
        onClose={() => setCompleteDrawerOpen(false)}
        title="Complete Production Order"
        footer={
          <>
            <button onClick={() => setCompleteDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleCompleteSubmit} className="btn btn--primary" disabled={isCompleting}>Complete & Deduct Stock</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ marginBottom: '16px' }}>{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Actually Produced Quantity ({order.productId?.unit})</label>
          <input
            type="number"
            className="field-input"
            value={completeForm.producedQuantity}
            onChange={(e) => setCompleteForm({ ...completeForm, producedQuantity: e.target.value })}
            placeholder="e.g. 100"
          />
          {validationErrors.producedQuantity && <span className="field-error">{validationErrors.producedQuantity}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Production Remarks</label>
          <textarea
            className="field-input"
            value={completeForm.remarks}
            onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
            placeholder="e.g. Shift 1 finished with 2% scrap slabs"
            rows={4}
          />
        </div>
      </FormDrawer>
    </div>
  );
};

export default ProductionOrderDetailPage;
