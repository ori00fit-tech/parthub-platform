import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import { SelectedVehicleProvider } from "./features/vehicles/SelectedVehicleContext";
import { CartProvider } from "./features/cart/CartContext";
import { AuthProvider } from "./features/auth/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SelectedVehicleProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SelectedVehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
