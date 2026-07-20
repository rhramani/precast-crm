import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetRawMaterialsQuery,
  useCreateRawMaterialMutation,
  useUpdateRawMaterialMutation,
  useStockInMutation,
  useStockOutMutation,
  useAdjustStockMutation,
  useTransferStockMutation,
  useGetLowStockQuery,
  useDeleteRawMaterialMutation,
} from '../../store/api/rawMaterialApi';
import { useGetRawMaterialCategoriesQuery } from '../../store/api/rawMaterialCategoryApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { useGetSuppliersQuery } from '../../store/api/purchaseApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import './RawMaterials.css';

const RawMaterialsPage = () => {
  const navigate = useNavigate();
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  // Queries
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const { data, isLoading } = useGetRawMaterialsQuery({
    page,
    limit,
    search,
    category: categoryFilter,
    sortBy,
    sortOrder,
  });

  const { data: lowStockData } = useGetLowStockQuery();
  const { data: categoryRes } = useGetRawMaterialCategoriesQuery({ limit: 1000 });
  const categories = categoryRes?.data?.categories || [];
  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];
  const { data: suppliersRes } = useGetSuppliersQuery({ limit: 1000, status: 'active' });
  const suppliers = suppliersRes?.data?.suppliers || [];

  // Mutations
  const [createMaterial] = useCreateRawMaterialMutation();
  const [updateMaterial] = useUpdateRawMaterialMutation();
  const [stockIn] = useStockInMutation();
  const [stockOut] = useStockOutMutation();
  const [adjustStock] = useAdjustStockMutation();
  const [transferStock] = useTransferStockMutation();
  const [deleteRawMaterial] = useDeleteRawMaterialMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Project & Sites for "Send to Site"
  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];
  const [projectSites, setProjectSites] = useState([]);
  const [siteDrawerOpen, setSiteDrawerOpen] = useState(false);
  const [siteDeliveryForm, setSiteDeliveryForm] = useState({ projectId: '', siteId: '', quantity: '', remarks: '' });

  // Modal / Drawer States
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null); // null = add, otherwise edit
  const [materialForm, setMaterialForm] = useState({
    materialCode: '',
    materialName: '',
    category: '',
    unit: 'kg',
    purchaseRate: 0,
    currentQuantity: 0,
    branchId: '',
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [opDrawerOpen, setOpDrawerOpen] = useState(false);
  const [opType, setOpType] = useState('in'); // 'in' | 'out' | 'adjust'
  const [opForm, setOpForm] = useState({ quantity: '', remarks: '' });

  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    materialCode: '',
    fromBranchId: '',
    toBranchId: '',
    quantity: '',
    remarks: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Handlers
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleOpenAdd = () => {
    setSelectedMaterial(null);
    setMaterialForm({
      materialCode: '',
      materialName: '',
      category: categories[0]?._id || '',
      unit: 'kg',
      purchaseRate: 0,
      currentQuantity: 0,
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setValidationErrors({});
    setMaterialDrawerOpen(true);
  };

  const handleOpenEdit = (material) => {
    setSelectedMaterial(material);
    setMaterialForm({
      materialCode: material.materialCode || '',
      materialName: material.materialName || '',
      category: material.category?._id || material.category || '',
      unit: material.unit || 'kg',
      purchaseRate: material.purchaseRate || 0,
      branchId: material.branchId || '',
      supplierId: material.supplierId?._id || material.supplierId || '',
      date: material.date ? new Date(material.date).toISOString().split('T')[0] : '',
    });
    setValidationErrors({});
    setMaterialDrawerOpen(true);
  };

  const handleOpenOp = (material, type) => {
    setSelectedMaterial(material);
    setOpType(type);
    setOpForm({ quantity: '', remarks: '' });
    setValidationErrors({});
    setOpDrawerOpen(true);
  };

  const handleOpenSiteDelivery = (material) => {
    setSelectedMaterial(material);
    setSiteDeliveryForm({ projectId: '', siteId: '', quantity: '', remarks: '' });
    setProjectSites([]);
    setValidationErrors({});
    setSiteDrawerOpen(true);
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  const handleSiteProjectChange = async (projectId) => {
    setSiteDeliveryForm(prev => ({ ...prev, projectId, siteId: '' }));
    if (!projectId) { setProjectSites([]); return; }
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load project sites');
      }
      const d = await res.json();
      if (d.success) {
        setProjectSites(d.data.sites || []);
      } else {
        throw new Error(d.message || 'Failed to load project sites');
      }
    } catch (err) {
      setProjectSites([]);
      alert(err.message || 'Failed to load project sites');
    }
  };

  const handleSiteDeliverySubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};
    if (!siteDeliveryForm.projectId) errors.projectId = 'Project is required';
    if (!siteDeliveryForm.siteId) errors.siteId = 'Site is required';
    const qty = Number(siteDeliveryForm.quantity);
    if (!siteDeliveryForm.quantity || isNaN(qty) || qty <= 0) errors.quantity = 'Enter a valid quantity';
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    const siteName = projectSites.find(s => s._id === siteDeliveryForm.siteId)?.siteName || siteDeliveryForm.siteId;
    const projectName = projects.find(p => p._id === siteDeliveryForm.projectId)?.projectName || '';
    try {
      await stockOut({
        id: selectedMaterial._id,
        quantity: qty,
        remarks: `Sent to Site: ${siteName} (${projectName}). ${siteDeliveryForm.remarks || ''}`.trim(),
      }).unwrap();
      setSiteDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to record site delivery' });
    }
  };

  const handleOpenTransfer = (material) => {
    setSelectedMaterial(material);
    setTransferForm({
      materialCode: material.materialCode,
      fromBranchId: material.branchId?._id || material.branchId || '',
      toBranchId: '',
      quantity: '',
      remarks: '',
    });
    setValidationErrors({});
    setTransferDrawerOpen(true);
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const errors = {};

    if (!materialForm.materialName.trim()) errors.materialName = 'Name is required';
    if (!materialForm.unit.trim()) errors.unit = 'Unit is required';
    if (userRole === 'super_admin' && !materialForm.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        ...materialForm,
        supplierId: materialForm.supplierId || null,
      };
      if (selectedMaterial) {
        await updateMaterial({ id: selectedMaterial._id, ...payload }).unwrap();
      } else {
        await createMaterial(payload).unwrap();
      }
      setMaterialDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save failed' });
    }
  };

  const handleOpSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const qty = Number(opForm.quantity);
    if (!opForm.quantity || isNaN(qty) || qty <= 0) {
      setValidationErrors({ quantity: 'Must be a valid quantity greater than 0' });
      return;
    }

    try {
      const payload = { id: selectedMaterial._id, quantity: qty, remarks: opForm.remarks };
      if (opType === 'in') {
        await stockIn(payload).unwrap();
      } else if (opType === 'out') {
        await stockOut(payload).unwrap();
      } else {
        // signed adjustment delta
        await adjustStock(payload).unwrap();
      }
      setOpDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Transaction failed' });
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    const qty = Number(transferForm.quantity);
    if (!transferForm.toBranchId) {
      setValidationErrors({ toBranchId: 'Destination branch is required' });
      return;
    }
    if (!transferForm.quantity || isNaN(qty) || qty <= 0) {
      setValidationErrors({ quantity: 'Must be a valid transfer quantity greater than 0' });
      return;
    }

    try {
      await transferStock({
        materialCode: transferForm.materialCode,
        fromBranchId: transferForm.fromBranchId,
        toBranchId: transferForm.toBranchId,
        quantity: qty,
        remarks: transferForm.remarks,
      }).unwrap();
      setTransferDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Transfer failed' });
    }
  };

  const handleDeleteMaterial = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteRawMaterial(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete material.');
    }
  };

  // Columns definition
  const columns = [
    { key: 'materialCode', label: 'Code', sortable: true },
    { key: 'materialName', label: 'Material Name', sortable: true },
    { key: 'category', label: 'Category', render: (val) => val?.name || val || '—' },
    { key: 'supplierId', label: 'Preferred Supplier', render: (val) => val?.supplierName || '—' },
    {
      key: 'currentQuantity',
      label: 'Current Stock Quantity',
      render: (val, row) => {
        const isLow = val <= 0;
        return (
          <span className={isLow ? 'stock-warning-text' : ''}>
            <strong>{val}</strong> {row.unit}
            {isLow && <span className="stock-alert-dot" title="Out of Stock!" />}
          </span>
        );
      },
    },
    { key: 'date', label: 'Registration Date', render: (val) => val ? new Date(val).toLocaleDateString('en-IN') : '—' },
    { key: 'purchaseRate', label: 'Purchase Rate (₹)', render: (val) => `₹${val.toFixed(2)}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Stock In', onClick: () => handleOpenOp(row, 'in'), type: 'success' },
            { label: 'Send to Site 🚧', onClick: () => handleOpenSiteDelivery(row), type: 'warning' },
            { label: 'Edit Material', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteMaterial(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  const lowStockCount = lowStockData?.data?.materials?.length || 0;

  return (
    <div className="materials-container">
      {lowStockCount > 0 && (
        <div className="low-stock-banner" role="alert">
          <span className="low-stock-banner__icon">⚠️</span>
          <div className="low-stock-banner__body">
            <strong>Out of Stock Alert!</strong> {lowStockCount} raw material(s) are currently out of stock.
          </div>
        </div>
      )}

      <DataTable
        title="Raw Material Master"
        columns={columns}
        data={data?.data?.materials || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        filters={
          <div className="filter-group">
            <label className="field-label">Category</label>
            <select
              className="field-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Material
          </button>
        }
      />

      {/* Drawer 1: Add/Edit Material */}
      <FormDrawer
        open={materialDrawerOpen}
        onClose={() => setMaterialDrawerOpen(false)}
        title={selectedMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
        footer={
          <>
            <button onClick={() => setMaterialDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleMaterialSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}



        <div className="field-group">
          <label className="field-label field-label--required">Material Name</label>
          <input
            name="materialName"
            type="text"
            className="field-input"
            value={materialForm.materialName}
            onChange={(e) => setMaterialForm({ ...materialForm, materialName: e.target.value })}
            placeholder="e.g. OPC 53 Cement"
          />
          {validationErrors.materialName && <span className="field-error">{validationErrors.materialName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Category</label>
            <select
              className="field-select"
              value={materialForm.category}
              onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
            >
              <option value="">Select Category...</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label field-label--required">Unit of Measure</label>
            <input
              type="text"
              className="field-input"
              value={materialForm.unit}
              onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
              placeholder="e.g. kg, bags, brass"
            />
            {validationErrors.unit && <span className="field-error">{validationErrors.unit}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Registration Date</label>
            <input
              type="date"
              className="field-input"
              value={materialForm.date}
              onChange={(e) => setMaterialForm({ ...materialForm, date: e.target.value })}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Purchase Rate (₹)</label>
            <input
              type="number"
              className="field-input"
              value={materialForm.purchaseRate}
              onChange={(e) => setMaterialForm({ ...materialForm, purchaseRate: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Preferred Supplier</label>
          <select
            className="field-select"
            value={materialForm.supplierId}
            onChange={(e) => setMaterialForm({ ...materialForm, supplierId: e.target.value })}
          >
            <option value="">No Supplier Associated</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.supplierName} {s.contactPerson ? `(${s.contactPerson})` : ''}
              </option>
            ))}
          </select>
        </div>

        {!selectedMaterial && (
          <div className="field-group">
            <label className="field-label">Current Stock Quantity</label>
            <input
              type="number"
              className="field-input"
              value={materialForm.currentQuantity}
              onChange={(e) => setMaterialForm({ ...materialForm, currentQuantity: Number(e.target.value) })}
              placeholder="Enter opening stock quantity (default is 0)"
            />
          </div>
        )}

        {userRole === 'super_admin' && (
          <div className="field-group">
            <label className="field-label field-label--required">Branch Assignment</label>
            <select
              className="field-select"
              value={materialForm.branchId}
              onChange={(e) => setMaterialForm({ ...materialForm, branchId: e.target.value })}
              disabled={!!selectedMaterial}
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
            {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
          </div>
        )}
      </FormDrawer>

      {/* Drawer 2: Stock Operations (In/Out/Adjust) */}
      <FormDrawer
        open={opDrawerOpen}
        onClose={() => setOpDrawerOpen(false)}
        title={opType === 'in' ? 'Stock Receipt (Stock In)' : opType === 'out' ? 'Stock Issue (Stock Out)' : 'Inventory Adjustment'}
        footer={
          <>
            <button onClick={() => setOpDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleOpSubmit} className="btn btn--primary">Confirm</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div style={{ marginBottom: '12px', fontSize: 'var(--text-sm)' }}>
          Material: <strong>{selectedMaterial?.materialName} ({selectedMaterial?.materialCode})</strong><br />
          Current Stock: <strong>{selectedMaterial?.currentQuantity} {selectedMaterial?.unit}</strong>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">
            {opType === 'adjust' ? 'Adjustment Offset (positive to add, negative to subtract)' : 'Transaction Quantity'}
          </label>
          <input
            type="number"
            className="field-input"
            value={opForm.quantity}
            onChange={(e) => setOpForm({ ...opForm, quantity: e.target.value })}
            placeholder={opType === 'adjust' ? 'e.g. -20 or 50' : 'e.g. 100'}
          />
          {validationErrors.quantity && <span className="field-error">{validationErrors.quantity}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Remarks</label>
          <textarea
            className="field-textarea"
            value={opForm.remarks}
            onChange={(e) => setOpForm({ ...opForm, remarks: e.target.value })}
            placeholder="Add transaction references or notes..."
            rows={3}
          />
        </div>
      </FormDrawer>

      {/* Drawer 3: Interbranch Transfer */}
      <FormDrawer
        open={transferDrawerOpen}
        onClose={() => setTransferDrawerOpen(false)}
        title="Inter-Branch Material Transfer"
        footer={
          <>
            <button onClick={() => setTransferDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleTransferSubmit} className="btn btn--primary">Transfer</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div style={{ marginBottom: '12px', fontSize: 'var(--text-sm)' }}>
          Material: <strong>{selectedMaterial?.materialName} ({selectedMaterial?.materialCode})</strong><br />
          Current Source Stock: <strong>{selectedMaterial?.currentQuantity} {selectedMaterial?.unit}</strong>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Destination Branch</label>
          <select
            className="field-select"
            value={transferForm.toBranchId}
            onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
          >
            <option value="">Select Target Branch...</option>
            {branches
              .filter((b) => b._id !== transferForm.fromBranchId)
              .map((b) => (
                <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
              ))}
          </select>
          {validationErrors.toBranchId && <span className="field-error">{validationErrors.toBranchId}</span>}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Quantity to Transfer</label>
          <input
            type="number"
            className="field-input"
            value={transferForm.quantity}
            onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
            placeholder="e.g. 50"
          />
          {validationErrors.quantity && <span className="field-error">{validationErrors.quantity}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Transfer Remarks</label>
          <textarea
            className="field-textarea"
            value={transferForm.remarks}
            onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
            placeholder="Reason for transfer, vehicle details..."
            rows={3}
          />
        </div>
      </FormDrawer>

      {/* Drawer 4: Send to Site */}
      <FormDrawer
        open={siteDrawerOpen}
        onClose={() => setSiteDrawerOpen(false)}
        title="Send Raw Material to Site"
        footer={
          <>
            <button onClick={() => setSiteDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSiteDeliverySubmit} className="btn btn--primary">Send to Site</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div style={{ marginBottom: '12px', fontSize: 'var(--text-sm)' }}>
          Material: <strong>{selectedMaterial?.materialName} ({selectedMaterial?.materialCode})</strong><br />
          Current Stock: <strong>{selectedMaterial?.currentQuantity} {selectedMaterial?.unit}</strong>
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Project</label>
          <select
            className="field-select"
            value={siteDeliveryForm.projectId}
            onChange={(e) => handleSiteProjectChange(e.target.value)}
          >
            <option value="">Select Project...</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.projectName}</option>
            ))}
          </select>
          {validationErrors.projectId && <span className="field-error">{validationErrors.projectId}</span>}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Laying Site</label>
          <select
            className="field-select"
            value={siteDeliveryForm.siteId}
            onChange={(e) => setSiteDeliveryForm({ ...siteDeliveryForm, siteId: e.target.value })}
            disabled={!siteDeliveryForm.projectId}
          >
            <option value="">Select Site...</option>
            {projectSites.map((s) => (
              <option key={s._id} value={s._id}>{s.siteName}</option>
            ))}
          </select>
          {validationErrors.siteId && <span className="field-error">{validationErrors.siteId}</span>}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Quantity</label>
          <input
            type="number"
            className="field-input"
            value={siteDeliveryForm.quantity}
            onChange={(e) => setSiteDeliveryForm({ ...siteDeliveryForm, quantity: e.target.value })}
            placeholder="e.g. 10"
          />
          {validationErrors.quantity && <span className="field-error">{validationErrors.quantity}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Remarks</label>
          <textarea
            className="field-textarea"
            value={siteDeliveryForm.remarks}
            onChange={(e) => setSiteDeliveryForm({ ...siteDeliveryForm, remarks: e.target.value })}
            placeholder="Scope/delivery context..."
            rows={3}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Raw Material"
        message="Are you sure you want to delete this raw material? All stock logs and ledgers for this material will be lost."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default RawMaterialsPage;
