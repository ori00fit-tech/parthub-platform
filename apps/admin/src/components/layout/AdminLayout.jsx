import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/sellers", label: "Sellers", icon: "🏪" },
  { to: "/parts", label: "Parts", icon: "🔩" },
  { to: "/categories", label: "Categories", icon: "📂" },
  { to: "/vehicles", label: "Vehicles", icon: "🚗" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/reviews", label: "Reviews", icon: "⭐" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-blue-400 font-bold text-base">PartHub</p>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-sm text-gray-300 truncate">{user?.name}</p>
          <p className="text-xs text-gray-600 truncate mb-3">{user?.email}</p>
          <button
            onClick={() => { logout(); navigate("/auth"); }}
            className="text-xs text-red-500 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
