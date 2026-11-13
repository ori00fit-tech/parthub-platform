import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/fonts";
import "./styles/globals.css";
import { configureImages } from "@parthub/shared";
import { BASE_URL } from "./lib/api";

// Photos: the API's address, and smaller copies when Cloudflare image
// resizing is on (VITE_IMAGE_RESIZING=1, see packages/shared/src/lib/images.ts).
configureImages({ apiBase: BASE_URL, resize: import.meta.env.VITE_IMAGE_RESIZING === "1" });
import { I18nProvider } from "./i18n";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
