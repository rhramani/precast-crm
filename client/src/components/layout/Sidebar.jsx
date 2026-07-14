import { useSelector, useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { selectSidebarOpen, setSidebarOpen } from '../../store/slices/uiSlice';
import { selectCurrentRole } from '../../store/slices/authSlice';
import { selectCurrentBranch } from '../../store/slices/branchSlice';
import { useGetSettingsQuery } from '../../store/api/settingsApi';
import defaultLogo from '../../assets/logo.svg';
import './Sidebar.css';

// SVG wireframe / line icons dictionary mapped to item label or category
const ICON_MAP = {
  'Dashboard': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  'Branches': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M3 21h18M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M5 21V7m14 14V7M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M9 11h2M13 11h2" />
    </svg>
  ),
  'Raw Materials': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  'Products': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  'Production': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M22 21H2V9l5 4V9l5 4V9l10 6v6z" />
    </svg>
  ),
  'Inventory (Stock)': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M2 20h20" />
      <path d="M4 20V8l8-5 8 5v12" />
      <rect x="9" y="13" width="6" height="7" />
      <path d="M9 10h.01M15 10h.01M12 10h.01" />
    </svg>
  ),
  'InventoryRawMaterials': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  'InventoryFinishedGoods': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <polyline points="9 11 12 14 17 9" />
    </svg>
  ),
  'Customers': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'Projects': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h18M9 15h12M9 9l6 6" />
    </svg>
  ),
  'Quotations': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  ),
  'Invoices': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  'Payments': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  'Purchases': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  'Dispatch': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'Installation': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  'Equipment': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M22 19H2M5 19v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4M17 19v-8a3 3 0 0 1 3-3h1" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'Labour': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 11v6M16 14h6" />
    </svg>
  ),


  'Expenses': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  'Reports': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  ),
  'Settings': (
    <svg viewBox="0 0 24 24" className="sidebar__icon-svg">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};


const getNavIcon = (item) => {
  if (item.path === '/inventory/raw-materials') {
    return ICON_MAP['InventoryRawMaterials'];
  }
  if (item.path === '/inventory/finished-goods') {
    return ICON_MAP['InventoryFinishedGoods'];
  }
  if (item.path === '/labour') {
    return ICON_MAP['Labour'];
  }
  if (item.label === 'User Management') {
    return ICON_MAP['Customers'];
  }
  if (item.label === 'System Settings') {
    return ICON_MAP['Settings'];
  }
  
  // Localized label prefix matches for icons
  if (item.label.startsWith('Raw Materials')) return ICON_MAP['Raw Materials'];
  if (item.label.startsWith('Finished Goods')) return ICON_MAP['InventoryFinishedGoods'];
  if (item.label.startsWith('Customers')) return ICON_MAP['Customers'];
  if (item.label.startsWith('Quotations')) return ICON_MAP['Quotations'];
  if (item.label.startsWith('Invoices')) return ICON_MAP['Invoices'];
  if (item.label.startsWith('Purchases')) return ICON_MAP['Purchases'];
  if (item.label.startsWith('Dispatch')) return ICON_MAP['Dispatch'];
  if (item.label.startsWith('Labour')) return ICON_MAP['Labour'];
  if (item.label.startsWith('Expenses')) return ICON_MAP['Expenses'];
  if (item.label.startsWith('Equipment')) return ICON_MAP['Equipment'];

  
  return ICON_MAP[item.label] || <span>🔹</span>;
};

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',     roles: ['super_admin', 'branch'] },
  { label: 'Branches',      path: '/branches',      roles: ['super_admin'] },
  { divider: true, label: 'Operations',             roles: ['branch'] },
  { label: 'Raw Materials (Stock)', path: '/raw-materials', roles: ['branch'] },
  { label: 'Products',      path: '/products',      roles: ['branch'] },
  { label: 'Production',    path: '/production',    roles: ['branch'] },
  { divider: true, label: 'Inventory',              roles: ['branch'] },
  { label: 'Inventory (Stock)',     path: '/inventory',                roles: ['branch'] },
  { divider: true, label: 'Sales',                  roles: ['branch'] },
  { label: 'Customers / Clients',   path: '/customers',     roles: ['branch'] },
  { label: 'Projects',      path: '/projects',      roles: ['branch'] },
  { label: 'Quotations / Estimates', path: '/quotations',    roles: ['branch'] },
  { label: 'Invoices / Bills',      path: '/invoices',      roles: ['branch'] },
  { label: 'Payments',      path: '/payments',      roles: ['branch'] },
  { divider: true, label: 'Logistics',              roles: ['branch'] },
  { label: 'Purchases (PO)', path: '/purchases',     roles: ['branch'] },
  { label: 'Dispatch / Challans',    path: '/dispatch',      roles: ['branch'] },
  { label: 'Installation',  path: '/installation',  roles: ['branch'] },
  { label: 'Equipment / Machinery', path: '/equipment',     roles: ['branch'] },
  { divider: true, label: 'Resources',              roles: ['branch'] },
  { label: 'Labour / Workers',      path: '/labour',        roles: ['branch'] },
  { label: 'Expenses (Kharcha)',    path: '/expenses',      roles: ['branch'] },
  { divider: true, label: 'Analytics',              roles: ['branch'] },
  { label: 'Reports',       path: '/reports',       roles: ['branch'] },
  { divider: true, label: 'System',                 roles: ['super_admin'] },
  { label: 'System Settings',path: '/settings/system',roles: ['super_admin'] },
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const open = useSelector(selectSidebarOpen);
  const role = useSelector(selectCurrentRole);
  const currentBranch = useSelector(selectCurrentBranch);

  // Fetch dynamic branding/logo settings
  const { data: settingsRes } = useGetSettingsQuery();
  const systemSettings = settingsRes?.data;
  const companyName = systemSettings?.companyName || 'GIR Precast';
  const logo = systemSettings?.logo || '';

  // Prevent flashing default tabs during rehydration
  if (!role) {
    return (
      <aside className={`sidebar ${open ? 'sidebar--open' : 'sidebar--collapsed'}`}>
        <nav className="sidebar__nav" />
      </aside>
    );
  }

  // Filter items matching current user role
  const roleFiltered = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  // Exclude section dividers that don't have any items under them
  const visibleItems = [];
  for (let i = 0; i < roleFiltered.length; i++) {
    const item = roleFiltered[i];
    if (item.divider) {
      let hasVisibleChildren = false;
      for (let j = i + 1; j < roleFiltered.length; j++) {
        if (roleFiltered[j].divider) break;
        hasVisibleChildren = true;
      }
      if (hasVisibleChildren) {
        visibleItems.push(item);
      }
    } else {
      visibleItems.push(item);
    }
  }

  const handleItemClick = () => {
    if (window.innerWidth <= 768) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          className="sidebar__backdrop"
          onClick={() => dispatch(setSidebarOpen(false))}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar--open' : 'sidebar--collapsed'}`}>
        {/* Brand Area */}
        <div className="sidebar__brand">
          {logo ? (
            <img src={logo} alt="Logo" className="sidebar__brand-logo-img" />
          ) : (
            <img src={defaultLogo} alt="Logo" className="sidebar__brand-logo-img" />
          )}
        </div>


        {/* Nav */}
        <nav className="sidebar__nav">
          {visibleItems.map((item, idx) => {
            if (item.divider) {
              return open ? (
                <div key={idx} className="sidebar__section-label">{item.label}</div>
              ) : (
                <div key={idx} className="sidebar__divider" />
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
                }
                title={!open ? item.label : undefined}
                onClick={handleItemClick}
              >
                <span className="sidebar__item-icon">{getNavIcon(item)}</span>
                {open && <span className="sidebar__item-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
