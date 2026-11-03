import { Link } from "react-router-dom";
import BrandMark, { Wordmark } from "../brand/BrandMark";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-[#0B1222] text-white">
      <div className="mx-auto grid max-w-[1380px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <Wordmark />
          </div>

          <p className="mt-4 max-w-xs text-sm leading-7 text-faint">
            The trusted marketplace for OEM and aftermarket auto parts. Search by vehicle, compare
            listings, and buy from sellers with clearer trust signals.
          </p>

          <div className="mt-5 flex gap-2">
            {["𝕏", "f", "in", "▶"].map((item) => (
              <div
                key={item}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Shop</div>
          <div className="space-y-3 text-sm text-faint">
            <Link to="/parts" className="block hover:text-blue-300">Browse All Parts</Link>
            <Link to="/vehicle-selector" className="block hover:text-blue-300">Shop by Vehicle</Link>
            <Link to="/parts?q=oem" className="block hover:text-blue-300">OEM Parts</Link>
            <Link to="/parts?sort=price_asc" className="block hover:text-blue-300">Flash Deals</Link>
            <Link to="/compare" className="block hover:text-blue-300">Compare Parts</Link>
          </div>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Account</div>
          <div className="space-y-3 text-sm text-faint">
            <Link to="/auth" className="block hover:text-blue-300">Sign In / Register</Link>
            <Link to="/orders" className="block hover:text-blue-300">My Orders</Link>
            <Link to="/vehicle-selector" className="block hover:text-blue-300">My Garage</Link>
            <Link to="/compare" className="block hover:text-blue-300">Saved Compare</Link>
            <Link to="/account" className="block hover:text-blue-300">My Account</Link>
          </div>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Support</div>
          <div className="space-y-3 text-sm text-faint">
            <Link to="/orders" className="block hover:text-blue-300">Track My Order</Link>
            <Link to="/checkout/success" className="block hover:text-blue-300">Order Confirmation</Link>
            <Link to="/parts" className="block hover:text-blue-300">Seller Center</Link>
            <Link to="/account" className="block hover:text-blue-300">Contact Support</Link>
            <Link to="/auth" className="block hover:text-blue-300">Help Center</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-faint sm:px-6 lg:px-6">
          <div>© 2026 PartHub Inc. All rights reserved.</div>
          <div className="flex flex-wrap gap-2">
            {["VISA", "MASTERCARD", "PAYPAL", "APPLE PAY", "GOOGLE PAY"].map((item) => (
              <span
                key={item}
                className="rounded bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
