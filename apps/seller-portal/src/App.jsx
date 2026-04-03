import { Routes, Route } from "react-router-dom";
import SellerLayout from "./components/layout/SellerLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import PartsPage from "./pages/PartsPage";
import PartCreatePage from "./pages/PartCreatePage";
import PartCreateWithUploadPage from "./pages/PartCreateWithUploadPage";
import PartEditPage from "./pages/PartEditPage";
import MediaUploadPage from "./pages/MediaUploadPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import ReviewsPage from "./pages/ReviewsPage";
import InsightsPage from "./pages/InsightsPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
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
            <PartCreatePage />
          </ProtectedShell>
        }
      />

      <Route
        path="/parts/create"
        element={
          <ProtectedShell>
            <PartCreateWithUploadPage />
          </ProtectedShell>
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
        path="/media-upload"
        element={
          <ProtectedShell>
            <MediaUploadPage />
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
        path="/reviews"
        element={
          <ProtectedShell>
            <ReviewsPage />
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
