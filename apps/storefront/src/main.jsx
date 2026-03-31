import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import { SelectedVehicleProvider } from "./features/vehicles/SelectedVehicleContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SelectedVehicleProvider>
        <App />
      </SelectedVehicleProvider>
    </BrowserRouter>
  </React.StrictMode>
);
