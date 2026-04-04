import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-slate-950 text-gray-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-black text-white">PartHub</p>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Vehicle-aware auto parts marketplace focused on better fitment discovery,
            seller trust, and stronger buying confidence.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white">Marketplace</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/parts" className="transition hover:text-white">All Parts</Link></li>
            <li><Link to="/vehicle-selector" className="transition hover:text-white">Find by Vehicle</Link></li>
            <li><Link to="/compare" className="transition hover:text-white">Compare Parts</Link></li>
            <li><Link to="/cart" className="transition hover:text-white">Cart</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white">Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/auth" className="transition hover:text-white">Sign In</Link></li>
            <li><Link to="/account" className="transition hover:text-white">My Account</Link></li>
            <li><Link to="/orders" className="transition hover:text-white">My Orders</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
