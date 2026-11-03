import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { formatMAD, requestStatus, requestsApi } from "../features/requests/api";

export default function MyRequestsPage() {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let active = true;
    requestsApi
      .listMine()
      .then((res) => active && setRequests(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => active && setError(err.message || "Could not load your requests"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Sign in to see your part requests</h1>
        <Link to="/auth" className="mt-4 inline-flex h-11 items-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">My part requests</h1>
          <p className="mt-1 text-sm text-gray-500">Offers from sellers appear here as they come in.</p>
        </div>
        <Link
          to="/request-part"
          className="inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          + New request
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="text-4xl">🔎</div>
          <h2 className="mt-3 text-lg font-bold text-gray-900">No requests yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            Looking for a part that isn't listed? Describe it once and sellers will reply with offers.
          </p>
          <Link to="/request-part" className="mt-5 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white">
            Request a part
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((r) => {
            const status = requestStatus(r);
            return (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-400">{r.reference}</span>
                  </div>
                  <p className="mt-1.5 truncate text-base font-bold text-gray-900">{r.part_name}</p>
                  <p className="text-sm text-gray-500">
                    {[r.make, r.model, r.year].filter(Boolean).join(" ")} · {r.city}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-950">{r.offer_count}</p>
                  <p className="text-xs text-gray-500">{Number(r.offer_count) === 1 ? "offer" : "offers"}</p>
                  {r.best_price != null ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">from {formatMAD(r.best_price)}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
