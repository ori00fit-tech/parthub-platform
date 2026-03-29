import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import PartsPage from "./pages/PartsPage";

function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-3">
        Find the Right Part for Your Vehicle
      </h1>

      <p className="text-gray-600">
        UK marketplace for auto parts — fast delivery across Great Britain.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/parts" element={<PartsPage />} />
      </Routes>
    </MainLayout>
  );
}
