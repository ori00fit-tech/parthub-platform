import { Suspense } from "react";
import { lazyPage } from "@parthub/shared";
import { Routes, Route } from "react-router-dom";
import MainLayout, { PageFallback } from "./components/layout/MainLayout";

import HomePage from "./pages/HomePage";
import PartsPage from "./pages/PartsPage";
import PartDetailsPage from "./pages/PartDetailsPage";
const VehicleSelectorPage = lazyPage(() => import("./pages/VehicleSelectorPage"));
const CartPage = lazyPage(() => import("./pages/CartPage"));
const AuthPage = lazyPage(() => import("./pages/AuthPage"));
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage"));
const DeleteAccountPage = lazyPage(() => import("./pages/DeleteAccountPage"));
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"));
const CheckoutSuccessPage = lazyPage(() => import("./pages/CheckoutSuccessPage"));
const ComparePage = lazyPage(() => import("./pages/ComparePage"));
const SellerProfilePage = lazyPage(() => import("./pages/SellerProfilePage"));
const OrdersPage = lazyPage(() => import("./pages/OrdersPage"));
const AccountPage = lazyPage(() => import("./pages/AccountPage"));
const OrderTrackingPage = lazyPage(() => import("./pages/OrderTrackingPage"));
const RequestPartPage = lazyPage(() => import("./pages/RequestPartPage"));
const MyRequestsPage = lazyPage(() => import("./pages/MyRequestsPage"));
const RequestDetailsPage = lazyPage(() => import("./pages/RequestDetailsPage"));
const LegalPage = lazyPage(() => import("./pages/LegalPage"));
const SellPage = lazyPage(() => import("./pages/SellPage"));
const LandingPage = lazyPage(() => import("./pages/LandingPage"));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"));


export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/parts/:slug" element={<PartDetailsPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/pieces/:category" element={<LandingPage />} />
          <Route path="/voiture/:make" element={<LandingPage />} />
          <Route path="/voiture/:make/:model" element={<LandingPage />} />
          <Route path="/voiture/:make/:model/:category" element={<LandingPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/legal/:doc" element={<LegalPage />} />

          <Route path="/vehicle-selector" element={<VehicleSelectorPage />} />

          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage withLink />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/compare" element={<ComparePage />} />

          <Route path="/sellers/:slug" element={<SellerProfilePage />} />

          <Route path="/request-part" element={<RequestPartPage />} />
          <Route path="/requests" element={<MyRequestsPage />} />
          <Route path="/requests/:id" element={<RequestDetailsPage />} />

          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderNumber/tracking" element={<OrderTrackingPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
