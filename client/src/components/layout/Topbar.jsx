import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { selectCurrentUser, selectCurrentRole } from '../../store/slices/authSlice';
import { selectCurrentBranch, setCurrentBranch } from '../../store/slices/branchSlice';
import { selectSidebarOpen, toggleSidebar } from '../../store/slices/uiSlice';
import { useGetNotificationsQuery } from '../../store/api/notificationApi';
import { useLogoutMutation } from '../../store/api/authApi';
import { useGetBranchesQuery } from '../../store/api/branchApi';
import { useGetSettingsQuery } from '../../store/api/settingsApi';
import defaultLogo from '../../assets/logo.svg';
import './Topbar.css';

const Topbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectCurrentRole);
  const currentBranch = useSelector(selectCurrentBranch);
  const sidebarOpen = useSelector(selectSidebarOpen);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const branchDropdownRef = useRef(null);

  const { data: notifyRes } = useGetNotificationsQuery();
  const unreadCount = (notifyRes?.data?.notifications || []).filter(n => !n.isRead).length;

  const [logout] = useLogoutMutation();
  const { data: branchData } = useGetBranchesQuery({ limit: 100 }, { skip: role !== 'super_admin' });

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dynamic branding/logo settings
  const { data: settingsRes } = useGetSettingsQuery();
  const systemSettings = settingsRes?.data;
  const companyName = systemSettings?.companyName || 'GIR Precast';
  const logo = systemSettings?.logo || '';

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleBranchSwitch = (branch) => {
    dispatch(setCurrentBranch(branch));
    setBranchDropdownOpen(false);
  };

  return (
    <header className="topbar">
      {/* 1. Left brand box (matches sidebar width and switches width) */}
      <div className={`topbar__brand-area ${sidebarOpen ? 'topbar__brand-area--open' : 'topbar__brand-area--collapsed'}`}>
        {logo ? (
          <img src={logo} alt="Logo" className="topbar__logo-img" />
        ) : (
          <img src={defaultLogo} alt="Logo" className="topbar__logo-img" />
        )}
      </div>

      {/* 2. Main topbar section */}
      <div className="topbar__main">
        {/* Left main: Hamburger toggle menu & branch switcher */}
        <div className="topbar__main-left">
          <button
            className="topbar__menu-btn"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          
          {/* Branch switcher (super admin only) */}
          {role === 'super_admin' && (
            <div className="topbar__branch-switcher-wrapper" ref={branchDropdownRef} style={{ position: 'relative' }}>
              <div className="topbar__branch-switcher" onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}>
                <span className="topbar__branch-icon">🏢</span>
                <span className="topbar__branch-label">
                  {currentBranch?.branchName || 'All Branches'}
                </span>
                <span className="topbar__branch-caret">▾</span>
              </div>

              {branchDropdownOpen && (
                <div className="topbar__profile-dropdown" style={{ left: 0, right: 'auto', width: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                  <button
                    className="topbar__dropdown-item"
                    style={{ fontWeight: !currentBranch ? 'bold' : 'normal' }}
                    onClick={() => handleBranchSwitch(null)}
                  >
                    🏢 All Branches
                  </button>
                  {(branchData?.data?.branches || []).map((b) => (
                    <button
                      key={b._id}
                      className="topbar__dropdown-item"
                      style={{ fontWeight: currentBranch?._id === b._id ? 'bold' : 'normal' }}
                      onClick={() => handleBranchSwitch(b)}
                    >
                      🏢 {b.branchName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right main: Profile dropdown */}
        <div className="topbar__main-right">
          {/* Profile Dropdown Wrapper */}
          <div className="topbar__profile-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
            <div className="topbar__profile" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="topbar__avatar">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="topbar__profile-info">
                <span className="topbar__profile-name">{user?.name || 'User'}</span>
                <span className="topbar__profile-role">
                  {role === 'super_admin' ? 'Super Admin' : 'Branch User'}
                </span>
              </div>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className={`topbar__profile-caret ${dropdownOpen ? 'topbar__profile-caret--open' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {dropdownOpen && (
              <div className="topbar__profile-dropdown">
                <Link
                  to="/settings/profile"
                  className="topbar__dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-item-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Manage Profile</span>
                </Link>
                <button
                  className="topbar__dropdown-item topbar__dropdown-item--danger"
                  onClick={handleLogout}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropdown-item-icon">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
