import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculateSiteRequirementsMutation, useGetSiteQuery } from '../../store/api/projectApi';
import { useGetFinishedGoodsInventoryQuery } from '../../store/api/inventoryApi';
import {
  Layers,
  Cpu,
  Truck,
  Boxes,
  ClipboardList,
  Compass,
  ChevronLeft,
  Ruler,
  FlaskConical,
  BarChart3,
  X,
} from 'lucide-react';
import '../../styles/redesignedPages.css';

const SiteRequirementCalculatorPage = () => {
  const { id: siteId } = useParams();
  const navigate = useNavigate();

  const [siteArea, setSiteArea] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { data: siteRes } = useGetSiteQuery(siteId);
  const site = siteRes?.data?.site;

  const [calculateRequirements, { isLoading }] = useCalculateSiteRequirementsMutation();

  useEffect(() => {
    if (site && site.siteArea && !result && !errorMsg) {
      setSiteArea(site.siteArea);
      calculateRequirements({ id: siteId, siteArea: site.siteArea })
        .unwrap()
        .then((res) => {
          setResult({ ...res.data, lengthInMeters: res.data.calculated?.lengthInMeters });
        })
        .catch((err) => {
          setErrorMsg(err?.data?.message || 'Calculation operation failed.');
        });
    }
  }, [site, siteId, calculateRequirements]);
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

    try {
      const res = await calculateRequirements({ id: siteId, siteArea: inputVal }).unwrap();
      setResult({
        ...res.data,
        inputSqft: inputVal,
        lengthInMeters: res.data.calculated?.lengthInMeters
      });
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Calculation operation failed.');
    }
  };

  const calculated = result?.calculated;

  const loggedTrips = calculated?.transportTrips || 0;
  const transportRate = calculated?.transportRate || 3500;
  const transportCost = calculated?.transportCost || (loggedTrips * transportRate);

  const loggedLabourDays = calculated?.labourManDays ?? calculated?.labour ?? 0;
  const actualLaborCost = calculated?.actualLaborCost || 0;
  const logisticsLaborCost = calculated?.logisticsLaborCost || (transportCost + actualLaborCost);

  const componentCost = [
    (calculated?.wallPanels || 0) * (calculated?.prices?.panel || 0),
    (calculated?.poles || 0) * (calculated?.prices?.pole || 0),
    (calculated?.beams || 0) * (calculated?.prices?.beam || 0),
    (calculated?.topBeams || 0) * (calculated?.prices?.topBeam || 0),
  ].reduce((a, b) => a + b, 0);

  const rawMaterialCost = calculated?.rawMaterialCost || 0;
  const totalSiteCost = componentCost + rawMaterialCost + logisticsLaborCost;

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
    const pct = required > 0 ? Math.min(100, Math.round((inStock / required) * 100)) : 100;
    return (
      <div className="stock-progress-group">
        <div className="stock-progress-labels">
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{label}</span>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            <strong style={{ color: '#1e293b' }}>{inStock}</strong> available of{' '}
            <strong style={{ color: '#1e293b' }}>{required}</strong> needed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stock-progress-bar-container" style={{ flex: 1 }}>
            <div
              className={`stock-progress-bar-fill ${shortfall > 0 ? 'stock-progress-bar-fill--shortfall' : 'stock-progress-bar-fill--sufficient'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`stock-gap-badge ${shortfall > 0 ? 'stock-gap-badge--shortfall' : 'stock-gap-badge--sufficient'}`}
            style={{ minWidth: '100px', textAlign: 'center' }}>
            {shortfall > 0 ? `Produce ${shortfall}` : '✓ Sufficient'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="redesign-layout">

      {/* ── Header ── */}
      <div className="redesign-header">
        <button onClick={() => navigate(-1)} className="redesign-header__back-btn">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="redesign-header__title-area">
          <h1 className="redesign-header__title">
            <Compass size={22} style={{ flexShrink: 0 }} />
            Site Requirement Calculator
          </h1>
          <p className="redesign-header__subtitle">
            {site ? `Site: ${site.siteName} | Project: ${site.projectId?.projectName || ''}` : 'Enter site dimensions to auto-calculate precast elements, raw materials, labour, and logistics required.'}
          </p>
        </div>
      </div>

      {/* ── Input Card ── */}
      <div className="glass-card--no-hover">
        {/* Form */}
        <form onSubmit={handleCalculate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Site Area (Square Feet)
              <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>
            </label>
            <input
              type="number"
              className="input-field-redesign"
              value={siteArea}
              onChange={(e) => setSiteArea(e.target.value)}
              placeholder="e.g. 2500"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn-premium btn-premium--primary"
            style={{ height: '46px', minWidth: '200px', fontSize: '14px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--color-text-inverse)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Calculating...
              </>
            ) : (
              <><BarChart3 size={16} /> Compute Requirements</>
            )}
          </button>
        </form>

        {errorMsg && (
          <div style={{
            marginTop: '16px', padding: '12px 16px', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(220, 38, 38, 0.15)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)',
          }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {calculated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.4s ease' }}>

          {/* Cost Banner */}
          <div className="cost-gradient-banner" onClick={() => navigate(`/sites/${siteId}/cost-breakdown`)} title="Click to view detailed costing sheet">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="cost-gradient-banner__label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Calculated Project Cost (Components + Logistics + Labour)
                <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '10px', color: '#fff', textTransform: 'none', fontWeight: 500 }}>
                  🔍 Click to view costing sheet
                </span>
              </div>
              <h1 className="cost-gradient-banner__value">
                ₹{(totalSiteCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h1>
            </div>
             <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Wall Area
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'var(--font-bold)', color: 'var(--color-text-inverse)', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {result.inputSqft || result.siteArea} SQFT
              </div>
            </div>
          </div>

          {/* 3-Column Color-Coded Results Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

            {/* Precast Elements — Blue */}
            <div className="calc-result-card calc-result-card--blue">
              <div className="calc-result-card__header">
                <div className="calc-result-card__icon">
                  <Boxes size={18} />
                </div>
                <div className="calc-result-card__title">Precast Elements Required</div>
              </div>
              {[
                { label: 'Wall Panels (Slabs)', val: `${calculated.wallPanels} pcs`, price: calculated.prices?.panel },
                { label: 'Poles (Columns/Posts)', val: `${calculated.poles} pcs`, price: calculated.prices?.pole },
                { label: 'Beams', val: `${calculated.beams} pcs`, price: calculated.prices?.beam },
                { label: 'Top Beams', val: `${calculated.topBeams} pcs`, price: calculated.prices?.topBeam },
              ].map((item, i) => (
                <div key={i} className="calc-result-card__row" style={{ minHeight: '44px' }}>
                  <span className="calc-result-card__row-label">{item.label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span className="calc-result-card__row-value" style={{ display: 'block' }}>{item.val}</span>
                    {item.price > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                        @ ₹{item.price}/pc
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

             {/* Raw Materials — Purple */}
             <div className="calc-result-card calc-result-card--purple">
               <div className="calc-result-card__header">
                 <div className="calc-result-card__icon">
                   <FlaskConical size={18} />
                 </div>
                 <div className="calc-result-card__title">Raw Materials Required</div>
               </div>
               {calculated.rawMaterialBreakdown && calculated.rawMaterialBreakdown.length > 0 ? (
                 calculated.rawMaterialBreakdown.map((item, i) => (
                   <div key={i} className="calc-result-card__row" style={{ minHeight: '44px' }}>
                     <span className="calc-result-card__row-label">{item.materialName}</span>
                     <div style={{ textAlign: 'right' }}>
                       <span className="calc-result-card__row-value" style={{ display: 'block' }}>
                         {item.quantity} {item.unit}
                       </span>
                       {item.rate > 0 && (
                         <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                           @ ₹{item.rate}/{item.unit}
                         </span>
                       )}
                     </div>
                   </div>
                 ))
               ) : (
                 [
                   { label: 'Cement', val: `${calculated.cement} bags` },
                   { label: 'Reinforcement Steel', val: `${calculated.steel} kg` },
                   { label: 'Aggregate & Sand', val: `${calculated.aggregate} kg` },
                 ].map((item, i) => (
                   <div key={i} className="calc-result-card__row">
                     <span className="calc-result-card__row-label">{item.label}</span>
                     <span className="calc-result-card__row-value">{item.val}</span>
                   </div>
                 ))
               )}
              </div>

            {/* Logistics & Crew — Amber */}
            <div className="calc-result-card calc-result-card--amber">
              <div className="calc-result-card__header">
                <div className="calc-result-card__icon">
                  <Truck size={18} />
                </div>
                <div className="calc-result-card__title">Logistics & Crew (From Dispatch & Labour)</div>
              </div>

              {[
                {
                  label: 'Logistics Transport Trips',
                  val: `${loggedTrips} trips logged`,
                  sub: loggedTrips > 0
                    ? `${calculated.dispatchesBreakdown?.length || 0} dispatch challans logged from Dispatch tab (Total Freight: ₹${(calculated.transportCost || 0).toLocaleString('en-IN')})`
                    : 'No dispatches logged in Dispatch tab yet'
                },
                {
                  label: 'Crew Labour Area Allocated',
                  val: `${(calculated.labourBreakdown && calculated.labourBreakdown.length > 0) ? (calculated.labourBreakdown[0]?.sqftAllocated || Math.round((result.inputSqft || result.siteArea || 0) / calculated.labourBreakdown.length)).toLocaleString('en-IN') : (result.inputSqft || result.siteArea || 0).toLocaleString('en-IN')} sqft/worker`,
                  sub: calculated.labourBreakdown?.length > 0
                    ? `${calculated.labourBreakdown.length} active workers assigned (${(result.inputSqft || result.siteArea || 0).toLocaleString('en-IN')} SQFT total)`
                    : 'No labourers assigned to this site yet'
                },
                {
                  label: 'Logged Logistics & Labour Cost',
                  val: `₹${logisticsLaborCost.toLocaleString('en-IN')}`,
                  highlight: true
                }
              ].map((item, i) => (
                <div key={i} className="calc-result-card__row" style={{ minHeight: '44px' }}>
                  <span className="calc-result-card__row-label">{item.label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span className="calc-result-card__row-value" style={{ display: 'block', color: item.highlight ? 'var(--color-warning-dark)' : 'inherit', fontWeight: item.highlight ? 700 : 'inherit' }}>
                      {item.val}
                    </span>
                    {item.sub && (
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                        {item.sub}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {calculated.labourBreakdown && calculated.labourBreakdown.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px dashed var(--color-border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>Labourers Logged Details (SQFT Basis)</div>
                  {calculated.labourBreakdown.map((l, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        {l.labourName} ({l.labourType.toUpperCase().replace('_', ' ')})
                        <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: '11px', marginLeft: '6px' }}>
                          @ ₹{(l.ratePerSqft || l.dailyWages || 13).toLocaleString('en-IN')}/sqft
                        </span>
                      </span>
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        {(l.sqftAllocated || l.daysLogged).toLocaleString('en-IN')} sqft (₹{(l.totalCost || 0).toLocaleString('en-IN')})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {calculated.dispatchesBreakdown && calculated.dispatchesBreakdown.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px dashed var(--color-border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>Dispatch Challans Logged</div>
                  {calculated.dispatchesBreakdown.map((d, idx) => {
                    const isValidDate = d.dispatchDate && !isNaN(new Date(d.dispatchDate).getTime());
                    const dateFormatted = isValidDate
                      ? new Date(d.dispatchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—';
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '6px 0', borderBottom: idx < calculated.dispatchesBreakdown.length - 1 ? '1px dashed var(--color-border)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Challan: #{d.challanNumber || '—'}</span>
                          <span style={{ color: '#d97706', fontWeight: 600, fontSize: '11px' }}>
                            Freight: ₹{(d.transportCost || 3500).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          <span>Veh: {d.vehicleNumber || '—'} ({d.driverName || '—'}) · {dateFormatted}</span>
                          <span style={{
                            textTransform: 'capitalize',
                            fontWeight: 600,
                            color: d.status === 'delivered' ? 'var(--color-success)' : d.status === 'dispatched' ? 'var(--color-info)' : 'var(--color-warning)'
                          }}>{d.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Stock vs Requirement Comparison ── */}
          <div className="glass-card--no-hover" style={{ borderTop: '3px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                background: 'var(--color-info-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ClipboardList size={17} color="var(--color-info)" />
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary-dark)' }}>
                Finished Goods Stock vs Site Requirement
              </h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 22px 44px', lineHeight: 1.6 }}>
              Compare what's needed vs what's currently available in finished goods inventory.
              If stock is insufficient, start a production order.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <StockGapRow label="Wall Panels / Slabs" required={calculated.wallPanels || 0} inStock={fgMap.panels || 0} />
              <StockGapRow label="Poles / Columns"    required={calculated.poles || 0}     inStock={fgMap.poles || 0} />
              <StockGapRow label="Beams"              required={calculated.beams || 0}     inStock={fgMap.beams || 0} />
              <StockGapRow label="Top Beams"          required={calculated.topBeams || 0}  inStock={fgMap.topBeams || 0} />
            </div>

            <div className="stock-insight-footer">
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>
                💡 If stock is insufficient, go to <strong>Production Orders</strong> to plan manufacturing.
              </div>
              <button
                onClick={() => navigate('/production')}
                className="btn-premium btn-premium--primary"
                style={{ fontSize: '13px', padding: '9px 18px' }}
              >
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
