import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
      <div className="container-app grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="text-white font-bold text-lg mb-3">PartHub</p>
          <p className="text-sm">The marketplace for quality auto parts.</p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/parts" className="hover:text-white transition">All Parts</Link></li>
            <li><Link to="/categories" className="hover:text-white transition">Categories</Link></li>
            <li><Link to="/vehicle-selector" className="hover:text-white transition">Find by Vehicle</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Sell</p>
          <ul className="space-y-2 text-sm">
            <li><a href="https://seller.parthub.site" className="hover:text-white transition">Seller Portal</a></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Account</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth" className="hover:text-white transition">Sign In</Link></li>
            <li><Link to="/orders" className="hover:text-white transition">My Orders</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-app mt-8 pt-6 border-t border-gray-800 text-sm text-center">
        © {new Date().getFullYear()} PartHub. All rights reserved.
      </div>
    </footer>
  );
}
