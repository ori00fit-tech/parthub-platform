import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet } from "../../lib/api";
import { formatPrice } from "../../lib/formatters";
import { mediaUrl } from "../../lib/media";
import { useT } from "../../i18n";
import StockBadge from "./StockBadge";
import { Icon } from "@parthub/shared/icons";

// Account page: parts the buyer asked to be told about. Restocked ones come first.
export default function StockAlertsList() {
  const t = useT();
  const [state, setState] = useState({ loading: true, error: "", alerts: [] });

  useEffect(() => {
    let active = true;
    apiGet("/api/v1/stock-alerts/mine", undefined, { auth: true })
      .then((res) => active && setState({ loading: false, error: "", alerts: Array.isArray(res?.data) ? res.data : [] }))
      .catch((err) => active && setState({ loading: false, error: err?.message || "", alerts: [] }));
    return () => {
      active = false;
    };
  }, []);

  async function remove(partId) {
    setState((s) => ({ ...s, alerts: s.alerts.filter((a) => a.part_id !== partId) }));
    try {
      await apiDelete(`/api/v1/stock-alerts/${partId}`, { auth: true });
    } catch {
      // The list refreshes on the next visit; nothing else to do.
    }
  }

  const { loading, error, alerts } = state;
  const backCount = alerts.filter((a) => Number(a.quantity) > 0 && a.part_status === "active").length;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm" aria-labelledby="stock-alerts-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stock-alerts-title" className="text-xl font-bold text-ink">{t("Stock alerts")}</h2>
        {backCount ? (
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
            {backCount === 1 ? t("1 back in stock") : t("{n} back in stock", { n: backCount })}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-2" />
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          {t("When a part is out of stock, tap “Notify me when it's back” on its page. It will show up here.")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((a) => {
            const back = Number(a.quantity) > 0 && a.part_status === "active";
            return (
              <li
                key={a.id}
                className={[
                  "flex items-center gap-3 rounded-2xl border p-3",
                  back ? "border-emerald-400/40 bg-emerald-400/10" : "border-line bg-surface-2",
                ].join(" ")}
              >
                <Link to={`/parts/${a.slug}`} className="media-well flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg">
                  {a.image_url ? <img src={mediaUrl(a.image_url)} alt="" className="h-full w-full object-cover" /> : <Icon name="part" className="h-6 w-6 text-faint" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/parts/${a.slug}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-link">
                    {a.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StockBadge quantity={a.part_status === "active" ? a.quantity : 0} />
                    <span className="font-mono text-xs text-muted">{formatPrice(a.price)}</span>
                  </div>
                </div>
                {back ? (
                  <Link to={`/parts/${a.slug}`} className="btn-cta h-9 flex-none rounded-xl px-3 text-xs">
                    {t("Buy now")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(a.part_id)}
                    className="flex-none text-xs font-semibold text-link underline underline-offset-2"
                  >
                    {t("Stop alerts")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
