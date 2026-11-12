import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { formatPrice } from "../lib/formatters";
import { useT } from "../i18n";
import LegalConsent from "../features/legal/LegalConsent";

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
  const t = useT();
  const navigate = useNavigate();
  const cart = useCart() || {};
  const { items = [], subtotal = 0, totalItems = 0, clearCart = () => {} } = cart;

  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;
  const { isAuthenticated, user, login, register } = useAuth();

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

  // How the buyer gets each seller's parts: delivery, pickup at the store,
  // or someone they send (API: GET /api/v1/commerce/fulfillment-options).
  const partIds = items.map((item) => item.part_id || item.id).filter(Boolean).join(",");
  const [groups, setGroups] = useState(null);
  const [choice, setChoice] = useState({}); // seller_id → method
  const [collector, setCollector] = useState({}); // seller_id → { name, phone }
  // The city decides each seller's delivery fee (their city / elsewhere).
  const [feeCity, setFeeCity] = useState("");
  useEffect(() => {
    if (!partIds) return undefined;
    let active = true;
    apiGet(`/api/v1/commerce/fulfillment-options?parts=${partIds}&city=${encodeURIComponent(feeCity)}`)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data?.groups) ? res.data.groups : [];
        setGroups(list);
        setChoice((prev) => {
          const next = { ...prev };
          for (const g of list) if (!g.methods.includes(next[g.seller_id])) next[g.seller_id] = g.methods[0];
          return next;
        });
      })
      .catch(() => active && setGroups(null));
    return () => {
      active = false;
    };
  }, [partIds, feeCity]);
  // Until the options load, assume delivery (the address is asked).
  const needsAddress = !groups || groups.some((g) => choice[g.seller_id] === "delivery");
  const hasPickup = Boolean(groups?.some((g) => ["pickup", "courier"].includes(choice[g.seller_id])));
  const blocked = groups?.find((g) => !g.methods.length) || null;
  // Sum of the delivering sellers' fees (flat fee until the options load).
  const fee = groups
    ? groups.reduce((sum, g) => sum + (choice[g.seller_id] === "delivery" ? Number(g.delivery_fee || 0) : 0), 0)
    : shippingFee;
  const deliveringGroups = groups ? groups.filter((g) => choice[g.seller_id] === "delivery") : [];

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

  useEffect(() => {
    const id = setTimeout(() => setFeeCity(form.city.trim()), 500);
    return () => clearTimeout(id);
  }, [form.city]);

  // Signed-out buyers check out in one step: create an account (or sign in)
  // with the same form, then the order is placed.
  const [accountMode, setAccountMode] = useState("new"); // "new" | "existing"
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // After signing in, fill the delivery fields the buyer left empty.
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      buyer_name: prev.buyer_name || user.name || "",
      buyer_email: prev.buyer_email || user.email || "",
      buyer_phone: prev.buyer_phone || user.phone || "",
    }));
  }, [user]);

  function tokenFrom(res) {
    return res?.data?.token || res?.data?.access_token || res?.token || "";
  }

  async function signInOnly() {
    setError("");
    if (!form.buyer_email.trim() || !password) {
      setError(t("Please enter your email and password."));
      return;
    }
    try {
      setSigningIn(true);
      await login(form.buyer_email.trim(), password);
      setPassword("");
    } catch (err) {
      setError(err?.message || t("Authentication failed."));
    } finally {
      setSigningIn(false);
    }
  }

  // Returns a token for the order request: the current session, or a new one
  // from creating the account / signing in right now.
  async function ensureAccount() {
    if (isAuthenticated) return null;
    const email = form.buyer_email.trim();
    if (!email || !password) throw new Error(t("Please enter your email and password."));
    if (accountMode === "new") {
      if (password.length < 8) throw new Error(t("Use at least 8 characters for your password."));
      try {
        await register({ name: form.buyer_name.trim(), email, password, phone: form.buyer_phone.trim() });
      } catch (err) {
        if (/already registered/i.test(err?.rawMessage || "") || err?.status === 409) {
          setAccountMode("existing");
          throw new Error(t("This email already has an account. Enter its password to sign in and place the order."));
        }
        throw err;
      }
    }
    const res = await login(email, password);
    setPassword("");
    return tokenFrom(res);
  }

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
      setError(t("Your cart is empty."));
      return;
    }

    if (!form.buyer_name.trim()) {
      setError(t("Full name is required."));
      return;
    }

    if (!form.buyer_phone.trim()) {
      setError(t("Phone number is required."));
      return;
    }

    if (blocked) {
      setError(t("{seller} can't send these parts and doesn't offer pickup. Remove them from your cart.", { seller: blocked.seller_name }));
      return;
    }

    if (needsAddress && !form.address_line1.trim()) {
      setError(t("Address line 1 is required."));
      return;
    }

    if (needsAddress && !form.city.trim()) {
      setError(t("City is required."));
      return;
    }

    try {
      setSaving(true);

      const freshToken = await ensureAccount();

      // Shape expected by POST /api/v1/commerce/orders.
      const payload = {
        shipping_address: {
          full_name: form.buyer_name.trim(),
          phone: form.buyer_phone.trim(),
          address_line1: needsAddress ? form.address_line1.trim() : "",
          address_line2: needsAddress ? form.address_line2.trim() || null : null,
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
        fulfillment: Object.fromEntries(
          (groups || []).map((g) => [
            g.seller_id,
            {
              method: choice[g.seller_id],
              ...(choice[g.seller_id] === "courier"
                ? { collector_name: collector[g.seller_id]?.name?.trim() || null, collector_phone: collector[g.seller_id]?.phone?.trim() || null }
                : {}),
            },
          ])
        ),
        items: items.map((item) => ({
          part_id: item.part_id || item.id,
          quantity: Number(item.quantity || 1),
        })),
      };

      const response = await apiPost(
        "/api/v1/commerce/orders",
        payload,
        freshToken ? { headers: { Authorization: `Bearer ${freshToken}` } } : { auth: true }
      );
      const orderId = response?.data?.reference || response?.data?.id || null;

      setSuccess(t("Order placed successfully."));
      clearCart();

      setTimeout(() => {
        if (orderId) {
          navigate(`/checkout/success?order_id=${orderId}`);
        } else {
          navigate("/checkout/success");
        }
      }, 900);
    } catch (err) {
      setError(err?.message || t("Failed to place order"));
    } finally {
      setSaving(false);
    }
  }

  if (!items.length) {
    return (
      <section className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">{t("Your cart is empty")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t("Add parts to your cart before proceeding to checkout.")}
        </p>
      </section>
    );
  }


  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Checkout")}</h1>
        <p className="mt-3 text-sm text-blue-100 sm:text-base">
          {t("Confirm your delivery details. Sellers may call to confirm fitment before shipping.")}
        </p>
      </div>

      {selectedVehicle ? (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-700 shadow-sm">
          {t("Your selected vehicle will be attached as checkout context:")}
          <span className="ms-2 font-semibold">{vehicleLabel}</span>
        </div>
      ) : (
        <div className="rounded-3xl border border-navy/20 bg-navy/[0.06] px-4 py-4 text-sm text-link shadow-sm">
          {t("No vehicle selected. You can still place the order, but fitment confidence is stronger when a vehicle is selected.")}
        </div>
      )}

      {error ? (
        <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-emerald-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          {!isAuthenticated ? (
            <fieldset className="mb-8 rounded-2xl border border-line bg-surface-2 p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-ink">{t("Your account")}</legend>
              <div role="tablist" aria-label={t("Your account")} className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
                {[
                  ["new", t("New customer")],
                  ["existing", t("I have an account")],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={accountMode === mode}
                    onClick={() => {
                      setAccountMode(mode);
                      setError("");
                    }}
                    className={[
                      "h-10 rounded-lg text-sm font-semibold transition",
                      accountMode === mode ? "bg-navy text-white" : "text-ink-2 hover:bg-surface-3",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="checkout-email" className="mb-1.5 block text-sm font-medium text-ink-2">{t("Email")}</label>
                  <input
                    id="checkout-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    value={form.buyer_email}
                    onChange={setField("buyer_email")}
                    className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                    placeholder="youssef@exemple.ma"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-password" className="mb-1.5 block text-sm font-medium text-ink-2">{t("Password")}</label>
                  <div className="relative">
                    <input
                      id="checkout-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={accountMode === "new" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="h-12 w-full rounded-2xl border border-line bg-surface pe-20 ps-4 text-sm text-ink outline-none focus:border-sky-400"
                      placeholder={accountMode === "new" ? t("At least 8 characters") : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 end-2 my-auto h-8 rounded-lg px-2.5 text-xs font-semibold text-link hover:bg-surface-3"
                      aria-pressed={showPassword}
                    >
                      {showPassword ? t("Hide") : t("Show")}
                    </button>
                  </div>
                </div>
              </div>
              {accountMode === "new" ? (
                <p className="mt-3 text-xs text-muted">
                  {t("We create your free account when you place the order, so you can follow it in My Orders.")}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={signInOnly}
                    disabled={signingIn}
                    className="inline-flex h-10 items-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3 disabled:opacity-60"
                  >
                    {signingIn ? t("Signing in…") : t("Sign in")}
                  </button>
                  <span className="text-xs text-muted">{t("Or fill in the delivery details and place the order directly.")}</span>
                </div>
              )}
            </fieldset>
          ) : null}

          {groups?.length ? (
            <section className="mb-8" aria-labelledby="get-parts">
              <h2 id="get-parts" className="text-2xl font-bold text-ink">{t("How do you want to get your parts?")}</h2>
              <div className="mt-4 space-y-5">
                {groups.map((g) => (
                  <fieldset key={g.seller_id} className="rounded-2xl border border-line p-4">
                    <legend className="px-1 text-sm font-semibold text-ink">
                      {t("From {seller}", { seller: g.seller_name })}
                      {g.city ? <span className="font-normal text-muted"> · {g.city}</span> : null}
                    </legend>
                    {!g.methods.length ? (
                      <p className="text-sm text-red-700" role="alert">
                        {t("{seller} can't send these parts and doesn't offer pickup. Remove them from your cart.", { seller: g.seller_name })}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {g.methods.map((m) => (
                          <label
                            key={m}
                            className={[
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                              choice[g.seller_id] === m ? "border-sky-400 bg-surface-2" : "border-line hover:bg-surface-2",
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name={`fulfil-${g.seller_id}`}
                              value={m}
                              checked={choice[g.seller_id] === m}
                              onChange={() => setChoice((prev) => ({ ...prev, [g.seller_id]: m }))}
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-ink">
                                {m === "delivery" ? t("Delivery to my address") : m === "pickup" ? t("I pick it up at the store") : t("I send someone to collect it")}
                                <span className="ms-2 font-mono text-xs font-semibold text-muted">
                                  {m === "delivery"
                                    ? Number(g.delivery_fee) === 0
                                      ? t("Free")
                                      : formatPrice(g.delivery_fee)
                                    : t("Free")}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-xs leading-5 text-muted">
                                {m === "delivery"
                                  ? t("The seller ships it to you. You pay cash on delivery.")
                                  : m === "pickup"
                                    ? t("The part is kept for you 3 days. Inspect it at the store and pay only if it's right.")
                                    : t("A driver or a relative collects it with your pickup code.")}
                              </span>
                              {m === "delivery" && g.city && Number(g.delivery_fee_local) !== Number(g.delivery_fee_national) ? (
                                <span className="mt-1 block text-xs text-ink-2">
                                  {t("{local} in {city}, {national} elsewhere", {
                                    local: formatPrice(g.delivery_fee_local),
                                    national: formatPrice(g.delivery_fee_national),
                                    city: String(g.city).split(",")[0],
                                  })}
                                </span>
                              ) : null}
                              {m !== "delivery" && g.pickup ? (
                                <span className="mt-1 block text-xs text-ink-2">
                                  {g.pickup.address}
                                  {g.pickup.hours ? ` · ${g.pickup.hours}` : ""}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                        {g.pickup_only_parts?.length && g.methods.length ? (
                          <p className="text-xs text-muted">{t("Some of these parts are too big to ship: pickup only.")}</p>
                        ) : null}
                        {choice[g.seller_id] === "courier" ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label htmlFor={`collector-name-${g.seller_id}`} className="mb-1 block text-xs font-medium text-ink-2">{t("Who collects it? (optional)")}</label>
                              <input
                                id={`collector-name-${g.seller_id}`}
                                value={collector[g.seller_id]?.name || ""}
                                onChange={(e) => setCollector((prev) => ({ ...prev, [g.seller_id]: { ...prev[g.seller_id], name: e.target.value } }))}
                                maxLength={100}
                                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sky-400"
                              />
                            </div>
                            <div>
                              <label htmlFor={`collector-phone-${g.seller_id}`} className="mb-1 block text-xs font-medium text-ink-2">{t("Their phone (optional)")}</label>
                              <input
                                id={`collector-phone-${g.seller_id}`}
                                type="tel"
                                dir="ltr"
                                value={collector[g.seller_id]?.phone || ""}
                                onChange={(e) => setCollector((prev) => ({ ...prev, [g.seller_id]: { ...prev[g.seller_id], phone: e.target.value } }))}
                                maxLength={30}
                                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sky-400"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
            </section>
          ) : null}

          <h2 className="text-2xl font-bold text-ink">{needsAddress ? t("Delivery details") : t("Your contact details")}</h2>
          <p className="mt-1 text-sm text-muted">
            {needsAddress ? t("Where should the seller deliver your parts?") : t("The seller calls you if needed. You'll get a pickup code after ordering.")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Full name")}</label>
              <input
                value={form.buyer_name}
                onChange={setField("buyer_name")}
                autoComplete="name"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Youssef Benali")}
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Phone")}</label>
              <input
                value={form.buyer_phone}
                onChange={setField("buyer_phone")}
                type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="06 12 34 56 78"
              />
            </div>

            {needsAddress ? (
              <>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Address line 1")}</label>
              <input
                value={form.address_line1}
                onChange={setField("address_line1")}
                autoComplete="address-line1"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Street address")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Address line 2 (optional)")}</label>
              <input
                value={form.address_line2}
                onChange={setField("address_line2")}
                autoComplete="address-line2"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Apartment, suite, etc.")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("City")}</label>
              <input
                value={form.city}
                onChange={setField("city")}
                autoComplete="address-level2"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Casablanca")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("State / Region")}</label>
              <input
                value={form.state}
                onChange={setField("state")}
                autoComplete="address-level1"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Casablanca-Settat")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Postal code")}</label>
              <input
                value={form.postal_code}
                onChange={setField("postal_code")}
                autoComplete="postal-code" inputMode="numeric"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder="20000"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Country")}</label>
              <input
                value={form.country}
                onChange={setField("country")}
                autoComplete="country"
                className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("MA")}
              />
            </div>

              </>
            ) : null}

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">{t("Order notes (optional)")}</label>
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                rows={4}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-sky-400"
                placeholder={t("Add delivery notes or fitment confirmation requests...")}
              />
            </div>
          </div>

          <fieldset className="mt-6 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink">{t("Payment")}</legend>
            <label className="flex items-start gap-3 rounded-xl border border-sky-400 bg-surface-2 p-3">
              <input type="radio" name="payment_method" checked readOnly className="mt-1" />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {needsAddress && hasPickup ? t("Cash, on delivery or at the store") : needsAddress ? t("Cash on delivery") : t("Cash at the store")}
                </span>
                <span className="block text-xs text-muted">
                  {needsAddress
                    ? t("Pay the seller in cash when you receive your parts. No card needed.")
                    : t("Pay the seller when you collect the parts, after checking them.")}
                </span>
              </span>
            </label>
          </fieldset>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving || Boolean(blocked)}
              className="btn-cta h-12 rounded-2xl px-6 text-sm"
            >
              {saving
                ? t("Placing order...")
                : !isAuthenticated && accountMode === "new"
                  ? t("Create account and place order")
                  : t("Place order")}
            </button>
            <LegalConsent kind="order" className="mt-3" />
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">{t("Order summary")}</h2>

          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id || item.part_id} className="rounded-2xl bg-surface-2 p-4">
                <p dir="auto" className="font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-muted">
                  Qty: {item.quantity || 1} • {formatPrice(item.price)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-line pt-4">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{t("Items")}</span>
              <span>{totalItems}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>{t("Subtotal")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>{needsAddress ? t("Delivery") : t("Pickup at the store")}</span>
              <span className="font-mono">{fee == null ? "—" : fee === 0 ? t("Free") : formatPrice(fee)}</span>
            </div>
            {deliveringGroups.length > 1 ? (
              <ul className="-mt-1 space-y-1 text-xs text-muted">
                {deliveringGroups.map((g) => (
                  <li key={g.seller_id} className="flex justify-between gap-3">
                    <span className="truncate">{g.seller_name}</span>
                    <span className="font-mono">{formatPrice(g.delivery_fee)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-base font-semibold text-ink">{t("Total")}</span>
              <span className="font-mono text-xl font-bold text-ink">
                {formatPrice(subtotal + (fee || 0))}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            {t("Final fitment confirmation should still rely on SKU, OEM reference, and seller confirmation where needed.")}
          </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Checkout trust")}</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>{t("• Your order appears in your account with a tracking reference.")}</p>
              <p>{t("• Vehicle context is attached when selected.")}</p>
              <p>{t("• Seller follow-up can still confirm final fitment before fulfillment.")}</p>
              <p>{t("• SKU and notes remain important for high-confidence orders.")}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
