import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculateSiteRequirementsMutation } from '../../store/api/projectApi';
import { useGetFinishedGoodsInventoryQuery } from '../../store/api/inventoryApi';

// Standard precast boundary wall conversion factors:
// 1 linear meter of wall requires:
//   Panels: 1m / 0.6m panel width = ~1.67 panels
//   Poles: every 1.2m = 0.83 poles
//   SQFT conversion: 1 sqft = 0.0929 sqm; typical wall height ~1.8m → length = sqft/(height_m*3.28)

const SiteRequirementCalculatorPage = () => {
  const { id: siteId } = useParams();
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState('meters'); // 'meters' | 'sqft'
  const [siteArea, setSiteArea] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [calculateRequirements, { isLoading }] = useCalculateSiteRequirementsMutation();
  const { data: fgInvRes } = useGetFinishedGoodsInventoryQuery();
  const fgItems = fgInvRes?.data?.items || [];

  const handleCalculate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    const inputVal = Number(siteArea);
    if (!siteArea || isNaN(inputVal) || inputVal <= 0) {
      setErrorMsg('Please enter a valid value greater than 0');
      return;
    }

    // Convert SQFT to meters (assuming standard 6-foot / 1.83m wall height)
    const wallHeight = 1.83; // meters
    const lengthInMeters = inputMode === 'sqft'
      ? (inputVal * 0.0929) / wallHeight  // sqft → sqm → length
      : inputVal;

    try {
      const res = await calculateRequirements({ id: siteId, siteArea: lengthInMeters }).unwrap();
      setResult({ ...res.data, inputSqft: inputMode === 'sqft' ? inputVal : null, lengthInMeters });
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Calculation operation failed.');
    }
  };

  const calculated = result?.calculated;

  // Build stock comparison map from finished goods
  const fgMap = {};
  fgItems.forEach(item => {
    const name = item.productName?.toLowerCase() || '';
    if (name.includes('panel') || name.includes('slab') || name.includes('wall')) {
      fgMap.panels = (fgMap.panels || 0) + (item.availableStock || 0);
    }
    if (name.includes('pole') || name.includes('post') || name.includes('column')) {
      fgMap.poles = (fgMap.poles || 0) + (item.availableStock || 0);
    }
    if (name.includes('beam') && !name.includes('top')) {
      fgMap.beams = (fgMap.beams || 0) + (item.availableStock || 0);
    }
    if (name.includes('top beam')) {
      fgMap.topBeams = (fgMap.topBeams || 0) + (item.availableStock || 0);
    }
  });

  const StockGapRow = ({ label, required, inStock }) => {
    const shortfall = Math.max(0, required - inStock);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span>{required} pcs needed</span>
        <span style={{ color: inStock >= required ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
          {inStock} in stock
        </span>
        <span style={{
          background: shortfall > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          color: shortfall > 0 ? 'var(--color-danger)' : 'var(--color-success)',
          padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textAlign: 'center',
        }}>
          {shortfall > 0 ? `⚠ Produce ${shortfall} more` : '✓ Sufficient'}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} className="btn btn--secondary" style={{ padding: '6px 12px' }}>
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Site Requirement Calculator
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Enter site dimensions to auto-calculate precast elements, raw materials, labour, and logistics required.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>

        {/* Input Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: '4px' }}>
            Input Mode:
          </span>
          {['meters', 'sqft'].map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => { setInputMode(mode); setSiteArea(''); setResult(null); }}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                background: inputMode === mode ? 'var(--color-primary)' : 'var(--color-surface)',
                color: inputMode === mode ? '#fff' : 'var(--color-text-primary)',
                fontWeight: inputMode === mode ? 700 : 400,
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                transition: 'all 0.2s',
              }}
            >
              {mode === 'meters' ? '📏 Linear Meters' : '📐 Square Feet (SQFT)'}
            </button>
          ))}
        </div>

        <form onSubmit={handleCalculate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field-group" style={{ maxWidth: '300px', flex: 1 }}>
            <label className="field-label field-label--required">
              {inputMode === 'meters' ? 'Boundary Wall Length (Meters)' : 'Site Area (Square Feet)'}
            </label>
            <input
              type="number"
              className="field-input"
              value={siteArea}
              onChange={(e) => setSiteArea(e.target.value)}
              placeholder={inputMode === 'meters' ? 'e.g. 150' : 'e.g. 2500'}
              disabled={isLoading}
            />
            {inputMode === 'sqft' && siteArea && !isNaN(Number(siteArea)) && Number(siteArea) > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                ≈ {((Number(siteArea) * 0.0929) / 1.83).toFixed(1)} meters of wall length (assuming 6ft wall height)
              </div>
            )}
          </div>
          <button
            type="submit"
            className="btn btn--primary"
            style={{ height: '38px', minWidth: '160px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Calculating...' : '🔢 Compute Requirements'}
          </button>
        </form>

        {errorMsg && (
          <div className="field-error" style={{ marginTop: '16px', display: 'block' }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Results */}
      {calculated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Estimated Cost Banner */}
          <div className="card" style={{
            background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', borderLeft: '5px solid var(--color-accent)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Estimated Project Cost (Components + Logistics + Labour)
              </span>
              <h1 style={{ color: 'var(--color-accent)', margin: '4px 0 0 0', fontSize: '2rem' }}>
                ₹{calculated.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {result.inputSqft ? `Input: ${result.inputSqft} SQFT` : `Wall Length:`}
              </span>
              <h3 style={{ margin: 0 }}>
                {result.inputSqft ? `≈ ${result.lengthInMeters?.toFixed(1)} m` : `${result.siteArea} meters`}
              </h3>
            </div>
          </div>

          {/* Detailed Requirements Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

            {/* Precast Elements */}
            <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                🧱 Precast Elements Required
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Wall Panels (Slabs)', val: calculated.wallPanels },
                  { label: 'Poles (Columns/Posts)', val: calculated.poles },
                  { label: 'Beams', val: calculated.beams },
                  { label: 'Top Beams', val: calculated.topBeams },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{item.val} pcs</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Materials */}
            <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                🪵 Raw Materials Required
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Cement', val: `${calculated.cement} bags` },
                  { label: 'Reinforcement Steel', val: `${calculated.steel} kg` },
                  { label: 'Aggregate & Sand', val: `${calculated.aggregate} kg` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <strong>{item.val}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Crew */}
            <div className="card" style={{ background: 'var(--color-surface)', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                🚛 Logistics & Crew
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Labour Required', val: `${calculated.labour} man-days` },
                  { label: 'Installation Duration', val: `${calculated.installationDays} days` },
                  { label: 'Transport Trips (Flatbeds)', val: `${calculated.transportTrips} trips` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <strong>{item.val}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stock vs Requirement Comparison ── */}
          <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderTop: '3px solid var(--color-primary)' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>📦 Finished Goods Stock vs Site Requirement</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 16px 0' }}>
              Compare what's needed vs what's currently available in your finished goods inventory. If stock is insufficient, you need to start a production order.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px 0', borderBottom: '2px solid var(--color-border)', marginBottom: '4px' }}>
              <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Product</strong>
              <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Site Needs</strong>
              <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>In Stock</strong>
              <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Status</strong>
            </div>

            <StockGapRow label="Wall Panels / Slabs" required={calculated.wallPanels || 0} inStock={fgMap.panels || 0} />
            <StockGapRow label="Poles / Columns" required={calculated.poles || 0} inStock={fgMap.poles || 0} />
            <StockGapRow label="Beams" required={calculated.beams || 0} inStock={fgMap.beams || 0} />
            <StockGapRow label="Top Beams" required={calculated.topBeams || 0} inStock={fgMap.topBeams || 0} />

            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--color-surface-hover)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                💡 If stock is insufficient, go to <strong>Production Orders</strong> to plan manufacturing.
              </div>
              <button onClick={() => navigate('/production')} className="btn btn--primary" style={{ fontSize: '13px' }}>
                🏭 Go to Production Planning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteRequirementCalculatorPage;
