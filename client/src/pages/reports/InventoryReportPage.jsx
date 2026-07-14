import { useNavigate } from 'react-router-dom';
import { useGetInventoryReportQuery } from '../../store/api/reportApi';

const InventoryReportPage = () => {
  const navigate = useNavigate();
  const { data: invRes, isLoading } = useGetInventoryReportQuery();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading materials valuation...</div>;
  }

  const rawMaterials = invRes?.data?.rawMaterials;
  const finishedGoods = invRes?.data?.finishedGoods;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/reports')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Reports
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Inventory & Valuations Audit
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Real-time balance values for raw items inventory and casted finished products.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Raw Materials Info */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            🪨 Raw Materials Valuation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Unique Raw Items:</span>
              <strong>{rawMaterials?.totalItems || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Value:</span>
              <strong>₹{rawMaterials?.valuation?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: rawMaterials?.lowStockAlerts > 0 ? 'var(--color-danger)' : 'inherit' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Low Stock Alerts:</span>
              <strong style={{ color: rawMaterials?.lowStockAlerts > 0 ? 'var(--color-danger)' : 'inherit' }}>
                {rawMaterials?.lowStockAlerts || 0} items
              </strong>
            </div>
          </div>
        </div>

        {/* Finished Goods Info */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            ✅ Finished Goods Valuation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Unique Cast Designs:</span>
              <strong>{finishedGoods?.totalItems || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Casting Valuation:</span>
              <strong>₹{finishedGoods?.valuation?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Finished Goods Table */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
          📦 Finished Products Stock List
        </h3>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Product</th>
                <th style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>Product Code</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Available</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Dispatch Ready</th>
                <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Reserved</th>
              </tr>
            </thead>
            <tbody>
              {finishedGoods?.items?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No items casted yet.
                  </td>
                </tr>
              ) : (
                finishedGoods?.items?.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 0' }}>{it.productName}</td>
                    <td style={{ padding: '12px' }}>{it.productCode}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{it.available?.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{it.dispatchReady?.toLocaleString()}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>{it.reserved?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryReportPage;
