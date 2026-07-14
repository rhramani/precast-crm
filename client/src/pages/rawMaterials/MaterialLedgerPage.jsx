import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetRawMaterialLedgerQuery, useGetRawMaterialsQuery } from '../../store/api/rawMaterialApi';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';

const MaterialLedgerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useGetRawMaterialLedgerQuery({
    id,
    params: { page, limit },
  });

  // Fetch materials list to locate the current material name/code for header display
  const { data: materialsData } = useGetRawMaterialsQuery({ limit: 100 });
  const currentMaterial = materialsData?.data?.materials?.find((m) => m._id === id);

  const columns = [
    {
      key: 'createdAt',
      label: 'Date & Time',
      render: (val) => new Date(val).toLocaleString(),
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'quantity',
      label: 'Quantity Changed',
      render: (val, row) => {
        const sign = row.type === 'in' || (row.type === 'adjustment' && row.remarks.includes('+')) ? '+' : '-';
        return `${sign}${val} ${currentMaterial?.unit || ''}`;
      },
    },
    {
      key: 'balanceAfter',
      label: 'Balance After',
      render: (val) => `${val} ${currentMaterial?.unit || ''}`,
    },
    {
      key: 'referenceType',
      label: 'Ref Type',
      render: (val) => <span style={{ textTransform: 'capitalize' }}>{val}</span>,
    },
    {
      key: 'remarks',
      label: 'Remarks',
    },
    {
      key: 'createdBy',
      label: 'Handled By',
      render: (val) => val?.name || 'System',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/raw-materials')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Materials
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Stock Ledger History
          </h1>
          {currentMaterial && (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
              Material: <strong>{currentMaterial.materialName} ({currentMaterial.materialCode})</strong>
            </p>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data?.logs || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isLoading}
        emptyMessage="No stock movements recorded for this material."
      />
    </div>
  );
};

export default MaterialLedgerPage;
