import { Routes, Route, Link } from "react-router-dom";
import MediaUploadPage from "./pages/MediaUploadPage";
import PartCreateWithUploadPage from "./pages/PartCreateWithUploadPage";

function Home() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Seller Portal</h1>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/media-upload"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Upload media
        </Link>

        <Link
          to="/parts/create"
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Create part + image
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/media-upload" element={<MediaUploadPage />} />
      <Route path="/parts/create" element={<PartCreateWithUploadPage />} />
    </Routes>
  );
}
