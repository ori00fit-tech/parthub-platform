import { Suspense } from "react";
import { lazyPage } from "@parthub/shared";
import { Navigate, Routes, Route } from "react-router-dom";
import SellerLayout from "./components/layout/SellerLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";

import AuthPage from "./pages/AuthPage";
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage"));
const DeleteAccountPage = lazyPage(() => import("./pages/DeleteAccountPage"));
import DashboardPage from "./pages/DashboardPage";
const PartsPage = lazyPage(() => import("./pages/PartsPage"));
const PartWizardPage = lazyPage(() => import("./pages/PartWizardPage"));
const PartImportPage = lazyPage(() => import("./pages/PartImportPage"));
const PhotosPage = lazyPage(() => import("./pages/PhotosPage"));
const PartEditPage = lazyPage(() => import("./pages/PartEditPage"));
const OrdersPage = lazyPage(() => import("./pages/OrdersPage"));
const OrderDetailsPage = lazyPage(() => import("./pages/OrderDetailsPage"));
const ReviewsPage = lazyPage(() => import("./pages/ReviewsPage"));
const InsightsPage = lazyPage(() => import("./pages/InsightsPage"));
const StoreSettingsPage = lazyPage(() => import("./pages/StoreSettingsPage"));
const RequestsInboxPage = lazyPage(() => import("./pages/RequestsInboxPage"));
const RequestDetailsPage = lazyPage(() => import("./pages/RequestDetailsPage"));
const AgreementPage = lazyPage(() => import("./pages/AgreementPage"));
const IssuesPage = lazyPage(() => import("./pages/IssuesPage"));
const LegalPage = lazyPage(() => import("./pages/LegalPage"));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"));
const StatementPage = lazyPage(() => import("./pages/StatementPage"));

// Pages other than the first ones a visitor sees load on demand (smaller
// first download); this shows while one loads.
function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
    </div>
  );
}

function ProtectedShell({ children }) {
  return (
    <ProtectedRoute>
      <SellerLayout>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </SellerLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ForgotPasswordPage withLink />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
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
          path="/parts/photos"
          element={
            <ProtectedShell>
              <PhotosPage />
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
    </Suspense>
  );
}
