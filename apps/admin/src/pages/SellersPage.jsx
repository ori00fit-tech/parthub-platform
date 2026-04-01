import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const STATUS_OPTIONS = ["all", "pending", "active", "suspended", "rejected"];

export default function SellersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "all";

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const query = status !== "all" ? `?status=${status}` : "";
      const res = await api.get(`/api/v1/admin/sellers${query}`);
      setSellers(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function updateStatus(id, newStatus) {
    try {
      await api.patch(`/api/v1/admin/sellers/${id}/status`, {
        status: newStatus,
      });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Sellers</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() =>
              setSearchParams(s === "all" ? {} : { status: s })
            }
            className={`px-4 py-2 rounded-xl text-sm border ${
              status === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-900 text-gray-300 border-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : sellers.length === 0 ? (
          <div className="text-gray-500">No sellers found</div>
        ) : (
          sellers.map((s) => (
            <div
              key={s.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <p className="text-gray-100 font-semibold">
                  {s.name}
                </p>
                <p className="text-xs text-gray-500">
                  {s.slug}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {s.email}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(s.id, "active")}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg"
                >
                  Approve
                </button>

                <button
                  onClick={() => updateStatus(s.id, "suspended")}
                  className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-lg"
                >
                  Suspend
                </button>

                <button
                  onClick={() => updateStatus(s.id, "rejected")}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg"
                >
                  Reject
                </button>

                <Link
                  to={`/sellers/${s.id}`}
                  className="px-3 py-1 text-xs bg-gray-700 text-white rounded-lg"
                >
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
