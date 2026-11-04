import { Link, useSearchParams } from "react-router-dom";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { useT } from "../i18n";

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
  const t = useT();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;
  const vehicleLabel = getVehicleLabel(selectedVehicle);

  const whatsappText = [
    t("Hello, I just placed an order on PartHub."),
    orderId ? t("Order ID: {id}", { id: orderId }) : "",
    selectedVehicle ? t("Vehicle: {vehicle}", { vehicle: vehicleLabel }) : "",
    t("I would like to confirm the next steps and fitment context."),
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-green-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            {t("Order received")}
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">{t("Your order has been placed")}</h1>
          <p className="mt-3 text-sm text-green-100 sm:text-base">
            {t("Thank you. Your request is now recorded and the seller can review the order details.")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">{t("What happens next")}</h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm font-semibold text-ink">{t("1. Seller reviews the order")}</p>
              <p className="mt-1 text-sm text-muted">
                {t("The seller checks availability, fitment context, and order details.")}
              </p>
            </div>

            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm font-semibold text-ink">{t("2. Fitment may be reconfirmed")}</p>
              <p className="mt-1 text-sm text-muted">
                {t("SKU, OEM reference, and seller notes may still be used to confirm final compatibility.")}
              </p>
            </div>

            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm font-semibold text-ink">{t("3. Delivery and payment follow-up")}</p>
              <p className="mt-1 text-sm text-muted">
                {t("Shipping timing and final fulfillment steps are handled after seller confirmation.")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy-deep"
            >
              {t("Continue browsing")}
            </Link>

            <Link
              to="/cart"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              {t("Back to cart")}
            </Link>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-400/20"
            >
              {t("Confirm on WhatsApp")}
            </a>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Order summary")}</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <span className="text-sm text-muted">{t("Order reference")}</span>
                <span className="text-sm font-semibold text-ink">
                  {orderId || t("Generated successfully")}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <span className="text-sm text-muted">{t("Checkout type")}</span>
                <span className="text-sm font-semibold text-ink">{t("Guest checkout")}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <span className="text-sm text-muted">{t("Vehicle context")}</span>
                <span className="text-sm font-semibold text-ink">
                  {selectedVehicle ? vehicleLabel : t("Not attached")}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted">
              {t("Keep your SKU references and fitment notes nearby in case the seller asks for confirmation.")}
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Buyer advice")}</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>{t("• Save your vehicle in the garage for faster future searches.")}</p>
              <p>{t("• Use WhatsApp if you need confirmation before shipping.")}</p>
              <p>{t("• Keep part SKU and vehicle year ready for follow-up.")}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
