import { Suspense } from "react";
import { lazyPage } from "@parthub/shared";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminLayout, { PageFallback } from "./components/layout/AdminLayout";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
const SellersPage = lazyPage(() => import("./pages/SellersPage"));
const SellerDetailsPage = lazyPage(() => import("./pages/SellerDetailsPage"));
const PartsPage = lazyPage(() => import("./pages/PartsPage"));
const PartDetailsPage = lazyPage(() => import("./pages/PartDetailsPage"));
const CategoriesPage = lazyPage(() => import("./pages/CategoriesPage"));
const VehiclesPage = lazyPage(() => import("./pages/VehiclesPage"));
const OrdersPage = lazyPage(() => import("./pages/OrdersPage"));
const IssuesPage = lazyPage(() => import("./pages/IssuesPage"));
const PartNumbersPage = lazyPage(() => import("./pages/PartNumbersPage"));
const ReviewsPage = lazyPage(() => import("./pages/ReviewsPage"));
const AnalyticsPage = lazyPage(() => import("./pages/AnalyticsPage"));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"));
const RevenuePage = lazyPage(() => import("./pages/RevenuePage"));
const InvoicesPage = lazyPage(() => import("./pages/InvoicesPage"));
const CarriersPage = lazyPage(() => import("./pages/CarriersPage"));
const WhatsAppPage = lazyPage(() => import("./pages/WhatsAppPage"));
const WhatsAppTemplatesPage = lazyPage(() => import("./pages/WhatsAppTemplatesPage"));
const AuditLogPage = lazyPage(() => import("./pages/AuditLogPage"));
const InvestorPage = lazyPage(() => import("./pages/InvestorPage"));
const AccountPage = lazyPage(() => import("./pages/AccountPage"));


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
    <Suspense fallback={<PageFallback />}>
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
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/part-numbers" element={<PartNumbersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/revenue" element={<RevenuePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/carriers" element={<CarriersPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/whatsapp/templates" element={<WhatsAppTemplatesPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/investor" element={<InvestorPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
