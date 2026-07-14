import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGetProductsQuery } from '../../store/api/productApi';
import { useCalculateCapacityMutation } from '../../store/api/productionApi';

const CapacityCalculatorPage = () => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch products
  const { data: productsRes, isLoading: isProductsLoading } = useGetProductsQuery({ limit: 100 });
  const products = productsRes?.data?.products || [];

  // Mutation
  const [calculateCapacity, { isLoading: isCalculating }] = useCalculateCapacityMutation();

  const handleCalculate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    if (!selectedProductId) {
      setErrorMsg('Please select a product to calculate capacity');
      return;
    }

    try {
      const res = await calculateCapacity({
        productId: selectedProductId,
        targetQuantity: Number(targetQuantity || 0),
      }).unwrap();
      setResult(res.data);
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Calculation failed. Make sure product has an active BOM.');
    }
  };

  const productDetails = products.find((p) => p._id === selectedProductId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Routing Tabs */}
      <div className="navigation-tabs">
        <NavLink
          end
          to="/production"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          🏭 Production Orders
        </NavLink>
        <NavLink
          to="/production/capacity-calculator"
          className={({ isActive }) => `navigation-tab ${isActive ? 'navigation-tab--active' : ''}`}
        >
          🧮 Capacity Calculator
        </NavLink>
      </div>

      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 4px 0' }}>
          Production Capacity Calculator
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
          Determine the maximum quantity of products you can produce based on current raw material inventory levels.
        </p>
      </div>

      {/* Input panel */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <form onSubmit={handleCalculate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field-group" style={{ minWidth: '240px', flex: 1 }}>
            <label className="field-label field-label--required">Select Product</label>
            <select
              className="field-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isProductsLoading || isCalculating}
            >
              <option value="">Choose product...</option>
              {products
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.productName} ({p.productCode})
                  </option>
                ))}
            </select>
          </div>

          <div className="field-group" style={{ maxWidth: '180px' }}>
            <label className="field-label">Target Quantity (Optional)</label>
            <input
              type="number"
              className="field-input"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
              placeholder="e.g. 500"
              disabled={isCalculating}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ height: '38px' }}
            disabled={isCalculating}
          >
            {isCalculating ? 'Computing...' : 'Calculate Capacity'}
          </button>
        </form>

        {errorMsg && (
          <div className="field-error" style={{ marginTop: '16px', display: 'block' }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Results output panel */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI summaries */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-success)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Maximum Producible Qty
              </div>
              <h2 style={{ color: 'var(--color-success)', margin: 0 }}>
                {result.maxQuantity} {productDetails?.unit || 'units'}
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Limited by current branch raw material stock levels.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Estimated Cost per Unit
              </div>
              <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>
                ₹{result.costPerUnit?.toFixed(2)}
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Aggregated from raw material purchase rates.
              </p>
            </div>

            {result.limitingMaterial && (
              <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-danger)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Limiting Factor / Bottleneck
                </div>
                <h3 style={{ color: 'var(--color-danger)', margin: 0 }}>
                  {result.limitingMaterial.materialName}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                  Stock available: <strong>{result.limitingMaterial.available}</strong>. Requires <strong>{result.limitingMaterial.neededPerUnit?.toFixed(3)}</strong> per unit.
                </p>
              </div>
            )}
          </div>

          {/* Raw Materials Shortages Report table */}
          <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ marginBottom: '16px' }}>BOM Material Stock Analysis</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr className="data-table__head">
                    <th className="data-table__th">Material Code</th>
                    <th className="data-table__th">Material Name</th>
                    <th className="data-table__th">Available Stock</th>
                    <th className="data-table__th">Required / Unit</th>
                    {targetQuantity > 0 && <th className="data-table__th">Needed for Target ({targetQuantity})</th>}
                    {targetQuantity > 0 && <th className="data-table__th">Shortage</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.materials?.map((m) => {
                    const isLimiting = result.limitingMaterial?.materialId === m.materialId;
                    const hasShortage = m.shortageForTarget > 0;
                    return (
                      <tr key={m.materialId} className={`data-table__row ${isLimiting ? 'stock-warning-row' : ''}`} style={isLimiting ? { background: 'var(--color-danger-light)' } : undefined}>
                        <td className="data-table__td">
                          {m.materialCode} {isLimiting && <span style={{ color: 'var(--color-danger)', fontSize: '10px', marginLeft: '4px' }}>(Limiting)</span>}
                        </td>
                        <td className="data-table__td">{m.materialName}</td>
                        <td className="data-table__td">{m.availableStock} {m.unit}</td>
                        <td className="data-table__td">{m.requiredPerUnit?.toFixed(3)} {m.unit}</td>
                        {targetQuantity > 0 && <td className="data-table__td">{m.requiredTotalForTarget?.toFixed(2)} {m.unit}</td>}
                        {targetQuantity > 0 && (
                          <td className={`data-table__td ${hasShortage ? 'stock-warning-text' : ''}`} style={{ fontWeight: hasShortage ? 'bold' : 'normal' }}>
                            {hasShortage ? `${m.shortageForTarget?.toFixed(2)} ${m.unit}` : '0 (OK)'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityCalculatorPage;
