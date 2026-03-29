import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminLayout from "./components/layout/AdminLayout";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SellersPage from "./pages/SellersPage";
import SellerDetailsPage from "./pages/SellerDetailsPage";
import PartsPage from "./pages/PartsPage";
import PartDetailsPage from "./pages/PartDetailsPage";
import CategoriesPage from "./pages/CategoriesPage";
import VehiclesPage from "./pages/VehiclesPage";
import OrdersPage from "./pages/OrdersPage";
import ReviewsPage from "./pages/ReviewsPage";
import NotFoundPage from "./pages/NotFoundPage";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/sellers/:id" element={<SellerDetailsPage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/:id" element={<PartDetailsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
