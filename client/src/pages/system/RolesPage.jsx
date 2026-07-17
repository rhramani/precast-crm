const RolesPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 4px 0' }}>
          Role & Access Control Configuration
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
          Precast CRM relies on a static, secure Role-Based Access Control (RBAC) model.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Super Admin Info */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--color-accent)' }}>
          <h2 style={{ fontSize: 'var(--text-md)', margin: '0 0 8px 0', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👑 Super Admin Role
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Authorized for organization-wide performance monitoring, system-level adjustments, and multi-branch management.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              Permitted Operations
            </h3>
            {[
              'Configure and manage manufacturing branch plants',
              'Create branch login accounts and assign user credentials',
              'View cross-branch dashboard summaries and performance ranking graphs',
              'Monitor global stock values and finished goods inventory aggregates',
              'Access financial audit records and platform-wide security logging lists',
              'Modify global styling, logo branding, and platform fonts',
            ].map((perm, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: 'var(--text-sm)', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-success)' }}>✓</span>
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch User Info */}
        <div className="card" style={{ background: 'var(--color-surface)', padding: '32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--color-primary)' }}>
          <h2 style={{ fontSize: 'var(--text-md)', margin: '0 0 8px 0', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏭 Branch User / Operator Role
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Authorized for factory-level operational activities, inventory adjustments, and client site logs inside their assigned branch.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 700 }}>
              Permitted Operations
            </h3>
            {[
              'Add, transfer, or adjust raw material stock entries (cement, sand, steel)',
              'Configure product masters and design component recipes (BOM / wastage percentages)',
              'Evaluate manufacturing feasibility using the Production Capacity Calculator',
              'Log casting production runs and compile finished goods stock levels',
              'Raise procurement Purchase Orders (PO) to raw material suppliers',
              'Generate client Quotations and calculate site component needs',
              'Coordinate dispatch trucks, vehicle challans, and delivery sheets',
              'Log site erection crew progress, labor hours, daily wages, and JCB costs',
            ].map((perm, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: 'var(--text-sm)', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-success)' }}>✓</span>
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
