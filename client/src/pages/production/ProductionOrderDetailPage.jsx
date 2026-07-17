import { useState, useEffect } from 'react';
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
  const order = orderRes?.data?.order;

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateProductionOrderStatusMutation();
  const [completeOrder, { isLoading: isCompleting }] = useCompleteProductionOrderMutation();

  // Local state
  const [completeDrawerOpen, setCompleteDrawerOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    producedQuantity: '',
    damagedQuantity: '0',
    remarks: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const container = document.querySelector('.page-container');
    if (container) {
      const originalBgColor = container.style.backgroundColor;
      const originalBg = container.style.background;
      
      container.style.backgroundColor = 'transparent';
      container.style.background = 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)';
      
      return () => {
        container.style.background = originalBg;
        container.style.backgroundColor = originalBgColor;
      };
    }
  }, []);

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>Loading production order details...</div>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-danger)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', margin: '24px' }}>
        <span style={{ fontSize: '32px' }}>⚠️</span>
        <h3 style={{ margin: '16px 0 8px 0', color: 'var(--color-text-primary)' }}>Failed to Load Order</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Could not retrieve production order details. It might have been deleted or you may not have access.</p>
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ padding: '8px 16px' }}>Back to pipeline</button>
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
      damagedQuantity: '0',
      remarks: '',
    });
    setValidationErrors({});
    setCompleteDrawerOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const qty = Number(completeForm.producedQuantity);
    const damagedQty = Number(completeForm.damagedQuantity || 0);

    const errors = {};
    if (completeForm.producedQuantity === '' || isNaN(qty) || qty < 0) {
      errors.producedQuantity = 'Produced quantity must be a non-negative number';
    }
    if (completeForm.damagedQuantity !== '' && (isNaN(damagedQty) || damagedQty < 0)) {
      errors.damagedQuantity = 'Damaged quantity must be a non-negative number';
    } else if (damagedQty > qty) {
      errors.damagedQuantity = 'Damaged quantity cannot exceed actual produced quantity';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await completeOrder({
        id: order._id,
        producedQuantity: qty,
        damagedQuantity: damagedQty,
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
            style={{ padding: '8px 16px', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={isUpdatingStatus}
          >
            🚀 Submit for Production
          </button>
        )}

        {order.status === 'pending' && (
          <button
            onClick={() => handleStatusTransition('in_production')}
            className="btn btn--primary"
            style={{ padding: '8px 16px', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={isUpdatingStatus}
          >
            ⚡ Start Production
          </button>
        )}

        {order.status === 'in_production' && (
          <button
            onClick={handleOpenComplete}
            className="btn btn--success"
            style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-inverse)', padding: '8px 16px', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={isCompleting}
          >
            ✅ Complete Order
          </button>
        )}

        <button
          onClick={() => handleStatusTransition('cancelled')}
          className="btn btn--danger"
          style={{ backgroundColor: 'var(--color-danger)', color: 'var(--color-text-inverse)', padding: '8px 16px', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: '6px' }}
          disabled={isUpdatingStatus}
        >
          🚫 Cancel Order
        </button>
      </div>
    );
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%' 
      }}
    >
      {/* Premium Header Block */}
      <div 
        style={{
          background: 'var(--gradient-primary)',
          padding: '28px 32px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-inverse)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative background circle */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          top: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <button
            onClick={() => navigate('/production')}
            className="btn"
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: 'var(--color-text-inverse)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 'var(--font-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
          >
            ← Back to pipeline
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-inverse)', margin: 0 }}>
                Production Order: {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '6px 0 0 0', fontSize: 'var(--text-sm)' }}>
              Product: <strong style={{ color: 'var(--color-text-inverse)' }}>{order.productId?.productName} ({order.productId?.productCode})</strong>
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Info Card */}
        <div 
          className="card" 
          style={{ 
            background: 'var(--glass-bg)', 
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            padding: '28px', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px', margin: 0, fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 General Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(24, 38, 80, 0.08)' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏷️ <span>BOM Version:</span>
                </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>v{order.bomId?.version || 1}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(24, 38, 80, 0.08)' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎯 <span>Planned Qty:</span>
                </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{order.plannedQuantity?.toLocaleString()} {order.productId?.unit || 'units'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(24, 38, 80, 0.08)' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏭 <span>Produced Qty:</span>
                </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{order.producedQuantity?.toLocaleString() || 0} {order.productId?.unit || 'units'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(24, 38, 80, 0.08)' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 <span>Start Date:</span>
                </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{order.startDate ? new Date(order.startDate).toLocaleDateString() : 'Not Started'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏁 <span>Completed Date:</span>
                </span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{order.completedDate ? new Date(order.completedDate).toLocaleDateString() : 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid rgba(24, 38, 80, 0.08)' }}>
            {renderActionButtons()}
          </div>
        </div>

        {/* Materials Table */}
        <div 
          className="card" 
          style={{ 
            background: 'var(--glass-bg)', 
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            padding: '28px', 
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px', margin: 0, fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧱 Raw Material Consumption
          </h3>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(24, 38, 80, 0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px 12px 0', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-semibold)' }}>Material Name</th>
                  <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-semibold)' }}>Required Quantity</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-semibold)' }}>Available Stock Quantity</th>
                </tr>
              </thead>
              <tbody>
                {!order.materialsConsumed || order.materialsConsumed.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)' }}>
                      No raw material consumption data recorded.
                    </td>
                  </tr>
                ) : (
                  order.materialsConsumed.map((item) => {
                    const available = item.materialId?.currentQuantity || 0;
                    const required = item.quantity || 0;
                    const hasShortage = available < required;
                    const pct = required > 0 ? Math.min(100, (available / required) * 100) : 100;
                    const progressColor = hasShortage ? 'var(--color-danger)' : 'var(--color-success)';

                    return (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(24, 38, 80, 0.06)' }}>
                        <td style={{ padding: '14px 8px 14px 0' }}>
                          <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                            {item.materialId?.materialName || '—'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {item.materialId?.materialCode || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 8px', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>{required.toLocaleString()}</span> {item.materialId?.unit}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{ 
                            color: hasShortage ? 'var(--color-danger)' : 'var(--color-text-primary)', 
                            fontWeight: 'var(--font-semibold)'
                          }}>
                            {available.toLocaleString()} {item.materialId?.unit}
                          </span>
                          
                          {/* Progress Bar */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <div style={{ width: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '4px', height: '5px', overflow: 'hidden', border: '1px solid rgba(24, 38, 80, 0.08)' }}>
                              <div style={{ width: `${pct}%`, background: progressColor, height: '100%' }} />
                            </div>
                          </div>

                          {hasShortage && order.status !== 'completed' && (
                            <span style={{ 
                              display: 'inline-block', 
                              fontSize: '10px', 
                              color: 'var(--color-danger)', 
                              backgroundColor: 'var(--color-danger-bg)',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              marginTop: '4px',
                              fontWeight: 'var(--font-medium)'
                            }}>
                              Shortage: {(required - available).toLocaleString()} {item.materialId?.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
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
          <label className="field-label">Damaged Quantity</label>
          <input
            type="number"
            className="field-input"
            value={completeForm.damagedQuantity}
            onChange={(e) => setCompleteForm({ ...completeForm, damagedQuantity: e.target.value })}
            placeholder="e.g. 5"
          />
          {validationErrors.damagedQuantity && <span className="field-error">{validationErrors.damagedQuantity}</span>}
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
