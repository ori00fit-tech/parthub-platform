import { Link } from "react-router-dom";
import { STATUS_COPY } from "../../lib/readiness";

const TONES = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const DOT = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-red-500",
};

export function StoreStatusBanner({ readiness }) {
  if (!readiness) return null;
  const copy = STATUS_COPY[readiness.status] || STATUS_COPY.setup;
  return (
    <div className={["flex flex-wrap items-center gap-4 rounded-3xl border px-5 py-4", TONES[copy.tone]].join(" ")} role="status">
      <span className={["h-2.5 w-2.5 flex-none rounded-full", DOT[copy.tone]].join(" ")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{copy.title}</p>
        <p className="mt-0.5 text-sm opacity-90">{copy.text}</p>
      </div>
      {copy.cta ? (
        <Link
          to={copy.cta.to}
          className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {copy.cta.label}
        </Link>
      ) : null}
    </div>
  );
}

function CheckIcon({ done }) {
  return done ? (
    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  ) : (
    <span className="h-6 w-6 flex-none rounded-full border-2 border-gray-300 bg-white" aria-hidden="true" />
  );
}

export default function StoreChecklist({ readiness, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-2 animate-pulse rounded-full bg-gray-100" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !readiness) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || "Could not load your store status."}{" "}
        {onRetry ? (
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  const required = readiness.items.filter((i) => i.required);
  const optional = readiness.items.filter((i) => !i.required);
  const requiredLeft = required.filter((i) => !i.done).length;

  const Row = ({ item }) => (
    <li className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3">
      <CheckIcon done={item.done} />
      <div className="min-w-0 flex-1">
        <p className={["text-sm font-semibold", item.done ? "text-gray-500 line-through decoration-gray-300" : "text-gray-900"].join(" ")}>
          {item.label}
        </p>
        {!item.done ? <p className="mt-0.5 text-xs text-gray-500">{item.hint}</p> : null}
      </div>
      {!item.done && item.action ? (
        <Link
          to={item.action.to}
          className="flex-none rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
        >
          {item.action.label}
        </Link>
      ) : null}
    </li>
  );

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Store setup</h2>
          <p className="mt-1 text-sm text-gray-500">
            {requiredLeft === 0
              ? "All required steps are done."
              : `${requiredLeft} required step${requiredLeft === 1 ? "" : "s"} left.`}
          </p>
        </div>
        <p className="text-3xl font-bold text-gray-900">
          {readiness.percent}
          <span className="text-base font-semibold text-gray-400">%</span>
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readiness.percent}
        aria-label="Store setup progress"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${readiness.percent}%` }} />
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Required</p>
      <ul className="mt-2 space-y-2">
        {required.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Recommended</p>
      <ul className="mt-2 space-y-2">
        {optional.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}
