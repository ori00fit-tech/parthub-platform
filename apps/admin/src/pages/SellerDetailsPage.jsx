import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

function statusBadge(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-green-900/30 text-green-300 border-green-800/60";
    case "pending":
      return "bg-yellow-900/30 text-yellow-300 border-yellow-800/60";
    case "suspended":
      return "bg-orange-900/30 text-orange-300 border-orange-800/60";
    case "rejected":
      return "bg-red-900/30 text-red-300 border-red-800/60";
    default:
      return "bg-gray-800 text-gray-300 border-gray-700";
  }
}

function normalizeSellers(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.sellers ||
    payload?.data ||
    payload?.items ||
    payload?.sellers ||
    [];

  return Array.isArray(list) ? list : [];
}

export default function SellerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingStatus, setWorkingStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSeller() {
      try {
        setLoading(true);
        setError("");

        const [pendingRes, activeRes, suspendedRes, rejectedRes] = await Promise.all([
          api.get("/api/v1/admin/sellers?status=pending").catch(() => ({ data: [] })),
          api.get("/api/v1/admin/sellers?status=active").catch(() => ({ data: [] })),
          api.get("/api/v1/admin/sellers?status=suspended").catch(() => ({ data: [] })),
          api.get("/api/v1/admin/sellers?status=rejected").catch(() => ({ data: [] })),
        ]);

        if (!active) return;

        const all = [
          ...normalizeSellers(pendingRes),
          ...normalizeSellers(activeRes),
          ...normalizeSellers(suspendedRes),
          ...normalizeSellers(rejectedRes),
        ];

        const found = all.find((item) => String(item.id) === String(id));
        if (!found) {
          setError("Seller not found");
          setSeller(null);
          return;
        }

        setSeller(found);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load seller details");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSeller();

    return () => {
      active = false;
    };
  }, [id]);

  const infoCards = useMemo(() => {
    if (!seller) return [];
    return [
      { label: "Seller ID", value: seller.id ?? "—" },
      { label: "Store name", value: seller.name || "—" },
      { label: "Slug", value: seller.slug || "—" },
      { label: "Status", value: seller.status || "—" },
      { label: "Email", value: seller.email || seller.user_email || "—" },
      { label: "Phone", value: seller.phone || seller.user_phone || "—" },
      { label: "Location", value: seller.location || seller.city || "—" },
      { label: "Created at", value: seller.created_at || "—" },
    ];
  }, [seller]);

  async function updateStatus(nextStatus) {
    if (!seller?.id) return;

    try {
      setWorkingStatus(nextStatus);
      setError("");

      await api.patch(`/api/v1/admin/sellers/${seller.id}/status`, {
        status: nextStatus,
      });

      setSeller((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      setError(err?.message || "Failed to update seller status");
    } finally {
      setWorkingStatus("");
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400 shadow-sm">
          Loading seller details...
        </div>
      </section>
    );
  }

  if (!seller) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error || "Seller not found"}
        </div>

        <div>
          <button
            onClick={() => navigate("/sellers")}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Back to sellers
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              Seller details
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              {seller.name || "Seller"}
            </h1>
            <p className="mt-3 text-sm text-gray-300 sm:text-base">
              Review seller identity, profile state, and moderation status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/sellers"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to sellers
            </Link>
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Review parts
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Seller overview</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Admin-facing snapshot of the seller account and store profile.
                </p>
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  statusBadge(seller.status),
                ].join(" ")}
              >
                {seller.status || "unknown"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {infoCards.map((item) => (
                <div key={item.label} className="rounded-2xl bg-gray-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words font-semibold text-gray-100">
                    {item.value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-100">Description</h2>
            <div className="mt-5 rounded-2xl bg-gray-950 p-4 text-sm leading-6 text-gray-300">
              {seller.description || "No seller description available."}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">Moderation actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={() => updateStatus("active")}
                disabled={workingStatus === "active"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-green-600 px-5 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
              >
                {workingStatus === "active" ? "Updating..." : "Approve seller"}
              </button>

              <button
                onClick={() => updateStatus("suspended")}
                disabled={workingStatus === "suspended"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-yellow-600 px-5 text-sm font-semibold text-white transition hover:bg-yellow-500 disabled:opacity-60"
              >
                {workingStatus === "suspended" ? "Updating..." : "Suspend seller"}
              </button>

              <button
                onClick={() => updateStatus("rejected")}
                disabled={workingStatus === "rejected"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {workingStatus === "rejected" ? "Updating..." : "Reject seller"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">Quick navigation</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/sellers"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Sellers list
              </Link>

              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Parts moderation
              </Link>

              <Link
                to="/orders"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Orders
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">Notes</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-400">
              <div className="rounded-2xl bg-gray-950 p-4">
                This page currently uses the sellers listing API and resolves the selected seller client-side.
              </div>
              <div className="rounded-2xl bg-gray-950 p-4">
                A dedicated admin seller details endpoint can be added later for richer store, parts, and order data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
