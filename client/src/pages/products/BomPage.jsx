import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetActiveBomQuery,
  useGetBomHistoryQuery,
  useCreateBomMutation,
  useUpdateBomMutation,
  useCalculateRawCostMutation,
} from '../../store/api/bomApi';
import { useGetRawMaterialsQuery } from '../../store/api/rawMaterialApi';
import { useGetProductQuery } from '../../store/api/productApi';
import DataTable from '../../components/ui/DataTable';

const BomPage = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: productRes } = useGetProductQuery(productId);
  const { data: activeBomRes, isLoading: isActiveLoading } = useGetActiveBomQuery(productId);
  const { data: historyRes } = useGetBomHistoryQuery(productId);
  const { data: rawMaterialsRes } = useGetRawMaterialsQuery({ limit: 100 });

  const product = productRes?.data?.product;
  const activeBom = activeBomRes?.data?.bom;
  const bomVersions = historyRes?.data?.boms || [];
  const rawMaterials = rawMaterialsRes?.data?.materials || [];

  // Mutations
  const [createBom, { isLoading: isCreating }] = useCreateBomMutation();
  const [updateBom] = useUpdateBomMutation();
  const [calculateRawCost] = useCalculateRawCostMutation();

  // BOM Building Staging States
  const [items, setItems] = useState([]); // Array of { materialId, quantityRequired, unit, wastagePercent, materialName, materialCode }
  const [stageItem, setStageItem] = useState({
    materialId: '',
    quantityRequired: '',
    wastagePercent: 0,
  });
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStageChange = (e) => {
    setStageItem((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddStageItem = async () => {
    setErrorMsg('');
    if (!stageItem.materialId) {
      setErrorMsg('Please select a raw material');
      return;
    }
    const qty = Number(stageItem.quantityRequired);
    if (!stageItem.quantityRequired || isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid quantity required');
      return;
    }

    const material = rawMaterials.find((m) => m._id === stageItem.materialId);
    if (!material) return;

    // Check duplicate
    if (items.some((it) => it.materialId === material._id)) {
      setErrorMsg('This raw material is already added to the BOM');
      return;
    }

    const newItem = {
      materialId: material._id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      quantityRequired: qty,
      unit: material.unit,
      wastagePercent: Number(stageItem.wastagePercent || 0),
    };

    const nextItems = [...items, newItem];
    setItems(nextItems);

    // Reset inputs
    setStageItem({ materialId: '', quantityRequired: '', wastagePercent: 0 });

    // Recalculate cost
    try {
      const costRes = await calculateRawCost({ items: nextItems }).unwrap();
      setEstimatedCost(costRes?.data?.calculatedCost || 0);
    } catch {
      // Fail silently or keep cost unchanged
    }
  };

  const handleRemoveItem = async (index) => {
    const nextItems = items.filter((_, idx) => idx !== index);
    setItems(nextItems);

    try {
      const costRes = await calculateRawCost({ items: nextItems }).unwrap();
      setEstimatedCost(costRes?.data?.calculatedCost || 0);
    } catch {
      // Fallback
    }
  };

  const handleStartBuilding = () => {
    setIsBuilding(true);
    if (activeBom) {
      // Map active BOM to staging list
      const mapped = activeBom.items.map((it) => ({
        materialId: it.materialId?._id || it.materialId,
        materialCode: it.materialId?.materialCode || '',
        materialName: it.materialId?.materialName || '',
        quantityRequired: it.quantityRequired,
        unit: it.unit,
        wastagePercent: it.wastagePercent || 0,
      }));
      setItems(mapped);
      setEstimatedCost(activeBom.calculatedCost || 0);
    } else {
      setItems([]);
      setEstimatedCost(0);
    }
    setErrorMsg('');
  };

  const handleSaveBom = async () => {
    if (items.length === 0) {
      setErrorMsg('BOM must contain at least one item');
      return;
    }

    try {
      await createBom({
        productId,
        items: items.map((it) => ({
          materialId: it.materialId,
          quantityRequired: it.quantityRequired,
          unit: it.unit,
          wastagePercent: it.wastagePercent,
        })),
        isActive: true,
      }).unwrap();
      setIsBuilding(false);
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to save BOM version');
    }
  };

  const handleMakeActive = async (bomId) => {
    try {
      await updateBom({ id: bomId, productId, isActive: true }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to activate BOM version');
    }
  };

  const activeColumns = [
    { key: 'materialCode', label: 'Code', render: (_, row) => row.materialId?.materialCode || '—' },
    { key: 'materialName', label: 'Material Name', render: (_, row) => row.materialId?.materialName || '—' },
    { key: 'quantityRequired', label: 'Quantity Required', render: (val, row) => `${val} ${row.unit}` },
    { key: 'wastagePercent', label: 'Wastage Allowed', render: (val) => `${val}%` },
    {
      key: 'cost',
      label: 'Purchase Cost (Est)',
      render: (_, row) => {
        const rate = row.materialId?.purchaseRate || 0;
        const totalQty = row.quantityRequired * (1 + (row.wastagePercent || 0) / 100);
        return `₹${(totalQty * rate).toFixed(2)}`;
      },
    },
  ];

  const historyColumns = [
    { key: 'version', label: 'Version', render: (val) => `v${val}` },
    { key: 'calculatedCost', label: 'Est cost per Unit', render: (val) => `₹${val.toFixed(2)}` },
    {
      key: 'isActive',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {val ? (
            <span className="badge badge--success">Active</span>
          ) : (
            <>
              <span className="badge badge--grey">Inactive</span>
              <button
                onClick={() => handleMakeActive(row._id)}
                className="btn btn--secondary btn--sm"
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                Activate
              </button>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (val) => val?.name || 'System',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/products')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Products
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Bill of Materials (BOM)
          </h1>
          {product && (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
              Product: <strong>{product.productName} ({product.productCode})</strong>
            </p>
          )}
        </div>
      </div>

      {isBuilding ? (
        // BOM Builder Staging Mode
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ marginBottom: '16px' }}>Drafting New BOM Version</h3>

          {errorMsg && (
            <div className="field-error" style={{ marginBottom: '16px', display: 'block' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Staging Fields */}
          <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div className="field-group">
              <label className="field-label">Select Raw Material</label>
              <select
                name="materialId"
                className="field-select"
                value={stageItem.materialId}
                onChange={handleStageChange}
              >
                <option value="">Choose material...</option>
                {rawMaterials.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.materialName} ({m.materialCode}) - In Stock: {m.currentQuantity} {m.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Qty Required</label>
              <input
                name="quantityRequired"
                type="number"
                className="field-input"
                value={stageItem.quantityRequired}
                onChange={handleStageChange}
                placeholder="e.g. 5.5"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Wastage %</label>
              <input
                name="wastagePercent"
                type="number"
                className="field-input"
                value={stageItem.wastagePercent}
                onChange={handleStageChange}
                placeholder="e.g. 5"
              />
            </div>
            <button onClick={handleAddStageItem} className="btn btn--secondary" style={{ height: '38px' }}>
              + Add Item
            </button>
          </div>

          {/* Draft List */}
          <div className="table-responsive" style={{ marginBottom: '24px' }}>
            <table className="data-table">
              <thead>
                <tr className="data-table__head">
                  <th className="data-table__th">Material Code</th>
                  <th className="data-table__th">Material Name</th>
                  <th className="data-table__th">Qty Required</th>
                  <th className="data-table__th">Wastage %</th>
                  <th className="data-table__th">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)' }}>
                      No materials added to this BOM version yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="data-table__row">
                      <td className="data-table__td">{item.materialCode}</td>
                      <td className="data-table__td">{item.materialName}</td>
                      <td className="data-table__td">{item.quantityRequired} {item.unit}</td>
                      <td className="data-table__td">{item.wastagePercent}%</td>
                      <td className="data-table__td">
                        <button onClick={() => handleRemoveItem(idx)} className="btn btn--danger btn--sm">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Estimated Material Cost:</span>
              <h2 style={{ color: 'var(--color-accent)', margin: 0 }}>₹{estimatedCost.toFixed(2)}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setIsBuilding(false)} className="btn btn--secondary" disabled={isCreating}>
                Discard Draft
              </button>
              <button onClick={handleSaveBom} className="btn btn--primary" disabled={isCreating}>
                {isCreating ? 'Saving...' : 'Save BOM Version'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Normal View
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active BOM Card */}
          <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Active BOM Configuration</h3>
                {activeBom && <span className="badge badge--primary" style={{ marginTop: '4px' }}>Version v{activeBom.version}</span>}
              </div>
              <button onClick={handleStartBuilding} className="btn btn--primary">
                {activeBom ? 'Edit / Version BOM' : 'Create BOM'}
              </button>
            </div>

            {isActiveLoading ? (
              <div className="data-table__spinner" />
            ) : !activeBom ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-secondary)' }}>
                No bill of materials defined for this product yet.
              </div>
            ) : (
              <div>
                <DataTable
                  columns={activeColumns}
                  data={activeBom.items}
                  limit={100}
                  onPageChange={() => {}}
                  onLimitChange={() => {}}
                  total={activeBom.items.length}
                />
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', fontSize: 'var(--text-base)' }}>
                  Total Raw Material Cost: <strong style={{ color: 'var(--color-accent)', marginLeft: '8px' }}>₹{activeBom.calculatedCost?.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* BOM History */}
          <DataTable
            title="BOM Version Log"
            columns={historyColumns}
            data={bomVersions}
            limit={10}
            onPageChange={() => {}}
            onLimitChange={() => {}}
            total={bomVersions.length}
          />
        </div>
      )}
    </div>
  );
};

export default BomPage;
