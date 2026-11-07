import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/fonts";
import "./styles/globals.css";
import { SelectedVehicleProvider } from "./features/vehicles/SelectedVehicleContext";
import { CartProvider } from "./features/cart/CartContext";
import { AuthProvider } from "./features/auth/AuthContext";
import { I18nProvider } from "./i18n";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider>
    <BrowserRouter>
      <AuthProvider>
        <SelectedVehicleProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SelectedVehicleProvider>
      </AuthProvider>
    </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
