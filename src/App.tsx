import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import PetsPage from './pages/PetsPage';
import CustomersPage from './pages/CustomersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import UsersPage from './pages/UsersPage';
import BranchesPage from './pages/BranchesPage';
import BoardingPage from './pages/BoardingPage';
import InventoryPage from './pages/InventoryPage';
import InventoryImportPage from './pages/InventoryImportPage';
import DistributorsPage from './pages/DistributorsPage';
import ProductsPage from './pages/ProductsPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import ProductPricesPage from './pages/ProductPricesPage';
import POSPage from './pages/POSPage';
import OrdersHistoryPage from './pages/OrdersHistoryPage';
import StockHistoryPage from './pages/StockHistoryPage';
import StocktakeListPage from './pages/StocktakeListPage';
import StocktakeFormPage from './pages/StocktakeFormPage';
import InventoryTransferPage from './pages/InventoryTransferPage';

import { BranchProvider } from './context/BranchContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BranchProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="pets" element={<PetsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="boarding" element={<BoardingPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/import" element={<InventoryImportPage />} />
              <Route path="inventory/transfer" element={<InventoryTransferPage />} />
              <Route path="inventory/history" element={<StockHistoryPage />} />
              <Route path="inventory/stocktakes" element={<StocktakeListPage />} />
              <Route path="inventory/stocktakes/:id" element={<StocktakeFormPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="product-prices" element={<ProductPricesPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="orders" element={<OrdersHistoryPage />} />
              <Route path="distributors" element={<DistributorsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </BranchProvider>
    </QueryClientProvider>
  );
}

export default App;
