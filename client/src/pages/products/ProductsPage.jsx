import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateProductStatusMutation,
  useDeleteProductMutation,
} from '../../store/api/productApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const CATEGORY_MAP = {
  cement_wall:   'Cement Wall',
  compound_wall: 'Compound Wall',
  boundary_wall: 'Boundary Wall',
  pole:          'Pole',
  beam:          'Beam',
  top_beam:      'Top Beam',
  slab:          'Slab',
  paver_block:   'Paver Block',
  column:        'Column',
  custom:        'Custom Product',
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetProductsQuery({
    page,
    limit,
    search,
    category: categoryFilter,
    sortBy,
    sortOrder,
  });

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [updateStatus] = useUpdateProductStatusMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    productCode: '',
    productName: '',
    category: 'cement_wall',
    dimensions: { width: 0, height: 0, length: 0, thickness: 0 },
    weight: 0,
    unit: 'pcs',
    description: '',
    branchId: '',
    sellingPrice: 0,
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = ({ sortBy: field, sortOrder: order }) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setForm({
      productCode: '',
      productName: '',
      category: 'cement_wall',
      dimensions: { width: 0, height: 0, length: 0, thickness: 0 },
      weight: 0,
      unit: 'pcs',
      description: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
      sellingPrice: 0,
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setForm({
      productCode: product.productCode || '',
      productName: product.productName || '',
      category: product.category || 'cement_wall',
      dimensions: {
        width:     product.dimensions?.width || 0,
        height:    product.dimensions?.height || 0,
        length:    product.dimensions?.length || 0,
        thickness: product.dimensions?.thickness || 0,
      },
      weight:      product.weight || 0,
      unit:        product.unit || 'pcs',
      description: product.description || '',
      branchId:    product.branchId || '',
      sellingPrice: product.sellingPrice || 0,
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus({ id: product._id, status: newStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [name]: Number(value) },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};

    if (!form.productName.trim()) errors.productName = 'Product name is required';
    if (!form.unit.trim())        errors.unit = 'Unit is required';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedProduct) {
        await updateProduct({ id: selectedProduct._id, ...form }).unwrap();
      } else {
        await createProduct(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const handleDeleteProduct = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteProduct(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete product.');
    }
  };

  const columns = [
    { key: 'productCode', label: 'Code', sortable: true },
    { key: 'productName', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', render: (val) => CATEGORY_MAP[val] || val },
    {
      key: 'dimensions',
      label: 'Dimensions (WxHxLxT)',
      render: (val) => {
        if (!val) return '—';
        return `${val.width || 0}x${val.height || 0}x${val.length || 0}x${val.thickness || 0}`;
      },
    },
    { key: 'weight', label: 'Weight (kg)', render: (val) => `${val} kg` },
    { key: 'unit', label: 'Unit' },
    { key: 'sellingPrice', label: 'Selling Price', render: (val) => `₹${val?.toLocaleString('en-IN') || 0}` },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={val} />
          <button
            onClick={() => handleStatusToggle(row)}
            className="btn btn--secondary btn--sm"
            style={{ padding: '2px 6px', fontSize: '10px' }}
          >
            Toggle
          </button>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'BOM Builder', onClick: () => navigate(`/products/${row._id}/bom`), type: 'info' },
            { label: 'Edit Product', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteProduct(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Product Master"
        columns={columns}
        data={data?.data?.products || []}
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
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Product
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedProduct ? 'Edit Product' : 'Add Product'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}



        <div className="field-group">
          <label className="field-label field-label--required">Product Name</label>
          <input
            name="productName"
            type="text"
            className="field-input"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            placeholder="e.g. Supporting Beam 3m"
          />
          {validationErrors.productName && <span className="field-error">{validationErrors.productName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Category</label>
            <select
              className="field-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label field-label--required">Unit of Measure</label>
            <input
              type="text"
              className="field-input"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. pcs, meters"
            />
            {validationErrors.unit && <span className="field-error">{validationErrors.unit}</span>}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Dimensions (WxHxLxT)</label>
          <div className="form-row form-row--4" style={{ gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Width</label>
              <input
                name="width"
                type="number"
                className="field-input"
                value={form.dimensions.width}
                onChange={handleDimensionChange}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Height</label>
              <input
                name="height"
                type="number"
                className="field-input"
                value={form.dimensions.height}
                onChange={handleDimensionChange}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Length</label>
              <input
                name="length"
                type="number"
                className="field-input"
                value={form.dimensions.length}
                onChange={handleDimensionChange}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Thickness</label>
              <input
                name="thickness"
                type="number"
                className="field-input"
                value={form.dimensions.thickness}
                onChange={handleDimensionChange}
              />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Weight (kg)</label>
            <input
              type="number"
              className="field-input"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Selling Price (₹)</label>
            <input
              type="number"
              className="field-input"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
              placeholder="e.g. 700"
            />
          </div>
        </div>

        {userRole === 'super_admin' && (
          <div className="field-group" style={{ marginBottom: '16px' }}>
            <label className="field-label field-label--required">Branch Assignment</label>
            <select
              className="field-select"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              disabled={!!selectedProduct}
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
            {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
          </div>
        )}

        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea
            className="field-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Add product specifications, concrete mix grade details..."
            rows={3}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Product"
        message="Are you sure you want to delete this product? All BOM configurations for this product will be lost."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default ProductsPage;
