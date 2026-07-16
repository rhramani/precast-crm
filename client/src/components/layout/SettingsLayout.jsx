import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Palette, ShieldCheck } from 'lucide-react';
import './SettingsLayout.css';

const TABS = [
  {
    to: '/settings/system',
    label: 'Branding & Identity',
    icon: <Palette size={16} />,
    description: 'Logo, favicon, colors & fonts',
  },
  {
    to: '/settings/audit-logs',
    label: 'Security Audit Logs',
    icon: <ShieldCheck size={16} />,
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
