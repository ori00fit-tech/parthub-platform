import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Checking seller session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}
