import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetPurchaseOrderQuery,
  useReceivePurchaseOrderMutation,
} from '../../store/api/purchaseApi';
import StatusBadge from '../../components/ui/StatusBadge';
import FormDrawer from '../../components/ui/FormDrawer';

const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: orderRes, isLoading, error } = useGetPurchaseOrderQuery(id);
  const order = orderRes?.data?.order;

  // Mutations
  const [receivePo, { isLoading: isReceiving }] = useReceivePurchaseOrderMutation();

  // Modal / Drawer States
  const [receiveDrawerOpen, setReceiveDrawerOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [remarks, setRemarks] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading purchase order details...</div>;
  }

  if (error || !order) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load purchase order details.
        <br />
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ marginTop: '16px' }}>Back</button>
      </div>
    );
  }

  const handleOpenReceive = () => {
    // Initialise receiveQuantities default to ordered quantities
    const initialQtys = {};
    order.items.forEach((item) => {
      initialQtys[item.materialId?._id] = item.quantity;
    });
    setReceiveQuantities(initialQtys);
    setRemarks('');
    setValidationErrors({});
    setReceiveDrawerOpen(true);
  };

  const handleQtyChange = (materialId, val) => {
    setReceiveQuantities({
      ...receiveQuantities,
      [materialId]: val,
    });
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const itemsPayload = [];
    const errors = {};

    order.items.forEach((item) => {
      const matId = item.materialId?._id;
      const received = Number(receiveQuantities[matId]);

      if (isNaN(received) || received < 0) {
        errors[matId] = 'Must be a non-negative number';
      } else {
        itemsPayload.push({
          materialId: matId,
          quantityReceived: received,
        });
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await receivePo({
        id: order._id,
        items: itemsPayload,
        remarks,
      }).unwrap();
      setReceiveDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Goods receipt operation failed.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/purchases')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Purchase Order: {order.poNumber}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Supplier: <strong>{order.supplierId?.supplierName}</strong>
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusBadge status={order.status} />
          {order.status !== 'received' && order.status !== 'cancelled' && (
            <button
              onClick={handleOpenReceive}
              className="btn btn--primary"
            >
              📥 Receive Goods
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Info Card */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📋 PO Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
              <strong>{order.supplierId?.supplierName}</strong>
            </div>
            {order.supplierId?.contactPerson && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Contact Person:</span>
                <strong>{order.supplierId.contactPerson}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Expected Delivery Date:</span>
              <strong>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
              <strong>₹{order.subTotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Tax (GST):</span>
              <strong>₹{order.taxAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>Grand Total:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: 'var(--text-lg)' }}>₹{order.grandTotal.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Items Card */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📦 Ordered Materials
          </h3>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Material</th>
                  <th style={{ padding: '8px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '8px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div>{item.materialId?.materialName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.materialId?.materialCode}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{item.costPerUnit.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.quantity} {item.materialId?.unit}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      ₹{(item.quantity * item.costPerUnit).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receive Goods Drawer */}
      <FormDrawer
        open={receiveDrawerOpen}
        onClose={() => setReceiveDrawerOpen(false)}
        title="Receive Purchase Order Goods"
        footer={
          <>
            <button onClick={() => setReceiveDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleReceiveSubmit} className="btn btn--primary" disabled={isReceiving}>Record Receipt</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ marginBottom: '16px' }}>{validationErrors.general}</div>}

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Enter the quantity of goods actually received at the warehouse. This will automatically increase raw materials inventory.
        </p>

        {order.items?.map((item) => {
          const matId = item.materialId?._id;
          return (
            <div className="field-group" key={matId}>
              <label className="field-label field-label--required">
                {item.materialId?.materialName} ({item.materialId?.unit})
              </label>
              <input
                type="number"
                className="field-input"
                value={receiveQuantities[matId] !== undefined ? receiveQuantities[matId] : ''}
                onChange={(e) => handleQtyChange(matId, e.target.value)}
                placeholder={`Ordered: ${item.quantity}`}
              />
              {validationErrors[matId] && <span className="field-error">{validationErrors[matId]}</span>}
            </div>
          );
        })}

        <div className="field-group">
          <label className="field-label">Receipt Remarks</label>
          <textarea
            className="field-input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Received full shipment in good condition"
            rows={3}
          />
        </div>
      </FormDrawer>
    </div>
  );
};

export default PurchaseOrderDetailPage;
