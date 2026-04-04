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
import OrdersPage from "./pages/OrdersPage";
import AccountPage from "./pages/AccountPage";
import SearchPage from "./pages/SearchPage";
import WishlistPage from "./pages/WishlistPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetailsPage from "./pages/CategoryDetailsPage";
import SellerPage from "./pages/SellerPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/:slug" element={<PartDetailsPage />} />

        <Route path="/vehicle-selector" element={<VehicleSelectorPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:slug" element={<CategoryDetailsPage />} />

        <Route path="/cart" element={<CartPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/compare" element={<ComparePage />} />

        <Route path="/account" element={<AccountPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderNumber/tracking" element={<OrderTrackingPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />

        <Route path="/sellers/:slug" element={<SellerPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
}
