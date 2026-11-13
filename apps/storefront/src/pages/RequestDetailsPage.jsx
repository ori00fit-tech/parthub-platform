import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  CONDITION_LABELS,
  formatMAD,
  requestStatus,
  requestsApi,
  whatsappLink,
} from "../features/requests/api";
import { mediaUrl } from "../lib/media";
import { useI18n, useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";

function Spec({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function OfferCard({ offer, request, cheapest, onAccept, accepting }) {
  const t = useT();
  const accepted = offer.status === "accepted";
  const canAccept = request.status === "open" && !Number(request.is_expired) && offer.status === "pending";
  const wa = whatsappLink(
    offer.seller_whatsapp || offer.seller_phone,
    t('Hello, I accepted your offer on PartHub for "{part}" ({ref}).', { part: request.part_name, ref: request.reference })
  );

  return (
    <div
      className={[
        "rounded-2xl border bg-surface p-5 shadow-sm",
        accepted ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-line",
        offer.status === "rejected" ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/sellers/${offer.seller_slug}`} className="text-base font-bold text-ink hover:text-blue-800">
            {offer.seller_name}
          </Link>
          <p className="text-xs text-muted">
            {[offer.seller_location, offer.seller_type === "dismantler" ? t("Dismantler") : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-black text-ink">{formatMAD(offer.price)}</p>
          {cheapest && !accepted ? (
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {t("Best price")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
          {CONDITION_LABELS[offer.condition] ? t(CONDITION_LABELS[offer.condition]) : offer.condition}
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
          {Number(offer.warranty_months) > 0 ? t("{n} months warranty", { n: offer.warranty_months }) : t("No warranty")}
        </span>
        {offer.delivery_days != null ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
            {Number(offer.delivery_days) === 0 ? t("Available today") : t("Ready in {n} days", { n: offer.delivery_days })}
          </span>
        ) : null}
      </div>

      {offer.note ? <p className="mt-3 text-sm text-muted">“{offer.note}”</p> : null}

      {accepted ? (
        <div className="mt-4 rounded-xl bg-emerald-400/10 p-4">
          <p className="text-sm font-bold text-emerald-700">{t("You accepted this offer. Contact the seller to arrange the sale:")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {t("WhatsApp seller")}
              </a>
            ) : null}
            {offer.seller_phone ? (
              <a
                href={`tel:${offer.seller_phone}`}
                className="inline-flex h-10 items-center rounded-xl border border-emerald-400/40 bg-surface px-4 text-sm font-bold text-emerald-700"
              >
                Call {offer.seller_phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : canAccept ? (
        <button
          type="button"
          onClick={() => onAccept(offer)}
          disabled={accepting}
          className="btn-cta mt-4 h-11 w-full rounded-xl text-sm"
        >
          {accepting ? t("Accepting…") : t("Accept this offer")}
        </button>
      ) : null}
    </div>
  );
}

export default function RequestDetailsPage() {
  const { t, lang } = useI18n();
  const { id } = useParams();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await requestsApi.getMine(id);
      setRequest(res.data);
      setError("");
    } catch (err) {
      setError(err.message || t("Could not load this request"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(offer) {
    if (!window.confirm(t("Accept the offer from {seller} for {price}? Other offers will be declined.", { seller: offer.seller_name, price: formatMAD(offer.price) }))) {
      return;
    }
    setBusy(true);
    try {
      await requestsApi.accept(id, offer.id);
      await load();
    } catch (err) {
      setError(err.message || t("Could not accept this offer"));
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!window.confirm(t("Close this request? Sellers won't be able to send more offers."))) return;
    setBusy(true);
    try {
      await requestsApi.close(id);
      await load();
    } catch (err) {
      setError(err.message || t("Could not close this request"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-surface" />;
  if (!request) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-red-700">{error || t("Request not found")}</p>
        <Link to="/requests" className="mt-4 inline-block text-sm font-semibold text-link">
          {t("← Back to my requests")}
        </Link>
      </div>
    );
  }

  const status = requestStatus(request);
  const offers = request.offers || [];
  const pendingPrices = offers.filter((o) => o.status === "pending").map((o) => o.price);
  const cheapest = pendingPrices.length > 1 ? Math.min(...pendingPrices) : null;
  const isOpen = request.status === "open" && !Number(request.is_expired);

  return (
    <div className="space-y-6">
      <Link to="/requests" className="text-sm font-semibold text-link">
        {t("← My requests")}
      </Link>

      {location.state?.justCreated ? (
        <div className="rounded-2xl bg-emerald-400/10 px-5 py-4 text-sm text-emerald-700">
          <strong>{t("Request sent!")}</strong> {t("Matching sellers can see it now. Come back here to compare their offers.")}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>
              <span className="text-xs text-faint">{request.reference}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-ink">{request.part_name}</h1>
            <p className="text-sm text-muted">
              {[request.make, request.model, request.year].filter(Boolean).join(" ")}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <Spec label={t("Engine")} value={request.engine} />
              <Spec label="VIN" value={request.vin} />
              <Spec label={t("Category")} value={request.category_name ? t(request.category_name) : ""} />
              <Spec label={t("OEM number")} value={request.oem_number} />
              <Spec label={t("Condition")} value={CONDITION_LABELS[request.condition_pref] ? t(CONDITION_LABELS[request.condition_pref]) : ""} />
              <Spec label={t("City")} value={request.city} />
            </dl>
            {request.description ? <p className="mt-4 text-sm text-muted">{request.description}</p> : null}

            {request.images?.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {request.images.map((src) => (
                  <a key={src} href={mediaUrl(src)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                    <img src={mediaUrl(src, 640)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            {isOpen ? (
              <>
                <p className="mt-5 text-xs text-muted">
                  {t("Open until {date}", { date: new Date(`${request.expires_at.replace(" ", "T")}Z`).toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-MA" : "en-GB") })}
                </p>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="mt-3 h-10 w-full rounded-xl border border-line text-sm font-semibold text-muted transition hover:bg-surface-3"
                >
                  {t("Close request")}
                </button>
              </>
            ) : null}
          </section>
        </aside>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink">
            {offers.length === 1 ? t("1 offer") : t("{n} offers", { n: offers.length })}
          </h2>

          {error ? <p className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          {offers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center">
              <Icon name="waiting" className="mx-auto h-10 w-10 text-faint" />
              <p className="mt-3 text-base font-bold text-ink">{t("Waiting for offers")}</p>
              <p className="mt-1 text-sm text-muted">
                {t("Sellers who stock parts for your {make} can see your request in their inbox.", { make: request.make })}
              </p>
            </div>
          ) : (
            offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                request={request}
                cheapest={cheapest != null && offer.price === cheapest}
                onAccept={accept}
                accepting={busy}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
