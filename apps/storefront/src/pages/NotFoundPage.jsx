// Stub – replace with full implementation
import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return (
    <div className="container-app py-24 text-center">
      <p className="text-6xl mb-4">🔩</p>
      <h1 className="text-3xl font-bold text-ink mb-3">Page Not Found</h1>
      <p className="text-muted mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-deep transition">
        Back to Home
      </Link>
    </div>
  );
}
