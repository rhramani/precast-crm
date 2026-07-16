import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculateSiteRequirementsMutation, useGetSiteQuery } from '../../store/api/projectApi';
import {
  ChevronLeft,
  Boxes,
  FlaskConical,
  Truck,
  Printer,
  Calculator
} from 'lucide-react';
import '../../styles/redesignedPages.css';

const SiteCostBreakdownPage = () => {
  const { id: siteId } = useParams();
  const navigate = useNavigate();

  const { data: siteRes, isLoading: isSiteLoading, error: siteError } = useGetSiteQuery(siteId);
  const site = siteRes?.data?.site;

  const [calculateRequirements, { isLoading }] = useCalculateSiteRequirementsMutation();
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (site && siteId) {
      calculateRequirements({ id: siteId, siteArea: site.siteArea })
        .unwrap()
        .then((res) => {
          setResult({ ...res.data, lengthInMeters: site.siteArea });
        })
        .catch((err) => {
          setErrorMsg(err?.data?.message || 'Failed to calculate costing data.');
        });
    }
  }, [site, siteId, calculateRequirements]);

  if (isSiteLoading || isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ width: 40, height: 40, border: '4px solid rgba(37,99,235,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Loading cost breakdown sheet...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (siteError || errorMsg) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#ef4444', fontWeight: 600 }}>⚠️ Failed to load costing details</div>
        <p style={{ color: '#64748b', marginTop: '8px' }}>{errorMsg || 'Site not found.'}</p>
        <button onClick={() => navigate(-1)} className="btn-premium btn-premium--primary" style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  const calculated = result?.calculated;
  if (!calculated) return null;

  // Calculate section costs for progress overview
  const componentCost = [
    calculated.wallPanels * (calculated.prices?.panel || 0),
    calculated.poles * (calculated.prices?.pole || 0),
    calculated.beams * (calculated.prices?.beam || 0),
    calculated.topBeams * (calculated.prices?.topBeam || 0),
  ].reduce((a, b) => a + b, 0);

  const rawMaterialCost = calculated.rawMaterialCost || 0;
  const laborCost = calculated.laborEstimate?.totalCost || 0;
  const trips = Math.ceil(calculated.wallPanels / 50) || 1;
  const transportCost = trips * (calculated.transportRate ?? 3500);
  const logisticsLaborCost = laborCost + transportCost;

  return (
    <div className="redesign-layout">
      {/* Header */}
      <div className="redesign-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="redesign-header__title-area">
          <button onClick={() => navigate(`/sites/${siteId}/requirement-calculator`)} className="redesign-header__back-btn" style={{ marginBottom: '12px' }}>
            <ChevronLeft size={16} /> Back to Calculator
          </button>
          <h1 className="redesign-header__title">
            <Calculator size={22} style={{ flexShrink: 0 }} />
            Project Cost Costing Sheet
          </h1>
          <p className="redesign-header__subtitle">
            {site ? `Site: ${site.siteName} | Project: ${site.projectId?.projectName || ''}` : ''}
          </p>
        </div>
        
        <button 
          onClick={() => window.print()} 
          className="btn-premium btn-premium--primary print-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px', borderRadius: '12px' }}
        >
          <Printer size={16} /> Print Cost Sheet
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {[
          { label: 'Precast Components', val: componentCost, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Raw Materials', val: rawMaterialCost, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Logistics & Labour', val: logisticsLaborCost, color: '#f59e0b', bg: '#fffbeb' },
        ].map((c, i) => (
          <div key={i} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              ₹{c.val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(c.val / calculated.estimatedCost) * 100}%`, height: '100%', background: c.color, borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {Math.round((c.val / calculated.estimatedCost) * 100) || 0}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Breakdown Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Costing Card */}
        <div className="glass-card--no-hover" style={{ padding: '32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* 1. Component Costs */}
            <div className="cost-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <Boxes size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Precast Components
                </h4>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Wall Panels', qty: calculated.wallPanels, rate: calculated.prices?.panel },
                  { label: 'Poles (Columns/Posts)', qty: calculated.poles, rate: calculated.prices?.pole },
                  { label: 'Beams', qty: calculated.beams, rate: calculated.prices?.beam },
                  { label: 'Top Beams', qty: calculated.topBeams, rate: calculated.prices?.topBeam },
                ].map((c, i) => {
                  const total = c.qty * c.rate;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{c.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {c.qty} pcs @ <span style={{ fontWeight: 500 }}>₹{c.rate.toLocaleString('en-IN')}/pc</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Raw Materials */}
            <div className="cost-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <FlaskConical size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Installation Raw Materials
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {calculated.rawMaterialBreakdown && calculated.rawMaterialBreakdown.length > 0 ? (
                  calculated.rawMaterialBreakdown.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{m.materialName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {m.quantity} {m.unit} @ <span style={{ fontWeight: 500 }}>₹{m.rate.toLocaleString('en-IN')}/{m.unit}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        ₹{m.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontStyle: 'italic', border: '1px dashed #e2e8f0', gridColumn: '1 / -1' }}>
                    No raw materials required.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Logistics & Crew Estimates */}
            <div className="cost-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#fffbeb', color: '#d97706', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <Truck size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3. Logistics & Crew Estimates
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {/* Labour Estimate */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>Installation Crew Labour</span>
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                        {calculated.installationDays} days
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                      {calculated.laborEstimate?.composition || `crew of ${calculated.laborEstimate?.crewSize || 4}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    ₹{(calculated.laborEstimate?.totalCost || (calculated.installationDays * 4 * 800)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Transport Estimate */}
                {(() => {
                  const transportCost = trips * (calculated.transportRate ?? 3500);
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>Logistics Transport</span>
                          <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            {trips} trips
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          Estimated transport rate: <span style={{ fontWeight: 500 }}>₹{(calculated.transportRate ?? 3500).toLocaleString('en-IN')}/trip</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        ₹{transportCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Summation Total Footer Banner */}
            <div style={{
              padding: '24px 32px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
              marginTop: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Estimated Project Cost
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>
                  Includes all precast units, structural raw materials, labour crews, and logistics trips.
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                ₹{calculated.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .redesign-header__back-btn,
          .print-btn,
          aside,
          nav,
          header,
          .app-header,
          .app-sidebar,
          .layout-header,
          .sidebar-container,
          .app-shell__sidebar,
          .app-shell__header {
            display: none !important;
          }
          body, .redesign-layout {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .glass-card--no-hover {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .cost-section {
            page-break-inside: avoid;
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default SiteCostBreakdownPage;
