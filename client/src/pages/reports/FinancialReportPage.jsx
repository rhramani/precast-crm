import { useNavigate } from 'react-router-dom';
import { useGetFinancialReportQuery } from '../../store/api/reportApi';

const FinancialReportPage = () => {
  const navigate = useNavigate();
  const { data: finRes, isLoading } = useGetFinancialReportQuery();

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading financial metrics...</div>;
  }

  const profitability = finRes?.data?.profitability;
  const revenue = finRes?.data?.revenue;
  const expenses = finRes?.data?.expenses;

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
            Financial Audit & Earnings
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Aggregated P&L metrics showing sales, operational cash collections, and total expenses.
          </p>
        </div>
      </div>

      {/* Net Operating Earnings card */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', borderLeft: '5px solid var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          Net Operating Earnings
        </span>
        <h1 style={{ margin: '4px 0', fontSize: '2.5rem', color: profitability?.netEarnings >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          ₹{profitability?.netEarnings?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Overall Operating Margin: <strong>{profitability?.marginPercent?.toFixed(2) || 0}%</strong>
        </p>
      </div>

      {/* Comparisons Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Revenue Share */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📈 Revenue Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Invoiced Sales:</span>
              <strong>₹{revenue?.totalInvoiced?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Cash Collected:</span>
              <strong>₹{revenue?.totalReceivedCash?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px', margin: 0 }}>
            📉 Incurred Operating Costs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Materials Purchase (POs Received):</span>
              <strong>₹{expenses?.materialsPurchasesCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Wages Logs (Installation Crew):</span>
              <strong>₹{expenses?.labourCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Direct Site Expenses:</span>
              <strong>₹{expenses?.directExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>Total Operating Costs:</span>
              <strong style={{ color: 'var(--color-danger)' }}>
                ₹{expenses?.totalOperatingCosts?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportPage;
