import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from '../../store/api/expenseApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { selectCurrentRole, selectCurrentBranchId } from '../../store/slices/authSlice';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const ExpensesPage = () => {
  const userRole = useSelector(selectCurrentRole);
  const userBranchId = useSelector(selectCurrentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  // Queries
  const { data, isLoading } = useGetExpensesQuery({ page, limit, search });
  const expenses = data?.data?.expenses || [];

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const { data: branchData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchData?.data?.branches || [];

  // Mutations
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [form, setForm] = useState({
    projectId: '',
    siteId: '',
    expenseCategory: '',
    amount: '',
    expenseDate: '',
    description: '',
    branchId: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  // Dynamic project sites lookup
  const [projectSites, setProjectSites] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  const fetchSitesForProject = async (projId) => {
    if (!projId) {
      setProjectSites([]);
      return [];
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) {
        setProjectSites([]);
        return [];
      }
      const resData = await response.json();
      if (resData.success) {
        const sites = resData.data.sites || [];
        setProjectSites(sites);
        return sites;
      }
    } catch (e) {
      setProjectSites([]);
    }
    return [];
  };

  const handleProjectChange = async (projectId) => {
    setForm((prev) => ({ ...prev, projectId, siteId: '' }));
    await fetchSitesForProject(projectId);
  };

  const handleOpenAdd = () => {
    setDrawerMode('add');
    setSelectedExpenseId(null);
    setForm({
      projectId: '',
      siteId: '',
      expenseCategory: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      description: '',
      branchId: userRole === 'super_admin' ? '' : userBranchId || '',
    });
    setProjectSites([]);
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenView = async (row) => {
    setDrawerMode('view');
    setSelectedExpenseId(row._id);
    const projId = row.projectId?._id || row.projectId || '';
    const siteId = row.siteId?._id || row.siteId || '';
    await fetchSitesForProject(projId);
    setForm({
      projectId: projId,
      siteId: siteId,
      expenseCategory: row.expenseCategory || '',
      amount: row.amount || '',
      expenseDate: row.expenseDate ? new Date(row.expenseDate).toISOString().split('T')[0] : '',
      description: row.description || '',
      branchId: row.branchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (row) => {
    setDrawerMode('edit');
    setSelectedExpenseId(row._id);
    const projId = row.projectId?._id || row.projectId || '';
    const siteId = row.siteId?._id || row.siteId || '';
    await fetchSitesForProject(projId);
    setForm({
      projectId: projId,
      siteId: siteId,
      expenseCategory: row.expenseCategory || '',
      amount: row.amount || '',
      expenseDate: row.expenseDate ? new Date(row.expenseDate).toISOString().split('T')[0] : '',
      description: row.description || '',
      branchId: row.branchId || '',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (drawerMode === 'view') {
      setDrawerOpen(false);
      return;
    }
    setValidationErrors({});

    const errors = {};
    if (!form.projectId) errors.projectId = 'Project mapping is required';
    if (!form.siteId)    errors.siteId = 'Site destination is required';
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      errors.amount = 'Amount must be greater than zero';
    }
    if (userRole === 'super_admin' && !form.branchId) errors.branchId = 'Branch assignment is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (drawerMode === 'edit') {
        await updateExpense({ id: selectedExpenseId, ...form }).unwrap();
      } else {
        await createExpense(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Expense operation failed.' });
    }
  };

  const handleDeleteExpense = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteExpense(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete expense.');
    }
  };

  const columns = [
    { key: 'expenseCategory', label: 'Expense Category', render: (val) => val || '—' },
    { key: 'projectId', label: 'Project Name', render: (val) => val?.projectName || '—' },
    { key: 'siteId', label: 'Project Site', render: (val) => val?.siteName || '—' },
    { key: 'amount', label: 'Expense Amount (₹)', render: (val) => `₹${val.toLocaleString()}` },
    {
      key: 'expenseDate',
      label: 'Expense Date',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    { key: 'description', label: 'Remarks / Description' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'View', onClick: () => handleOpenView(row) },
            { label: 'Edit', onClick: () => handleOpenEdit(row) },
            { label: 'Delete', onClick: () => handleDeleteExpense(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  const getDrawerTitle = () => {
    if (drawerMode === 'view') return 'View Site Expense Voucher';
    if (drawerMode === 'edit') return 'Edit Site Expense Voucher';
    return 'Log Site Expense Voucher';
  };

  const isReadOnly = drawerMode === 'view';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Direct Site Expenditure Directory"
        columns={columns}
        data={expenses}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={setSearch}
        isLoading={isLoading}
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Log Site Expense
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={getDrawerTitle()}
        footer={
          isReadOnly ? (
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Close</button>
          ) : (
            <>
              <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn btn--primary">
                {drawerMode === 'edit' ? 'Update' : 'Save'}
              </button>
            </>
          )
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Project Name</label>
            <select
              className="field-select"
              value={form.projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isReadOnly}
            >
              <option value="">Choose project...</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.projectName}</option>
              ))}
            </select>
            {validationErrors.projectId && <span className="field-error">{validationErrors.projectId}</span>}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Project Site</label>
            <select
              className="field-select"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              disabled={isReadOnly || !form.projectId}
            >
              <option value="">Select Site...</option>
              {projectSites.map((s) => (
                <option key={s._id} value={s._id}>{s.siteName}</option>
              ))}
            </select>
            {validationErrors.siteId && <span className="field-error">{validationErrors.siteId}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Expense Amount (₹)</label>
            <input
              type="number"
              className="field-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 15000"
              disabled={isReadOnly}
            />
            {validationErrors.amount && <span className="field-error">{validationErrors.amount}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Expense Category</label>
            <input
              type="text"
              className="field-input"
              value={form.expenseCategory}
              onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })}
              placeholder="Enter expense category..."
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Expense Date</label>
            <input
              type="date"
              className="field-input"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          {userRole === 'super_admin' && (
            <div className="field-group">
              <label className="field-label field-label--required">Branch Assignment</label>
              <select
                className="field-select"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                disabled={isReadOnly}
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
              {validationErrors.branchId && <span className="field-error">{validationErrors.branchId}</span>}
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-label">Remarks Description</label>
          <textarea
            className="field-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Scope of cost details..."
            rows={3}
            disabled={isReadOnly}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record? This action is permanent."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default ExpensesPage;
