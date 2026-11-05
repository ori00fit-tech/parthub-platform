import { Navigate, Routes, Route } from "react-router-dom";
import SellerLayout from "./components/layout/SellerLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import PartsPage from "./pages/PartsPage";
import PartWizardPage from "./pages/PartWizardPage";
import PartEditPage from "./pages/PartEditPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import ReviewsPage from "./pages/ReviewsPage";
import InsightsPage from "./pages/InsightsPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import RequestsInboxPage from "./pages/RequestsInboxPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedShell({ children }) {
  return (
    <ProtectedRoute>
      <SellerLayout>{children}</SellerLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route
        path="/"
        element={
          <ProtectedShell>
            <DashboardPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/parts"
        element={
          <ProtectedShell>
            <PartsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/parts/new"
        element={
          <ProtectedShell>
            <PartWizardPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/parts/create"
        element={
          <Navigate to="/parts/new" replace />
        }
      />

      <Route
        path="/parts/:id/edit"
        element={
          <ProtectedShell>
            <PartEditPage />
          </ProtectedShell>
        }
      />


      <Route
        path="/orders"
        element={
          <ProtectedShell>
            <OrdersPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/orders/:id"
        element={
          <ProtectedShell>
            <OrderDetailsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/requests"
        element={
          <ProtectedShell>
            <RequestsInboxPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/requests/:id"
        element={
          <ProtectedShell>
            <RequestDetailsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/reviews"
        element={
          <ProtectedShell>
            <ReviewsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/insights"
        element={
          <ProtectedShell>
            <InsightsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/store-settings"
        element={
          <ProtectedShell>
            <StoreSettingsPage />
          </ProtectedShell>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedShell>
            <NotFoundPage />
          </ProtectedShell>
        }
      />
    </Routes>
  );
}
