import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import HomePage from "./pages/HomePage";
import PartsPage from "./pages/PartsPage";
import PartDetailsPage from "./pages/PartDetailsPage";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/:slug" element={<PartDetailsPage />} />
      </Routes>
    </MainLayout>
  );
}
