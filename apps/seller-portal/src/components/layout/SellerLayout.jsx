import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/parts", label: "My Parts", icon: "🔩" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/reviews", label: "Reviews", icon: "⭐" },
  { to: "/store", label: "Store Settings", icon: "🏪" },
];

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <a href="https://parthub.site" className="text-blue-600 font-bold text-lg">PartHub</a>
          <p className="text-xs text-gray-400 mt-0.5">Seller Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate mb-3">{user?.email}</p>
          <button onClick={() => { logout(); navigate("/auth"); }} className="text-xs text-red-400 hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
