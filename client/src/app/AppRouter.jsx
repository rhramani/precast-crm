import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentRole } from '../store/slices/authSlice';
import AppShell from '../components/layout/AppShell';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import BranchesPage from '../pages/branches/BranchesPage';
import ProfilePage from '../pages/ProfilePage';
import ProductionOrderDetailPage from '../pages/production/ProductionOrderDetailPage';
import SiteDetailPage from '../pages/projects/SiteDetailPage';
import PurchaseOrderDetailPage from '../pages/purchases/PurchaseOrderDetailPage';
import ProductionReportPage from '../pages/reports/ProductionReportPage';
import InventoryReportPage from '../pages/reports/InventoryReportPage';
import CustomerReportPage from '../pages/reports/CustomerReportPage';
import ProjectReportPage from '../pages/reports/ProjectReportPage';
import FinancialReportPage from '../pages/reports/FinancialReportPage';
import SystemSettingsPage from '../pages/system/SystemSettingsPage';
import AuditLogsPage from '../pages/system/AuditLogsPage';
import SettingsLayout from '../components/layout/SettingsLayout';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import RawMaterialsPage from '../pages/rawMaterials/RawMaterialsPage';
import RawMaterialCategoriesPage from '../pages/rawMaterials/RawMaterialCategoriesPage';
import MaterialLedgerPage from '../pages/rawMaterials/MaterialLedgerPage';
import ProductsPage from '../pages/products/ProductsPage';
import ProductCategoriesPage from '../pages/products/ProductCategoriesPage';
import BomPage from '../pages/products/BomPage';
import WallTemplatePage from '../pages/products/WallTemplatePage';
import CapacityCalculatorPage from '../pages/production/CapacityCalculatorPage';
import ProductionOrdersPage from '../pages/production/ProductionOrdersPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import CustomersPage from '../pages/customers/CustomersPage';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage';
import ProjectsPage from '../pages/projects/ProjectsPage';
import ProjectSitesPage from '../pages/projects/ProjectSitesPage';
import SiteRequirementCalculatorPage from '../pages/projects/SiteRequirementCalculatorPage';
import SiteCostBreakdownPage from '../pages/projects/SiteCostBreakdownPage';
import QuotationsPage from '../pages/quotations/QuotationsPage';
import QuotationDetailPage from '../pages/quotations/QuotationDetailPage';
import PurchaseOrdersPage from '../pages/purchases/PurchaseOrdersPage';
import SuppliersPage from '../pages/purchases/SuppliersPage';
import DispatchesPage from '../pages/dispatch/DispatchesPage';
import DispatchDetailPage from '../pages/dispatch/DispatchDetailPage';
import InstallationsPage from '../pages/installation/InstallationsPage';
import InstallationDetailPage from '../pages/installation/InstallationDetailPage';
import LabourPage from '../pages/labour/LabourPage';
import ExpensesPage from '../pages/expenses/ExpensesPage';
import ReportsPage from '../pages/reports/ReportsPage';
import PaymentsPage from '../pages/payments/PaymentsPage';

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * Wraps children in AppShell layout.
 * - requiredRole: only this role is allowed (others → /dashboard)
 * - excludeRole:  this role is NOT allowed (→ /dashboard); used to block super_admin from operational routes
 */
const ProtectedRoute = ({ children, requiredRole, excludeRole }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectCurrentRole);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based guard (e.g. Super Admin only routes)
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // Exclude guard (e.g. block super_admin from operational routes)
  if (excludeRole && role === excludeRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

/**
 * PublicRoute — redirects authenticated users away from /login back to dashboard.
 */
const PublicRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const AppRouter = () => (
  <Routes>
    {/* ── Public ── */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

    {/* ── Dashboard ── */}
    <Route path="/dashboard"
      element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
    />

    {/* ── Branches (Super Admin only) ── */}
    <Route path="/branches"
      element={<ProtectedRoute requiredRole="super_admin"><BranchesPage /></ProtectedRoute>}
    />
    <Route path="/branches/:id"
      element={<ProtectedRoute requiredRole="super_admin"><BranchesPage /></ProtectedRoute>}
    />

    {/* ── Settings / Users ── */}
    <Route
      path="/settings"
      element={<ProtectedRoute requiredRole="super_admin"><SettingsLayout /></ProtectedRoute>}
    >
      <Route path="system" element={<SystemSettingsPage />} />
      <Route path="audit-logs" element={<AuditLogsPage />} />

    </Route>
    <Route path="/settings/profile"
      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
    />

    {/* ── Notifications ── */}
    <Route path="/notifications"
      element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
    />

    {/* ── Raw Materials ── */}
    <Route path="/raw-materials"
      element={<ProtectedRoute excludeRole="super_admin"><RawMaterialsPage /></ProtectedRoute>}
    />
    <Route path="/raw-materials/categories"
      element={<ProtectedRoute excludeRole="super_admin"><RawMaterialCategoriesPage /></ProtectedRoute>}
    />
    <Route path="/raw-materials/:id/ledger"
      element={<ProtectedRoute excludeRole="super_admin"><MaterialLedgerPage /></ProtectedRoute>}
    />

    {/* ── Products & BOM ── */}
    <Route path="/products"
      element={<ProtectedRoute excludeRole="super_admin"><ProductsPage /></ProtectedRoute>}
    />
    <Route path="/products/categories"
      element={<ProtectedRoute excludeRole="super_admin"><ProductCategoriesPage /></ProtectedRoute>}
    />
    <Route path="/products/:id/bom"
      element={<ProtectedRoute excludeRole="super_admin"><BomPage /></ProtectedRoute>}
    />
    <Route path="/products/wall-templates"
      element={<ProtectedRoute excludeRole="super_admin"><WallTemplatePage /></ProtectedRoute>}
    />

    {/* ── Production ── */}
    <Route path="/production"
      element={<ProtectedRoute excludeRole="super_admin"><ProductionOrdersPage /></ProtectedRoute>}
    />
    <Route path="/production/capacity-calculator"
      element={<ProtectedRoute excludeRole="super_admin"><CapacityCalculatorPage /></ProtectedRoute>}
    />
    <Route path="/production/:id"
      element={<ProtectedRoute excludeRole="super_admin"><ProductionOrderDetailPage /></ProtectedRoute>}
    />

    {/* ── Inventory ── */}
    <Route path="/inventory"
      element={<ProtectedRoute excludeRole="super_admin"><InventoryPage /></ProtectedRoute>}
    />

    {/* ── Customers ── */}
    <Route path="/customers"
      element={<ProtectedRoute excludeRole="super_admin"><CustomersPage /></ProtectedRoute>}
    />
    <Route path="/customers/:id"
      element={<ProtectedRoute excludeRole="super_admin"><CustomerDetailPage /></ProtectedRoute>}
    />

    {/* ── Projects & Sites ── */}
    <Route path="/projects"
      element={<ProtectedRoute excludeRole="super_admin"><ProjectsPage /></ProtectedRoute>}
    />
    <Route path="/projects/:id/sites"
      element={<ProtectedRoute excludeRole="super_admin"><ProjectSitesPage /></ProtectedRoute>}
    />
    <Route path="/sites/:id"
      element={<ProtectedRoute excludeRole="super_admin"><SiteDetailPage /></ProtectedRoute>}
    />
    <Route path="/sites/:id/requirement-calculator"
      element={<ProtectedRoute excludeRole="super_admin"><SiteRequirementCalculatorPage /></ProtectedRoute>}
    />
    <Route path="/sites/:id/cost-breakdown"
      element={<ProtectedRoute excludeRole="super_admin"><SiteCostBreakdownPage /></ProtectedRoute>}
    />

    {/* ── Quotations ── */}
    <Route path="/quotations"
      element={<ProtectedRoute excludeRole="super_admin"><QuotationsPage /></ProtectedRoute>}
    />
    <Route path="/quotations/:id"
      element={<ProtectedRoute excludeRole="super_admin"><QuotationDetailPage /></ProtectedRoute>}
    />


    {/* ── Payments ── */}
    <Route path="/payments"
      element={<ProtectedRoute excludeRole="super_admin"><PaymentsPage /></ProtectedRoute>}
    />

    {/* ── Purchases ── */}
    <Route path="/purchases"
      element={<Navigate to="/purchases/suppliers" replace />}
    />
    <Route path="/purchases/suppliers"
      element={<ProtectedRoute excludeRole="super_admin"><SuppliersPage /></ProtectedRoute>}
    />
    <Route path="/purchases/orders/:id"
      element={<ProtectedRoute excludeRole="super_admin"><PurchaseOrderDetailPage /></ProtectedRoute>}
    />

    {/* ── Dispatch ── */}
    <Route path="/dispatch"
      element={<ProtectedRoute excludeRole="super_admin"><DispatchesPage /></ProtectedRoute>}
    />
    <Route path="/dispatch/:id"
      element={<ProtectedRoute excludeRole="super_admin"><DispatchDetailPage /></ProtectedRoute>}
    />

    {/* ── Installation ── */}
    <Route path="/installation"
      element={<ProtectedRoute excludeRole="super_admin"><InstallationsPage /></ProtectedRoute>}
    />
    <Route path="/installation/:id"
      element={<ProtectedRoute excludeRole="super_admin"><InstallationDetailPage /></ProtectedRoute>}
    />

    {/* ── Labour ── */}
    <Route path="/labour"
      element={<ProtectedRoute excludeRole="super_admin"><LabourPage /></ProtectedRoute>}
    />




    {/* ── Expenses ── */}
    <Route path="/expenses"
      element={<ProtectedRoute excludeRole="super_admin"><ExpensesPage /></ProtectedRoute>}
    />

    {/* ── Reports ── */}
    <Route path="/reports"
      element={<ProtectedRoute excludeRole="super_admin"><ReportsPage /></ProtectedRoute>}
    />
    <Route path="/reports/production"
      element={<ProtectedRoute excludeRole="super_admin"><ProductionReportPage /></ProtectedRoute>}
    />
    <Route path="/reports/inventory"
      element={<ProtectedRoute excludeRole="super_admin"><InventoryReportPage /></ProtectedRoute>}
    />
    <Route path="/reports/customer"
      element={<ProtectedRoute excludeRole="super_admin"><CustomerReportPage /></ProtectedRoute>}
    />
    <Route path="/reports/project"
      element={<ProtectedRoute excludeRole="super_admin"><ProjectReportPage /></ProtectedRoute>}
    />
    <Route path="/reports/financial"
      element={<ProtectedRoute excludeRole="super_admin"><FinancialReportPage /></ProtectedRoute>}
    />

    {/* ── Defaults ── */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRouter;
