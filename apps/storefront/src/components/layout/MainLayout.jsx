import { Link } from "react-router-dom";

export default function MainLayout({ children }) {
  return (
    <div>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-blue-600">
            PartHub UK 🇬🇧
          </Link>

          <nav className="flex gap-4 text-sm">
            <Link to="/parts" className="hover:text-blue-600">Parts</Link>
            <Link to="/cart" className="hover:text-blue-600">Cart</Link>
            <Link to="/account" className="hover:text-blue-600">Account</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
