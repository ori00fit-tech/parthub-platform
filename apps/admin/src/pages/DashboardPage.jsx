import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function formatMoney(value) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function safeStats(payload) {
  const data = payload?.data || {};
  return {
    total_sellers: Number(data.total_sellers || 0),
    total_parts: Number(data.total_parts || 0),
    total_orders: Number(data.total_orders || 0),
    total_revenue: Number(data.total_revenue || 0),
    pending_sellers: Number(data.pending_sellers || 0),
    pending_parts: Number(data.pending_parts || 0),
  };
}

function StatCard({ title, value, subtitle, to, tone = "default" }) {
  const toneClasses =
    tone === "success"
      ? "border-green-200 bg-green-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "danger"
          ? "border-red-200 bg-red-50"
          : "border-gray-200 bg-white";

  const content = (
    <div className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
    </div>
  );

  if (!to) return content;

  return <Link to={to}>{content}</Link>;
}

function ActionCard({ title, description, to, cta }) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      <p className="mt-4 text-sm font-semibold text-blue-700">{cta}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_sellers: 0,
    total_parts: 0,
    total_orders: 0,
    total_revenue: 0,
    pending_sellers: 0,
    pending_parts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/v1/admin/dashboard");
        if (!active) return;

        setStats(safeStats(response));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const operationalHealth = useMemo(() => {
    if (stats.pending_sellers === 0 && stats.pending_parts === 0) {
      return {
        label: "Queue healthy",
        tone: "success",
        note: "No moderation backlog detected right now.",
      };
    }

    if (stats.pending_sellers > 0 || stats.pending_parts > 0) {
      return {
        label: "Needs attention",
        tone: "warning",
        note: "Pending moderation items should be reviewed soon.",
      };
    }

    return {
      label: "Monitoring",
      tone: "default",
      note: "Admin operations are being monitored.",
    };
  }, [stats.pending_sellers, stats.pending_parts]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Admin command center
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Marketplace dashboard</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Track moderation, supply growth, order activity, and marketplace health from one place.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-blue-100">Operational status</p>
            <p className="mt-2 text-2xl font-bold">{operationalHealth.label}</p>
            <p className="mt-1 text-sm text-blue-100">{operationalHealth.note}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total sellers"
              value={stats.total_sellers}
              subtitle="All marketplace seller accounts"
              to="/sellers"
            />
            <StatCard
              title="Active parts"
              value={stats.total_parts}
              subtitle="Currently active catalog listings"
              to="/parts?status=active"
            />
            <StatCard
              title="Total orders"
              value={stats.total_orders}
              subtitle="Marketplace order records"
              to="/orders"
            />
            <StatCard
              title="Paid revenue"
              value={formatMoney(stats.total_revenue)}
              subtitle="Total revenue from paid orders"
              to="/orders"
              tone="success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatCard
              title="Pending seller approvals"
              value={stats.pending_sellers}
              subtitle="New or unresolved seller onboarding reviews"
              to="/sellers?status=pending"
              tone={stats.pending_sellers > 0 ? "warning" : "success"}
            />
            <StatCard
              title="Pending part reviews"
              value={stats.pending_parts}
              subtitle="Listings waiting for marketplace approval"
              to="/parts?status=pending"
              tone={stats.pending_parts > 0 ? "warning" : "success"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ActionCard
              title="Review seller queue"
              description="Approve trustworthy suppliers, reject weak submissions, and keep onboarding standards high."
              to="/sellers?status=pending"
              cta="Open seller moderation"
            />

            <ActionCard
              title="Review listing queue"
              description="Check parts waiting for approval and maintain data quality across the marketplace."
              to="/parts?status=pending"
              cta="Open part moderation"
            />

            <ActionCard
              title="Moderate buyer reviews"
              description="Keep review quality high and remove low-value or harmful feedback before it goes live."
              to="/reviews"
              cta="Open review moderation"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Admin priorities</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">1. Clear pending sellers</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Seller verification is the first trust gate of the marketplace.
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">2. Approve high-quality parts</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Better listing quality improves search trust and conversion quality.
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">3. Monitor order flow</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Keep an eye on payment, shipping, and any order pipeline friction.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Snapshot</h2>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Moderation load</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.pending_sellers + stats.pending_parts} items
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Supply base</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.total_sellers} sellers
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Live catalog</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.total_parts} parts
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Commercial activity</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.total_orders} orders
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-600">Revenue tracked</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoney(stats.total_revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
