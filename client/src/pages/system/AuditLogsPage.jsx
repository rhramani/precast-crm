import { useState } from 'react';
import { useGetAuditLogsQuery } from '../../store/api/auditLogApi';
import DataTable from '../../components/ui/DataTable';

const MODULE_MAP = {
  raw_materials: '📦 Raw Materials',
  production: '🏭 Production',
  branches: '🏢 Branches',
  customers: '👥 Customers',
  projects: '🏗️ Projects',
  quotations: '📄 Quotations',
  purchases: '🛒 Purchases',
  dispatch: '🚛 Dispatch',
  installation: '🛠️ Installation',
  costing: '💰 Costing',
};

const ACTION_MAP = {
  create: '➕ Create',
  update: '✏️ Update',
  delete: '🗑️ Delete',
  update_status: '⚡ Status Change',
  complete: '✓ Complete',
  stock_adjustment: '🧮 Stock Adjust',
};

const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useGetAuditLogsQuery({
    page,
    limit,
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
  });

  const columns = [
    {
      key: 'userId',
      label: 'Executed By',
      render: (val) => (
        val ? (
          <div>
            <strong>{val.name}</strong>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {val.email} ({val.role === 'super_admin' ? 'Super Admin' : 'Branch'})
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)' }}>System Process</span>
        )
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (val) => ACTION_MAP[val] || val,
    },
    {
      key: 'module',
      label: 'Target Module',
      render: (val) => MODULE_MAP[val] || val,
    },
    {
      key: 'referenceId',
      label: 'Affected Record ID',
      render: (val) => val ? <code>{val}</code> : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>,
    },
    {
      key: 'ipAddress',
      label: 'IP Location',
      render: (val) => val || <span style={{ color: 'var(--color-text-secondary)' }}>Local</span>,
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (val) => new Date(val).toLocaleString('en-IN'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DataTable
        title="🛡️ Security Audit Logs"
        subtitle="Chronological feed of database mutations and system state transitions."
        columns={columns}
        data={data?.data?.logs || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isLoading}
        showSearch={false}
        filters={
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="filter-group">
              <label className="field-label">Filter Module</label>
              <select
                className="field-select"
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Modules</option>
                {Object.entries(MODULE_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="field-label">Filter Action</label>
              <select
                className="field-select"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default AuditLogsPage;
