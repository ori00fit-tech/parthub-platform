import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center shadow-sm">
        <div className="text-5xl mb-4">🧭</div>
        <h1 className="text-3xl font-bold text-gray-100">Page not found</h1>
        <p className="mt-2 text-sm text-gray-400">
          This admin route does not exist or has not been implemented yet.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Go to dashboard
          </Link>
          <Link
            to="/sellers"
            className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Sellers
          </Link>
          <Link
            to="/parts"
            className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Parts
          </Link>
        </div>
      </div>
    </section>
  );
}
