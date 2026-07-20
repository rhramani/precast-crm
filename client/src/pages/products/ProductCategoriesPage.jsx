import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetProductCategoriesQuery,
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
  useDeleteProductCategoryMutation,
} from '../../store/api/productCategoryApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const ProductCategoriesPage = () => {
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Queries
  const { data, isLoading } = useGetProductCategoriesQuery({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createCategory] = useCreateProductCategoryMutation();
  const [updateCategory] = useUpdateProductCategoryMutation();
  const [deleteCategory] = useDeleteProductCategoryMutation();

  // Dialog & Drawer States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // null = add, otherwise edit

  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '',
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
    setSelectedCategory(null);
    setForm({
      name: '',
      description: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      branchId: cat.branchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteCategory(confirmDialog.id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Delete operation failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.name.trim()) errors.name = 'Category name is required';
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        branchId: form.branchId || undefined,
      };

      if (selectedCategory) {
        await updateCategory({ id: selectedCategory._id, ...payload }).unwrap();
      } else {
        await createCategory(payload).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Failed to save category.' });
    }
  };

  // Columns definition
  const columns = [
    { key: 'name', label: 'Category Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Edit Category', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteClick(row._id), type: 'danger' },
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <DataTable
        title="Product Category Master"
        columns={columns}
        data={data?.data?.categories || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={handleSearch}
        onSort={handleSort}
        isLoading={isLoading}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Add Category
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCategory ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error" style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>{validationErrors.general}</div>}

        <div className="field-group" style={{ marginBottom: '16px' }}>
          <label className="field-label field-label--required">Category Name</label>
          <input
            type="text"
            className="field-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Cement Wall, Pole, Column"
          />
          {validationErrors.name && <span className="field-error" style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{validationErrors.name}</span>}
        </div>

        <div className="field-group" style={{ marginBottom: '16px' }}>
          <label className="field-label">Description</label>
          <textarea
            className="field-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the usage or type of products in this category..."
            rows={4}
          />
        </div>

        {userRole === 'super_admin' && (
          <div className="field-group" style={{ marginBottom: '16px' }}>
            <label className="field-label field-label--required">Branch Assignment</label>
            <select
              className="field-select"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              disabled={!!selectedCategory}
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
            {validationErrors.branchId && <span className="field-error" style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{validationErrors.branchId}</span>}
          </div>
        )}
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Category"
        message="Are you sure you want to delete this category? This operation cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default ProductCategoriesPage;
