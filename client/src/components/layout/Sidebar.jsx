import { useSelector, useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { selectSidebarOpen, setSidebarOpen } from '../../store/slices/uiSlice';
import { selectCurrentRole } from '../../store/slices/authSlice';
import { selectCurrentBranch } from '../../store/slices/branchSlice';
import { useGetSettingsQuery } from '../../store/api/settingsApi';
import defaultLogo from '../../assets/logo.svg';
import './Sidebar.css';

import {
  LayoutDashboard,
  Building2,
  Layers,
  Package,
  Factory,
  Warehouse,
  ClipboardList,
  ClipboardCheck,
  Users,
  FolderOpen,
  FileText,
  Receipt,
  CreditCard,
  ShoppingCart,
  Truck,
  Wrench,
  HardHat,
  Contact,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  LayoutTemplate
} from 'lucide-react';

// Lucide React vector icons dictionary mapped to item label or category
const ICON_MAP = {
  'Dashboard': <LayoutDashboard className="sidebar__icon-svg" />,
  'Branches': <Building2 className="sidebar__icon-svg" />,
  'Raw Materials': <Layers className="sidebar__icon-svg" />,
  'Products': <Package className="sidebar__icon-svg" />,
  'Production': <Factory className="sidebar__icon-svg" />,
  'Inventory': <Warehouse className="sidebar__icon-svg" />,
  'InventoryRawMaterials': <ClipboardList className="sidebar__icon-svg" />,
  'InventoryFinishedGoods': <ClipboardCheck className="sidebar__icon-svg" />,
  'Customers': <Users className="sidebar__icon-svg" />,
  'Projects': <FolderOpen className="sidebar__icon-svg" />,
  'Quotations': <FileText className="sidebar__icon-svg" />,
  'Invoices': <Receipt className="sidebar__icon-svg" />,
  'Payments': <CreditCard className="sidebar__icon-svg" />,
  'Purchases': <ShoppingCart className="sidebar__icon-svg" />,
  'Suppliers': <Users className="sidebar__icon-svg" />,
  'Dispatch': <Truck className="sidebar__icon-svg" />,
  'Installation': <Wrench className="sidebar__icon-svg" />,
  'Equipment': <HardHat className="sidebar__icon-svg" />,
  'Labour': <Contact className="sidebar__icon-svg" />,
  'Expenses': <DollarSign className="sidebar__icon-svg" />,
  'Reports': <BarChart3 className="sidebar__icon-svg" />,
  'Settings': <Settings className="sidebar__icon-svg" />,
  'Wall Templates': <LayoutTemplate className="sidebar__icon-svg" />,
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
  if (item.label.startsWith('Purchase')) return ICON_MAP['Purchases'];
  if (item.label.startsWith('Suppliers')) return ICON_MAP['Suppliers'];
  if (item.label.startsWith('Dispatch')) return ICON_MAP['Dispatch'];
  if (item.label.startsWith('Labour')) return ICON_MAP['Labour'];
  if (item.label.startsWith('Expenses')) return ICON_MAP['Expenses'];
  if (item.label.startsWith('Equipment')) return ICON_MAP['Equipment'];

  return ICON_MAP[item.label] || <HelpCircle className="sidebar__icon-svg" />;
};

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',     roles: ['super_admin', 'branch'] },
  { label: 'Branches',      path: '/branches',      roles: ['super_admin'] },
  { divider: true, label: 'Operations',             roles: ['branch'] },
  { label: 'Raw Materials', path: '/raw-materials', roles: ['branch'] },
  { label: 'Products',         path: '/products',                roles: ['branch'], end: true },
  { label: 'Wall Templates',   path: '/products/wall-templates', roles: ['branch'] },
  { label: 'Production',       path: '/production',              roles: ['branch'] },
  { divider: true, label: 'Inventory',              roles: ['branch'] },
  { label: 'Inventory',     path: '/inventory',                roles: ['branch'] },
  { divider: true, label: 'Sales',                  roles: ['branch'] },
  { label: 'Customers',     path: '/customers',     roles: ['branch'] },
  { label: 'Projects',      path: '/projects',      roles: ['branch'] },
  { label: 'Quotations',    path: '/quotations',    roles: ['branch'] },
  { label: 'Invoices',      path: '/invoices',      roles: ['branch'] },
  { label: 'Payments',      path: '/payments',      roles: ['branch'] },
  { divider: true, label: 'Logistics',              roles: ['branch'] },
  { label: 'Suppliers', path: '/purchases/suppliers', roles: ['branch'] },
  { label: 'Dispatches',    path: '/dispatch',      roles: ['branch'] },
  { label: 'Equipment',     path: '/equipment',     roles: ['branch'] },
  { divider: true, label: 'Resources',              roles: ['branch'] },
  { label: 'Labour',        path: '/labour',        roles: ['branch'] },
  { label: 'Expenses',      path: '/expenses',      roles: ['branch'] },
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
                end={item.end ?? false}
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
