import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const STATUS_GROUPS = ["pending", "active", "rejected", "archived"];

function normalizeParts(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.parts ||
    payload?.data ||
    payload?.items ||
    payload?.parts ||
    [];

  return Array.isArray(list) ? list : [];
}

function statusBadge(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-green-900/30 text-green-300 border-green-800/60";
    case "pending":
      return "bg-yellow-900/30 text-yellow-300 border-yellow-800/60";
    case "rejected":
      return "bg-red-900/30 text-red-300 border-red-800/60";
    case "archived":
      return "bg-gray-800 text-gray-300 border-gray-700";
    default:
      return "bg-blue-900/30 text-blue-300 border-blue-800/60";
  }
}

export default function PartDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingStatus, setWorkingStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPart() {
      try {
        setLoading(true);
        setError("");

        const responses = await Promise.all(
          STATUS_GROUPS.map((status) =>
            api.get(`/api/v1/admin/parts?status=${encodeURIComponent(status)}`).catch(() => ({
              data: [],
            }))
          )
        );

        if (!active) return;

        const allParts = responses.flatMap((res) => normalizeParts(res));
        const found = allParts.find((item) => String(item.id) === String(id));

        if (!found) {
          setPart(null);
          setError("Part not found");
          return;
        }

        setPart(found);
      } catch (err) {
        if (!active) return;
        setPart(null);
        setError(err?.message || "Failed to load part details");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPart();

    return () => {
      active = false;
    };
  }, [id]);

  const infoCards = useMemo(() => {
    if (!part) return [];
    return [
      { label: "Part ID", value: part.id ?? "—" },
      { label: "Title", value: part.title || "—" },
      { label: "Slug", value: part.slug || "—" },
      { label: "SKU", value: part.sku || "—" },
      { label: "Seller", value: part.seller_name || "—" },
      { label: "Price", value: part.price ?? "—" },
      { label: "Compare price", value: part.compare_price ?? "—" },
      { label: "Stock", value: part.quantity ?? "—" },
      { label: "Condition", value: part.condition || "—" },
      { label: "Status", value: part.status || "—" },
      { label: "Category", value: part.category_name || "—" },
      { label: "Brand", value: part.brand_name || "—" },
      { label: "Created at", value: part.created_at || "—" },
      { label: "Updated at", value: part.updated_at || "—" },
    ];
  }, [part]);

  async function updateStatus(nextStatus) {
    if (!part?.id) return;

    try {
      setWorkingStatus(nextStatus);
      setError("");

      await api.patch(`/api/v1/admin/parts/${part.id}/status`, {
        status: nextStatus,
      });

      setPart((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      setError(err?.message || "Failed to update part status");
    } finally {
      setWorkingStatus("");
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400 shadow-sm">
          Loading part details...
        </div>
      </section>
    );
  }

  if (!part) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error || "Part not found"}
        </div>

        <div>
          <button
            onClick={() => navigate("/parts")}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Back to parts
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
              Part details
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              {part.title || "Part"}
            </h1>
            <p className="mt-3 text-sm text-gray-300 sm:text-base">
              Review part information, moderation state, and listing quality before approval or rejection.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to parts
            </Link>

            {part.seller_id ? (
              <Link
                to={`/sellers/${part.seller_id}`}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Seller details
              </Link>
            ) : null}
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
                <h2 className="text-2xl font-bold text-gray-100">Listing overview</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Admin-facing snapshot of the selected marketplace part.
                </p>
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  statusBadge(part.status),
                ].join(" ")}
              >
                {part.status || "unknown"}
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
              {part.description || "No description available for this listing."}
            </div>
          </div>

          {part.image_url ? (
            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-100">Primary image</h2>
              <div className="mt-5 overflow-hidden rounded-3xl border border-gray-800 bg-gray-950">
                <img
                  src={part.image_url}
                  alt={part.title || "Part image"}
                  className="max-h-[420px] w-full object-cover"
                />
              </div>
            </div>
          ) : null}
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
                {workingStatus === "active" ? "Updating..." : "Approve part"}
              </button>

              <button
                onClick={() => updateStatus("rejected")}
                disabled={workingStatus === "rejected"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {workingStatus === "rejected" ? "Updating..." : "Reject part"}
              </button>

              <button
                onClick={() => updateStatus("archived")}
                disabled={workingStatus === "archived"}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-700 px-5 text-sm font-semibold text-white transition hover:bg-gray-600 disabled:opacity-60"
              >
                {workingStatus === "archived" ? "Updating..." : "Archive part"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">Quick navigation</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Parts moderation
              </Link>

              {part.seller_id ? (
                <Link
                  to={`/sellers/${part.seller_id}`}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
                >
                  Seller details
                </Link>
              ) : null}

              <Link
                to="/reviews"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-700 bg-gray-950 px-5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Reviews queue
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">Notes</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-400">
              <div className="rounded-2xl bg-gray-950 p-4">
                This page currently resolves the selected part from admin list endpoints grouped by moderation status.
              </div>
              <div className="rounded-2xl bg-gray-950 p-4">
                A dedicated admin part details endpoint can be added later for richer media, compatibility, and audit data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
