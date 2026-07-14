import { useSelector } from 'react-redux';
import { selectSidebarOpen } from '../../store/slices/uiSlice';
import './PageContainer.css';

/**
 * PageContainer — the scrollable content area to the right of the Sidebar.
 * Automatically adjusts its left margin based on sidebar open/collapsed state.
 */
const PageContainer = ({ children }) => {
  const sidebarOpen = useSelector(selectSidebarOpen);

  return (
    <main
      className={`page-container ${sidebarOpen ? 'page-container--sidebar-open' : 'page-container--sidebar-collapsed'}`}
    >
      {children}
    </main>
  );
};

export default PageContainer;
