import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const demoSteps = [
  {
    key: "received",
    label: "Order received",
    description: "Your order has been captured in the storefront order flow.",
    done: true,
  },
  {
    key: "review",
    label: "Review in progress",
    description: "Order details, buyer information, and part availability are being reviewed.",
    done: true,
  },
  {
    key: "preparing",
    label: "Preparing dispatch",
    description: "The order is being prepared for shipment or seller confirmation.",
    done: false,
  },
  {
    key: "shipped",
    label: "Shipped",
    description: "Tracking and delivery progress will appear here once shipment is live.",
    done: false,
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Final delivery confirmation will appear at the end of the order flow.",
    done: false,
  },
];

export default function OrderTrackingPage() {
  const { orderNumber } = useParams();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Tracking foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Sign in to access order tracking</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Buyer sign-in helps keep order tracking connected to account and orders flow.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to={`/auth?redirect=/orders/${orderNumber}/tracking`}
            className="rounded-3xl border border-navy/70 bg-navy/20 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-link">Recommended</p>
            <p className="mt-1 text-xl font-bold text-ink">Buyer sign in</p>
            <p className="mt-2 text-sm text-muted">
              Continue to tracking for order {orderNumber}.
            </p>
          </Link>

          <Link
            to="/orders"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">Orders</p>
            <p className="mt-1 text-xl font-bold text-ink">Back to orders</p>
            <p className="mt-2 text-sm text-muted">
              Return to the buyer orders area.
            </p>
          </Link>

          <Link
            to="/account"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">Account</p>
            <p className="mt-1 text-xl font-bold text-ink">Go to account</p>
            <p className="mt-2 text-sm text-muted">
              Open your buyer account foundation.
            </p>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Tracking foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Track your order</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              This storefront page is ready for real shipment tracking, order status updates, and delivery milestones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-navy/30"
            >
              Back to orders
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Buyer account
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">Tracking reference</h2>
                <p className="mt-1 text-sm text-muted">
                  Signed in as {user?.email || "buyer"}.
                </p>
              </div>

              <span className="rounded-full bg-navy/20 px-4 py-2 text-sm font-semibold text-link">
                {orderNumber || "Order number unavailable"}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
              This is a storefront tracking foundation. Once the real order and shipment APIs are connected,
              the page can show live shipment status, courier updates, and estimated delivery.
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Order progress</h2>

            <div className="mt-6 space-y-4">
              {demoSteps.map((step, index) => (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                        step.done
                          ? "bg-navy text-white"
                          : "border border-line-strong bg-surface text-muted",
                      ].join(" ")}
                    >
                      {index + 1}
                    </div>
                    {index < demoSteps.length - 1 ? (
                      <div className="mt-2 h-full min-h-[32px] w-px bg-line" />
                    ) : null}
                  </div>

                  <div className="pb-4">
                    <h3 className="text-lg font-semibold text-ink">{step.label}</h3>
                    <p className="mt-1 text-sm text-muted">{step.description}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-faint">
                      {step.done ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">Tracking notes</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="rounded-2xl bg-surface-2 p-4">
                Tracking becomes much more useful once real order submission and shipment APIs are connected.
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                Buyer sign-in keeps tracking linked to account and order history.
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                Order number is already wired into the route structure for future backend integration.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/orders"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                Back to orders
              </Link>
              <Link
                to="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                Go to checkout
              </Link>
              <Link
                to="/account"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                Buyer account
              </Link>
              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Browse parts
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">Route readiness</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">Route param</p>
                <p className="mt-1 font-semibold text-ink">{orderNumber || "—"}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">Tracking state</p>
                <p className="mt-1 font-semibold text-ink">Foundation ready</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">What comes next</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="rounded-2xl bg-surface-2 p-4">
                Real order lookup by order number.
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                Shipment carrier and tracking code integration.
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                Buyer notifications and delivery milestone updates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
