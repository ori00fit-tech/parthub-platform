import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";

import HomePage from "./pages/HomePage";
import PartsPage from "./pages/PartsPage";
import PartDetailsPage from "./pages/PartDetailsPage";
import VehicleSelectorPage from "./pages/VehicleSelectorPage";
import CartPage from "./pages/CartPage";
import AuthPage from "./pages/AuthPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import ComparePage from "./pages/ComparePage";
import SellerProfilePage from "./pages/SellerProfilePage";
import OrdersPage from "./pages/OrdersPage";
import AccountPage from "./pages/AccountPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import RequestPartPage from "./pages/RequestPartPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";
import LegalPage from "./pages/LegalPage";
import SellPage from "./pages/SellPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/:slug" element={<PartDetailsPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />

        <Route path="/vehicle-selector" element={<VehicleSelectorPage />} />

        <Route path="/cart" element={<CartPage />} />
        <Route path="/auth" element={<AuthPage />} />
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
  );
}
