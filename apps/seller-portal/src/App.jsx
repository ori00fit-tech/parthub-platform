import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SellerLayout from "./components/layout/SellerLayout";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import PartsPage from "./pages/PartsPage";
import PartCreatePage from "./pages/PartCreatePage";
import PartEditPage from "./pages/PartEditPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import ReviewsPage from "./pages/ReviewsPage";
import NotFoundPage from "./pages/NotFoundPage";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<PrivateRoute><SellerLayout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/new" element={<PartCreatePage />} />
        <Route path="/parts/:id/edit" element={<PartEditPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/store" element={<StoreSettingsPage />} />
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
