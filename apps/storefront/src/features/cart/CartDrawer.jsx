import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { useSelectedVehicle } from "../vehicles/SelectedVehicleContext";
import { formatPrice } from "../../lib/formatters";
import { mediaUrl } from "../../lib/media";

const MAX_QTY = 10;

function vehicleLabel(v) {
  if (!v) return "";
  return (
    v.label ||
    [v.year, v.make_name || v.makeName || v.make, v.model_name || v.modelName || v.model].filter(Boolean).join(" ")
  );
}

// Slide-over cart. Opens from the header cart button and after "Add to cart".
export default function CartDrawer() {
  const { items, totalItems, subtotal, updateQuantity, removeItem, drawerOpen, closeCart } = useCart();
  const { selectedVehicle } = useSelectedVehicle();
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);
  // Stable handle so effects don't re-run (and steal focus) when the cart changes.
  const closeRef2 = useRef(closeCart);
  closeRef2.current = closeCart;

  // Close when the route changes (e.g. after clicking a part in the drawer).
  useEffect(() => {
    closeRef2.current();
  }, [location.pathname]);

  // Focus management, Esc to close, Tab stays inside, and no page scroll behind.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    lastFocus.current = document.activeElement;
    const timer = setTimeout(() => closeRef.current?.focus(), 60);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef2.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [drawerOpen]);

  const vehicle = vehicleLabel(selectedVehicle);

  return (
    <>
      <div
        onClick={closeCart}
        className={[
          "fixed inset-0 z-[70] bg-[#030712]/60 backdrop-blur-[2px] transition-opacity duration-200",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-hidden={!drawerOpen}
        className={[
          "fixed inset-y-0 right-0 z-[80] flex w-full max-w-[440px] flex-col border-l border-line-strong bg-canvas shadow-[-24px_0_48px_-16px_rgba(0,0,0,.7)]",
          "transition-[transform,visibility] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          drawerOpen ? "visible translate-x-0" : "invisible translate-x-[104%]",
        ].join(" ")}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center gap-3 bg-gradient-to-b from-navy to-navy-deep px-4 py-3.5 text-white">
          <h2 id="cart-drawer-title" className="flex-1 text-2xl font-bold uppercase tracking-[0.03em]">
            Your cart
            {totalItems ? (
              <span className="ml-2 font-mono text-sm font-medium normal-case tracking-normal text-navy-ink/80">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            ) : null}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface text-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 4h2.2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
                <circle cx="10" cy="20.5" r="1.4" />
                <circle cx="17.5" cy="20.5" r="1.4" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold uppercase">Your cart is empty</h3>
            <p className="max-w-[30ch] text-sm text-muted">
              {vehicle ? `Browse parts for your ${vehicle}.` : "Select your vehicle first so you only see parts that fit."}
            </p>
            <button
              type="button"
              onClick={() => {
                closeCart();
                navigate(vehicle ? "/parts" : "/vehicle-selector");
              }}
              className="mt-2 h-11 rounded-xl border border-line-strong px-5 text-sm font-semibold text-ink-2 transition hover:border-muted hover:text-ink"
            >
              {vehicle ? "Browse parts" : "Select vehicle"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              <div
                className={[
                  "flex gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] leading-snug",
                  vehicle
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-800",
                ].join(" ")}
              >
                <svg className="mt-0.5 h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  {vehicle ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>}
                </svg>
                <span>
                  {vehicle ? (
                    <>
                      Shopping for <strong className="font-semibold text-emerald-900">{vehicle}</strong>. Check the fitment on each
                      part's page, or confirm the OEM number with the seller.
                    </>
                  ) : (
                    <>
                      No vehicle selected, so fitment hasn't been checked.{" "}
                      <Link to="/vehicle-selector" className="font-semibold text-amber-900 underline underline-offset-2">
                        Select your vehicle
                      </Link>
                    </>
                  )}
                </span>
              </div>

              {items.map((item) => (
                <div key={item.part_id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xl border border-line bg-surface p-3">
                  <Link to={`/parts/${item.slug}`} className="media-well flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-lg">
                    {item.thumbnail ? (
                      <img src={mediaUrl(item.thumbnail)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl" aria-hidden="true">⚙️</span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link to={`/parts/${item.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-link">
                      {item.title}
                    </Link>
                    {item.seller_name ? <p className="mt-0.5 text-xs text-faint">Sold by {item.seller_name}</p> : null}

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-line-strong bg-surface-2" role="group" aria-label={`Quantity for ${item.title}`}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.part_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="h-8 w-8 text-lg leading-none text-ink transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:text-faint"
                        >
                          −
                        </button>
                        <output className="min-w-[32px] text-center font-mono text-sm font-semibold" aria-live="polite">
                          {item.quantity}
                        </output>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.part_id, item.quantity + 1)}
                          disabled={item.quantity >= MAX_QTY}
                          aria-label="Increase quantity"
                          className="h-8 w-8 text-lg leading-none text-ink transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:text-faint"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono text-[15px] font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-faint">
                      <span className="font-mono">{formatPrice(item.price)} each</span>
                      <button type="button" onClick={() => removeItem(item.part_id)} className="underline underline-offset-2 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-line-strong bg-surface-2 px-4 pb-4 pt-3.5">
              <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm text-ink-2">
                <dt>Subtotal</dt>
                <dd className="text-right font-mono tabular-nums text-ink">{formatPrice(subtotal)}</dd>
                <dt>Shipping</dt>
                <dd className="text-right text-muted">Calculated at checkout</dd>
              </dl>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate("/checkout");
                }}
                className="btn-cta h-[52px] w-full text-base"
              >
                Checkout · <span className="font-mono">{formatPrice(subtotal)}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate("/cart");
                }}
                className="h-10 w-full rounded-xl text-sm font-semibold text-link transition hover:bg-surface-3"
              >
                View full cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
