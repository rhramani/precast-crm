import { useNavigate } from 'react-router-dom';
import { useGetCustomerReportQuery } from '../../store/api/reportApi';

const CustomerReportPage = () => {
  const navigate = useNavigate();
  const { data: custRes, isLoading } = useGetCustomerReportQuery();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading accounts receivable ledger balances...</div>;
  }

  const customers = custRes?.data?.customers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/reports')}
          className="btn btn--secondary"
          style={{ padding: '6px 12px' }}
        >
          ← Back to Reports
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            Customer Outstanding Statement Balances
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Real-time accounts receivable records showing total sales vs collections and outstanding balances.
          </p>
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
          👥 Accounts Receivable Summary
        </h3>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>Customer Name</th>
                <th style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>Company</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Total Invoiced</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Total Paid</th>
                <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No sales history recorded yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customerId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 0' }}>{c.customerName}</td>
                    <td style={{ padding: '12px' }}>{c.companyName || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{c.totalInvoiced?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₹{c.totalPaid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: c.outstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
                      ₹{c.outstanding?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerReportPage;
