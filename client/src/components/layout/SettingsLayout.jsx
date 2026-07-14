import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './SettingsLayout.css';

const TABS = [
  {
    to: '/settings/system',
    label: 'Branding & Identity',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    description: 'Logo, favicon, colors & fonts',
  },
  {
    to: '/settings/audit-logs',
    label: 'Security Audit Logs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    description: 'Database mutation history',
  },
];


const SettingsLayout = () => {
  const location = useLocation();

  const activeTab = TABS.find((t) => location.pathname === t.to) || TABS[0];

  return (
    <div className="settings-layout animate-fade-in">
      {/* Page Header */}
      <div className="settings-layout__header">
        <div className="settings-layout__header-text">
          <h1 className="settings-layout__title">System Settings</h1>
          <p className="settings-layout__subtitle">
            {activeTab.description} — manage global platform configuration
          </p>
        </div>
        <div className="settings-layout__badge">
          <span className="badge-dot" />
          Super Admin
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <div className="settings-tabs__track">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                `settings-tab ${isActive ? 'settings-tab--active' : ''}`
              }
            >
              <span className="settings-tab__icon">{tab.icon}</span>
              <span className="settings-tab__label">{tab.label}</span>
            </NavLink>
          ))}
          <div className="settings-tabs__indicator" />
        </div>
      </div>

      {/* Page Content */}
      <div className="settings-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsLayout;
