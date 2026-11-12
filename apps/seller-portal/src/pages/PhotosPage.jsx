import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { uploadPartPhoto } from "../lib/photos";
import { useT } from "../i18n";

// Parts without a photo, one after the other, made for the phone: each row
// opens the camera (or the gallery), the photo is compressed, uploaded and
// set as the part's main photo. PartHub approves a part only with a photo
// (API: admin parts status), so this is what unblocks a big CSV import.

const STATUS = {
  pending: ["Waiting for review", "bg-amber-50 text-amber-800"],
  active: ["Online", "bg-emerald-50 text-emerald-700"],
  rejected: ["Rejected", "bg-red-50 text-red-700"],
  draft: ["Draft", "bg-gray-100 text-gray-700"],
};

function Row({ part, onDone }) {
  const t = useT();
  const [state, setState] = useState({ busy: false, error: "", done: 0 });

  async function add(fileList) {
    const files = [...(fileList || [])].slice(0, 6);
    if (!files.length) return;
    setState({ busy: true, error: "", done: 0 });
    let done = 0;
    for (const [i, file] of files.entries()) {
      try {
        const url = await uploadPartPhoto(file);
        await api.post(`/api/v1/marketplace/parts/${part.id}/images`, { url, sort_order: i + 1, is_featured: i === 0 });
        done++;
        setState((s) => ({ ...s, done }));
      } catch (err) {
        setState((s) => ({ ...s, error: err?.message || t("Upload failed") }));
      }
    }
    setState((s) => ({ ...s, busy: false }));
    if (done) onDone(part.id, done);
  }

  const [label, tone] = STATUS[part.status] || STATUS.draft;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        {/* dir="auto": a French title stays left-to-right in the Arabic interface (no cut start) */}
        <p dir="auto" className="line-clamp-2 text-start text-sm font-semibold text-gray-900">{part.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {part.sku ? <span className="font-mono" dir="ltr">{part.sku}</span> : null}
          <span className={["rounded-full px-2 py-0.5 font-semibold", tone].join(" ")}>{t(label)}</span>
          <Link to={`/parts/${part.id}/edit`} className="font-semibold text-blue-700 hover:underline">{t("Edit")}</Link>
        </p>
        {state.error ? <p className="mt-1 text-xs text-red-700" role="alert">{state.error}</p> : null}
      </div>
      <label className={["inline-flex h-11 min-w-[9rem] cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-white", state.busy ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"].join(" ")}>
        {state.busy ? t("Uploading {n}…", { n: state.done + 1 }) : t("Take a photo")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          disabled={state.busy}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </li>
  );
}

export default function PhotosPage() {
  const t = useT();
  const [parts, setParts] = useState(null);
  const [done, setDone] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/v1/marketplace/me/parts")
      .then((r) => setParts((r?.data || []).filter((p) => !p.image_url && p.status !== "archived")))
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const left = (parts || []).filter((p) => !done.includes(p.id));
  const total = parts?.length || 0;

  return (
    <section className="space-y-5">
      <div>
        <Link to="/parts" className="text-sm font-semibold text-blue-700 hover:underline">← {t("Inventory")}</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{t("Parts without a photo")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          {t("PartHub publishes a part only with at least one real photo. Take one for each part below: it is compressed and added as the main photo, and the part goes to review.")}
        </p>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      {!parts ? (
        <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
      ) : total === 0 ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{t("Every part has a photo.")}</p>
      ) : (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{t("{done} of {total} done", { done: done.length, total })}</p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${total ? (done.length / total) * 100 : 0}%` }} />
            </div>
          </div>
          {left.length ? (
            <ul className="mt-2 divide-y divide-gray-100">
              {left.map((p) => (
                <Row key={p.id} part={p} onDone={(id) => setDone((d) => [...d, id])} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t("All done. PartHub reviews the parts and publishes them.")}</p>
          )}
        </div>
      )}
    </section>
  );
}
