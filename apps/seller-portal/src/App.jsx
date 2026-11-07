import { Navigate, Routes, Route } from "react-router-dom";
import SellerLayout from "./components/layout/SellerLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import PartsPage from "./pages/PartsPage";
import PartWizardPage from "./pages/PartWizardPage";
import PartImportPage from "./pages/PartImportPage";
import PartEditPage from "./pages/PartEditPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import ReviewsPage from "./pages/ReviewsPage";
import InsightsPage from "./pages/InsightsPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import RequestsInboxPage from "./pages/RequestsInboxPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";
import AgreementPage from "./pages/AgreementPage";
import IssuesPage from "./pages/IssuesPage";
import LegalPage from "./pages/LegalPage";
import NotFoundPage from "./pages/NotFoundPage";
import StatementPage from "./pages/StatementPage";

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
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/legal/:doc" element={<LegalPage />} />

      <Route
        path="/issues"
        element={
          <ProtectedShell>
            <IssuesPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/agreement"
        element={
          <ProtectedShell>
            <AgreementPage />
          </ProtectedShell>
        }
      />

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
        path="/statement"
        element={
          <ProtectedShell>
            <StatementPage />
          </ProtectedShell>
        }
      />

      <Route
        path="/parts/import"
        element={
          <ProtectedShell>
            <PartImportPage />
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
