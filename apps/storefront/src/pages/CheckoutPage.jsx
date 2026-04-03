import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { formatPriceGBP } from "../lib/formatters";

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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart() || {};
  const { items = [], subtotal = 0, totalItems = 0, clearCart = () => {} } = cart;

  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "GB",
    notes: "",
  });

  const vehicleLabel = useMemo(() => getVehicleLabel(selectedVehicle), [selectedVehicle]);

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      setForm((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!form.buyer_name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.buyer_phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!form.address_line1.trim()) {
      setError("Address line 1 is required.");
      return;
    }

    if (!form.city.trim()) {
      setError("City is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        buyer_name: form.buyer_name.trim(),
        buyer_email: form.buyer_email.trim() || null,
        buyer_phone: form.buyer_phone.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim() || null,
        postal_code: form.postal_code.trim() || null,
        country: form.country.trim() || "GB",
        notes: [
          form.notes.trim(),
          selectedVehicle ? `Vehicle context: ${vehicleLabel}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        items: items.map((item) => ({
          part_id: item.part_id || item.id,
          quantity: Number(item.quantity || 1),
        })),
      };

      const response = await apiPost("/api/v1/commerce/orders", payload);
      const orderId = response?.data?.id || response?.data?.order_id || null;

      setSuccess("Order placed successfully.");
      clearCart();

      setTimeout(() => {
        if (orderId) {
          navigate(`/checkout/success?order_id=${orderId}`);
        } else {
          navigate("/checkout/success");
        }
      }, 900);
    } catch (err) {
      setError(err?.message || "Failed to place order");
    } finally {
      setSaving(false);
    }
  }

  if (!items.length) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-gray-500">
          Add parts to your cart before proceeding to checkout.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Guest checkout</h1>
        <p className="mt-3 text-sm text-blue-100 sm:text-base">
          Complete your order without creating an account.
        </p>
      </div>

      {selectedVehicle ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800 shadow-sm">
          Your selected vehicle will be attached as checkout context:
          <span className="ml-2 font-semibold">{vehicleLabel}</span>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700 shadow-sm">
          No vehicle selected. You can still place the order, but fitment confidence is stronger when a vehicle is selected.
        </div>
      )}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-green-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Delivery details</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your information to place the order as a guest.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
              <input
                value={form.buyer_name}
                onChange={setField("buyer_name")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                value={form.buyer_email}
                onChange={setField("buyer_email")}
                type="email"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <input
                value={form.buyer_phone}
                onChange={setField("buyer_phone")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="+44..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address line 1</label>
              <input
                value={form.address_line1}
                onChange={setField("address_line1")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="Street address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address line 2 (optional)</label>
              <input
                value={form.address_line2}
                onChange={setField("address_line2")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
              <input
                value={form.city}
                onChange={setField("city")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="London"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">State / Region</label>
              <input
                value={form.state}
                onChange={setField("state")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="Greater London"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Postal code</label>
              <input
                value={form.postal_code}
                onChange={setField("postal_code")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="SW1A 1AA"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Country</label>
              <input
                value={form.country}
                onChange={setField("country")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="GB"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Order notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                rows={4}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                placeholder="Add delivery notes or fitment confirmation requests..."
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Placing order..." : "Place order"}
            </button>
          </div>
        </form>

        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Order summary</h2>

          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id || item.part_id} className="rounded-2xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Qty: {item.quantity || 1} • {formatPriceGBP(item.price)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPriceGBP(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>To be confirmed</span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-base font-semibold text-gray-900">Estimated total</span>
              <span className="text-xl font-bold text-gray-900">{formatPriceGBP(subtotal)}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Final fitment confirmation should still rely on SKU, OEM reference, and seller confirmation where needed.
          </p>
        </aside>
      </div>
    </section>
  );
}
