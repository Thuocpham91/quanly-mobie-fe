import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import CustomersPage from './pages/CustomersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import UsersPage from './pages/UsersPage';
import BranchesPage from './pages/BranchesPage';
import InventoryPage from './pages/InventoryPage';
import InventoryImportPage from './pages/InventoryImportPage';
import DistributorsPage from './pages/DistributorsPage';
import ProductsPage from './pages/ProductsPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import ProductPricesPage from './pages/ProductPricesPage';
import POSPage from './pages/POSPage';
import PoliciesPage from './pages/PoliciesPage';
import SalesPage from './pages/SalesPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import StockHistoryPage from './pages/StockHistoryPage';
import StocktakeListPage from './pages/StocktakeListPage';
import StocktakeFormPage from './pages/StocktakeFormPage';
import InventoryTransferPage from './pages/InventoryTransferPage';
import PermissionGuard from './guards/PermissionGuard';

import { BranchProvider } from './context/BranchContext';

const queryClient = new QueryClient();

/**
 * Helper: bọc page component trong PermissionGuard
 * Đọc selectedBranchId từ localStorage mỗi lần render
 */
function P({ path, children }: { path: string; children: React.ReactNode }) {
  const selectedBranchId = localStorage.getItem('selectedBranchId') || '';
  return (
    <PermissionGuard path={path} selectedBranchId={selectedBranchId}>
      {children}
    </PermissionGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BranchProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<P path="/admin"><DashboardHome /></P>} />
              <Route path="customers"               element={<P path="/admin/customers"><CustomersPage /></P>} />
              <Route path="appointments"            element={<P path="/admin/appointments"><AppointmentsPage /></P>} />
              <Route path="inventory"               element={<P path="/admin/inventory"><InventoryPage /></P>} />
              <Route path="inventory/import"        element={<P path="/admin/inventory/import"><InventoryImportPage /></P>} />
              <Route path="inventory/transfer"      element={<P path="/admin/inventory/transfer"><InventoryTransferPage /></P>} />
              <Route path="inventory/history"       element={<P path="/admin/inventory/history"><StockHistoryPage /></P>} />
              <Route path="inventory/stocktakes"    element={<P path="/admin/inventory/stocktakes"><StocktakeListPage /></P>} />
              <Route path="inventory/stocktakes/:id"element={<P path="/admin/inventory/stocktakes"><StocktakeFormPage /></P>} />
              <Route path="products"                element={<P path="/admin/products"><ProductsPage /></P>} />
              <Route path="product-prices"          element={<P path="/admin/product-prices"><ProductPricesPage /></P>} />
              <Route path="pos"                     element={<P path="/admin/pos"><POSPage /></P>} />
              <Route path="policies"                element={<P path="/admin/policies"><PoliciesPage /></P>} />
              <Route path="sales"                   element={<P path="/admin/sales"><SalesPage /></P>} />
              <Route path="orders"                  element={<P path="/admin/orders"><SalesOrdersPage /></P>} />
              <Route path="distributors"            element={<P path="/admin/distributors"><DistributorsPage /></P>} />
              <Route path="users"                   element={<P path="/admin/users"><UsersPage /></P>} />
              <Route path="roles"                   element={<P path="/admin/roles"><RolesPage /></P>} />
              <Route path="branches"                element={<P path="/admin/branches"><BranchesPage /></P>} />
              <Route path="settings"                element={<P path="/admin/settings"><SettingsPage /></P>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BranchProvider>
    </QueryClientProvider>
  );
}

export default App;
