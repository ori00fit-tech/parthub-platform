import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { formatPrice } from "../lib/formatters";

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
  const { isAuthenticated, user } = useAuth();

  // Delivery fee comes from the API so the total shown is the total charged.
  const [shippingFee, setShippingFee] = useState(null);
  useEffect(() => {
    let active = true;
    apiGet("/api/v1/commerce/shipping")
      .then((res) => active && setShippingFee(Number(res?.data?.flat_fee ?? 0)))
      .catch(() => active && setShippingFee(null));
    return () => {
      active = false;
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    buyer_name: user?.name || "",
    buyer_email: user?.email || "",
    buyer_phone: user?.phone || "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "MA",
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

      // Shape expected by POST /api/v1/commerce/orders.
      const payload = {
        shipping_address: {
          full_name: form.buyer_name.trim(),
          phone: form.buyer_phone.trim(),
          address_line1: form.address_line1.trim(),
          address_line2: form.address_line2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim() || null,
          postal_code: form.postal_code.trim() || null,
          country: form.country.trim() || "MA",
        },
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

      const response = await apiPost("/api/v1/commerce/orders", payload, { auth: true });
      const orderId = response?.data?.reference || response?.data?.id || null;

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
      <section className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">
          Add parts to your cart before proceeding to checkout.
        </p>
      </section>
    );
  }
  // Orders belong to an account (order history, tracking, seller follow-up).
  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-panel">
        <h1 className="text-3xl font-bold uppercase text-ink">Sign in to check out</h1>
        <p className="mt-3 text-sm text-muted">
          Your cart is saved. Sign in or create a free account so you can track the order and the seller can reach you.
        </p>
        <Link to="/auth?redirect=/checkout" className="btn-cta mt-6 h-12 px-6 text-sm">
          Sign in to continue
        </Link>
      </section>
    );
  }


  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Checkout</h1>
        <p className="mt-3 text-sm text-blue-100 sm:text-base">
          Confirm your delivery details. Sellers may call to confirm fitment before shipping.
        </p>
      </div>

      {selectedVehicle ? (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-300 shadow-sm">
          Your selected vehicle will be attached as checkout context:
          <span className="ml-2 font-semibold">{vehicleLabel}</span>
        </div>
      ) : (
        <div className="rounded-3xl border border-navy/70 bg-navy/20 px-4 py-4 text-sm text-link shadow-sm">
          No vehicle selected. You can still place the order, but fitment confidence is stronger when a vehicle is selected.
        </div>
      )}

      {error ? (
        <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-5 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-emerald-300 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">Delivery details</h2>
          <p className="mt-1 text-sm text-muted">
            Where should the seller deliver your parts?
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Full name</label>
              <input
                value={form.buyer_name}
                onChange={setField("buyer_name")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Youssef Benali"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Email (optional)</label>
              <input
                value={form.buyer_email}
                onChange={setField("buyer_email")}
                type="email"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="youssef@exemple.ma"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Phone</label>
              <input
                value={form.buyer_phone}
                onChange={setField("buyer_phone")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="06 12 34 56 78"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Address line 1</label>
              <input
                value={form.address_line1}
                onChange={setField("address_line1")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Street address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Address line 2 (optional)</label>
              <input
                value={form.address_line2}
                onChange={setField("address_line2")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">City</label>
              <input
                value={form.city}
                onChange={setField("city")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Casablanca"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">State / Region</label>
              <input
                value={form.state}
                onChange={setField("state")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Casablanca-Settat"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Postal code</label>
              <input
                value={form.postal_code}
                onChange={setField("postal_code")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="20000"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Country</label>
              <input
                value={form.country}
                onChange={setField("country")}
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="MA"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Order notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                rows={4}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="Add delivery notes or fitment confirmation requests..."
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="btn-cta h-12 rounded-2xl px-6 text-sm"
            >
              {saving ? "Placing order..." : "Place order"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">Order summary</h2>

          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id || item.part_id} className="rounded-2xl bg-surface-2 p-4">
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-muted">
                  Qty: {item.quantity || 1} • {formatPrice(item.price)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-line pt-4">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>Delivery (flat rate)</span>
              <span className="font-mono">{shippingFee == null ? "—" : formatPrice(shippingFee)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-base font-semibold text-ink">Total</span>
              <span className="font-mono text-xl font-bold text-ink">
                {formatPrice(subtotal + (shippingFee || 0))}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            Final fitment confirmation should still rely on SKU, OEM reference, and seller confirmation where needed.
          </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">Checkout trust</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>• Your order appears in your account with a tracking reference.</p>
              <p>• Vehicle context is attached when selected.</p>
              <p>• Seller follow-up can still confirm final fitment before fulfillment.</p>
              <p>• SKU and notes remain important for high-confidence orders.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
