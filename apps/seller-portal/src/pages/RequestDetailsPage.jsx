import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { CONDITION_LABELS, formatMAD, mediaUrl, offerBadge, whatsappLink } from "../lib/requests";
import { dateLocale, useT } from "../i18n";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Spec({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function offerToForm(offer) {
  return {
    price: offer ? String(Number(offer.price) / 100) : "",
    condition: offer?.condition || "used",
    warranty_months: offer ? String(offer.warranty_months ?? 0) : "3",
    delivery_days: offer?.delivery_days != null ? String(offer.delivery_days) : "",
    note: offer?.note || "",
  };
}

export default function RequestDetailsPage() {
  const t = useT();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [form, setForm] = useState(offerToForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/requests/inbox/${id}`);
      setRequest(res.data);
      setForm(offerToForm(res.data?.my_offer));
      setError("");
    } catch (err) {
      setError(err?.message || t("Failed to load request"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    const priceCents = Math.round(Number(String(form.price).replace(",", ".")) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError(t("Enter a valid price in MAD"));
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/v1/requests/inbox/${id}/offer`, {
        price: priceCents,
        condition: form.condition,
        warranty_months: form.warranty_months === "" ? 0 : Number(form.warranty_months),
        delivery_days: form.delivery_days === "" ? null : Number(form.delivery_days),
        note: form.note,
      });
      setNotice(request?.my_offer ? t("Offer updated.") : t("Offer sent to the buyer."));
      await load();
    } catch (err) {
      setError(err?.message || t("Could not send offer"));
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    if (!window.confirm(t("Withdraw your offer?"))) return;
    setSaving(true);
    try {
      await api.delete(`/api/v1/requests/inbox/${id}/offer`);
      setNotice(t("Offer withdrawn."));
      await load();
    } catch (err) {
      setError(err?.message || t("Could not withdraw offer"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-white" />;
  if (!request) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-red-700">{error || t("Request not found")}</p>
        <Link to="/requests" className="mt-4 inline-block text-sm font-semibold text-blue-600">
          {t("← Back to requests")}
        </Link>
      </div>
    );
  }

  const myOffer = request.my_offer;
  const badge = offerBadge(myOffer?.status);
  const canEdit =
    request.status === "open" && !Number(request.is_expired) && (!myOffer || ["pending", "withdrawn"].includes(myOffer.status));
  const wa = whatsappLink(
    request.buyer_phone,
    request.buyer_name
      ? t('Hello {name}, this is about your PartHub request "{part}" ({ref}).', { name: request.buyer_name, part: request.part_name, ref: request.reference })
      : t('Hello, this is about your PartHub request "{part}" ({ref}).', { part: request.part_name, ref: request.reference })
  );

  return (
    <div className="space-y-6">
      <Link to="/requests" className="text-sm font-semibold text-blue-600">
        {t("← All requests")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.className}`}>{badge.label}</span> : null}
            <span className="text-xs text-gray-400">{request.reference}</span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{request.part_name}</h1>
          <p className="text-sm text-gray-500">{[request.make, request.model, request.year].filter(Boolean).join(" ")}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Spec label={t("Engine")} value={request.engine} />
            <Spec label="VIN" value={request.vin} />
            <Spec label={t("Category")} value={request.category_name ? t(request.category_name) : ""} />
            <Spec label={t("OEM number")} value={request.oem_number} />
            <Spec label={t("Wanted condition")} value={CONDITION_LABELS[request.condition_pref] ? t(CONDITION_LABELS[request.condition_pref]) : ""} />
            <Spec label={t("Buyer city")} value={request.city} />
          </dl>

          {request.description ? (
            <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">{request.description}</div>
          ) : null}

          {request.images?.length ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Buyer's photos")}</p>
              <div className="grid grid-cols-3 gap-3">
                {request.images.map((src) => (
                  <a key={src} href={mediaUrl(src)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <img src={mediaUrl(src)} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-xs text-gray-500">
            {t(Number(request.offer_count) === 1 ? "1 offer so far · posted {date}" : "{n} offers so far · posted {date}", { n: request.offer_count, date: new Date(`${request.created_at.replace(" ", "T")}Z`).toLocaleDateString(dateLocale()) })}
          </p>
        </section>

        <aside className="space-y-4">
          {myOffer?.status === "accepted" ? (
            <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6">
              <h2 className="text-lg font-bold text-emerald-900">{t("The buyer accepted your offer 🎉")}</h2>
              <p className="mt-1 text-sm text-emerald-800">
                {t("{price} · {condition}. Contact them to arrange the sale.", { price: formatMAD(myOffer.price), condition: CONDITION_LABELS[myOffer.condition] ? t(CONDITION_LABELS[myOffer.condition]) : myOffer.condition })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    WhatsApp {request.buyer_name || "buyer"}
                  </a>
                ) : null}
                {request.buyer_phone ? (
                  <a
                    href={`tel:${request.buyer_phone}`}
                    className="inline-flex h-10 items-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-bold text-emerald-800"
                  >
                    Call {request.buyer_phone}
                  </a>
                ) : null}
              </div>
            </section>
          ) : canEdit ? (
            <form onSubmit={submit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                {myOffer && myOffer.status === "pending" ? t("Your offer") : t("Send an offer")}
              </h2>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-800">{t("Price (MAD) *")}</span>
                  <input className={inputClass} value={form.price} onChange={update("price")} inputMode="decimal" placeholder={t("e.g. 750")} required />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-800">{t("Condition *")}</span>
                  <select className={inputClass} value={form.condition} onChange={update("condition")}>
                    <option value="used">{t("Used")}</option>
                    <option value="refurbished">{t("Refurbished")}</option>
                    <option value="new">{t("New")}</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-gray-800">{t("Warranty (months)")}</span>
                    <input className={inputClass} value={form.warranty_months} onChange={update("warranty_months")} inputMode="numeric" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-gray-800">{t("Ready in (days)")}</span>
                    <input className={inputClass} value={form.delivery_days} onChange={update("delivery_days")} inputMode="numeric" placeholder="0 = today" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-800">{t("Note to buyer")}</span>
                  <textarea
                    className={`${inputClass} h-24 py-2`}
                    value={form.note}
                    onChange={update("note")}
                    maxLength={500}
                    placeholder={t("Mileage, tested, original part, delivery options…")}
                  />
                </label>
              </div>

              {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {notice ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

              <button
                type="submit"
                disabled={saving}
                className="mt-5 h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? t("Saving…") : myOffer?.status === "pending" ? t("Update offer") : t("Send offer")}
              </button>
              {myOffer?.status === "pending" ? (
                <button
                  type="button"
                  onClick={withdraw}
                  disabled={saving}
                  className="mt-2 h-10 w-full rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  {t("Withdraw offer")}
                </button>
              ) : null}
              <p className="mt-3 text-xs text-gray-500">{t("The buyer sees your store name, price, condition and warranty. Their phone is shared with you only if they accept.")}</p>
            </form>
          ) : (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
              {myOffer?.status === "rejected"
                ? t("The buyer chose another offer. Thanks for answering!")
                : t("This request is no longer accepting offers.")}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
