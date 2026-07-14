import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageContainer from './PageContainer';

/**
 * AppShell — top-level layout wrapper.
 * Renders Sidebar + Topbar fixed, PageContainer as scrollable content area.
 * Matches the design doc layout:
 *   <AppShell>
 *     <Sidebar />
 *     <Topbar />
 *     <PageContainer>
 *       <Breadcrumbs />
 *       <PageHeader />
 *       <RouteOutlet />   ← children
 *     </PageContainer>
 *   </AppShell>
 */
const AppShell = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <Topbar />
      <PageContainer>
        {children}
      </PageContainer>
    </div>
  );
};

export default AppShell;
