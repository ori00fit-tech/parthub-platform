import { Link, useSearchParams } from "react-router-dom";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

function getVehicleLabel(vehicle) {
  if (!vehicle) return "";
  return (
    vehicle.label ||
    [
      vehicle.year,
      vehicle.make_name || vehicle.makeName || vehicle.make,
      vehicle.model_name || vehicle.modelName || vehicle.model,
      vehicle.engine_name || vehicle.engineName || vehicle.engine,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;
  const vehicleLabel = getVehicleLabel(selectedVehicle);

  const whatsappText = [
    "Hello, I just placed an order on PartHub.",
    orderId ? `Order ID: ${orderId}` : "",
    selectedVehicle ? `Vehicle: ${vehicleLabel}` : "",
    "I would like to confirm the next steps and fitment context.",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-green-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            Order received
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Your order has been placed</h1>
          <p className="mt-3 text-sm text-green-100 sm:text-base">
            Thank you. Your request is now recorded and the seller can review the order details.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">What happens next</h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">1. Seller reviews the order</p>
              <p className="mt-1 text-sm text-gray-600">
                The seller checks availability, fitment context, and order details.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">2. Fitment may be reconfirmed</p>
              <p className="mt-1 text-sm text-gray-600">
                SKU, OEM reference, and seller notes may still be used to confirm final compatibility.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">3. Delivery and payment follow-up</p>
              <p className="mt-1 text-sm text-gray-600">
                Shipping timing and final fulfillment steps are handled after seller confirmation.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue browsing
            </Link>

            <Link
              to="/cart"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Back to cart
            </Link>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-6 text-sm font-semibold text-green-700 transition hover:bg-green-100"
            >
              Confirm on WhatsApp
            </a>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Order summary</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">Order reference</span>
                <span className="text-sm font-semibold text-gray-900">
                  {orderId || "Generated successfully"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">Checkout type</span>
                <span className="text-sm font-semibold text-gray-900">Guest checkout</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">Vehicle context</span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedVehicle ? vehicleLabel : "Not attached"}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Keep your SKU references and fitment notes nearby in case the seller asks for confirmation.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Buyer advice</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>• Save your vehicle in the garage for faster future searches.</p>
              <p>• Use WhatsApp if you need confirmation before shipping.</p>
              <p>• Keep part SKU and vehicle year ready for follow-up.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
