// Stub – replace with full implementation
import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return (
    <div className="container-app py-24 text-center">
      <p className="text-6xl mb-4">🔩</p>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Page Not Found</h1>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
        Back to Home
      </Link>
    </div>
  );
}
