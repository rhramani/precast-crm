import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '../../store/api/projectApi';
import { useGetCustomersQuery } from '../../store/api/customerApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';

const ProjectsPage = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Queries
  const { data, isLoading } = useGetProjectsQuery({
    page,
    limit,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: customersRes } = useGetCustomersQuery({ limit: 100 });
  const customers = customersRes?.data?.customers || [];

  // Mutations
  const [createProject] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState({
    customerId: '',
    projectName: '',
    description: '',
    status: 'planned',
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
    setSelectedProject(null);
    setForm({
      customerId: '',
      projectName: '',
      description: '',
      status: 'planned',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setForm({
      customerId: project.customerId?._id || project.customerId || '',
      projectName: project.projectName || '',
      description: project.description || '',
      status: project.status || 'planned',
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.customerId)   errors.customerId = 'Customer mapping is required';
    if (!form.projectName.trim()) errors.projectName = 'Project name is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedProject) {
        const { customerId, ...updateData } = form;
        await updateProject({ id: selectedProject._id, ...updateData }).unwrap();
      } else {
        await createProject(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };

  const handleDeleteProject = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteProject(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete project.');
    }
  };

  const columns = [
    { key: 'projectName', label: 'Project Name', sortable: true },
    {
      key: 'customerId',
      label: 'Customer Client',
      render: (val) => (
        <span>
          <strong>{val?.customerName || '—'}</strong>
          {val?.companyName && <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-secondary)' }}>{val.companyName}</span>}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'createdAt',
      label: 'Date Created',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Manage Sites', onClick: () => navigate(`/projects/${row._id}/sites`), type: 'info' },
            { label: 'Project Costing Rollup', onClick: () => navigate(`/costing/project/${row._id}`), type: 'success' },
            { label: 'Edit Project', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteProject(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="Project Directory"
        columns={columns}
        data={data?.data?.projects || []}
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
            <label className="field-label">Status</label>
            <select
              className="field-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        }
        actions={
          <button onClick={handleOpenAdd} className="btn btn--primary">
            + Create Project
          </button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedProject ? 'Edit Project' : 'Create Project'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Client Customer</label>
          <select
            className="field-select"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            disabled={!!selectedProject}
          >
            <option value="">Choose customer...</option>
            {customers
              .filter((c) => c.status === 'active')
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customerName} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
          </select>
          {validationErrors.customerId && <span className="field-error">{validationErrors.customerId}</span>}
        </div>

        <div className="field-group">
          <label className="field-label field-label--required">Project Name</label>
          <input
            type="text"
            className="field-input"
            value={form.projectName}
            onChange={(e) => setForm({ ...form, projectName: e.target.value })}
            placeholder="e.g. Pune Highway Boundary Wall"
          />
          {validationErrors.projectName && <span className="field-error">{validationErrors.projectName}</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Status</label>
          <select
            className="field-select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Description / Summary</label>
          <textarea
            className="field-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Scope of work details..."
            rows={4}
          />
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated construction sites, estimations, and BOM specifications will be lost."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default ProjectsPage;
