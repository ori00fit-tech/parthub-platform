import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatMAD, mediaUrl, offerBadge } from "../lib/requests";

export default function RequestsInboxPage() {
  const [scope, setScope] = useState("matched");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ scope });
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());

    // Small debounce so typing in the filters doesn't fire a request per key.
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/v1/requests/inbox?${params}`);
        if (!active) return;
        setRequests(Array.isArray(res?.data) ? res.data : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setRequests([]);
        setError(err?.message || "Failed to load requests");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scope, query, city]);

  const openCount = requests.filter((r) => !r.my_offer_id && r.status === "open").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Part requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Buyers looking for parts they couldn't find. Send an offer — if they accept, you get their contact.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {[
            ["matched", "For my stock"],
            ["all", "All requests"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                scope === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-600",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search part, make, OEM…"
          className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="h-10 w-36 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {scope === "matched" ? (
        <p className="text-xs text-gray-500">
          Showing requests for makes you have compatibility data for, or categories you sell in.
          {openCount ? ` ${openCount} waiting for your offer.` : ""}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {/not active/i.test(error) ? " — your store must be approved by PartHub before you can answer requests." : ""}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="text-4xl">📭</div>
          <p className="mt-3 text-base font-bold text-gray-900">No requests right now</p>
          <p className="mt-1 text-sm text-gray-500">
            {scope === "matched"
              ? "Add vehicle compatibility to your parts to get matched with more buyers, or browse all requests."
              : "New buyer requests will show up here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((r) => {
            const badge = offerBadge(r.my_offer_status);
            return (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {r.images?.[0] ? (
                    <>
                      <img src={mediaUrl(r.images[0])} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {r.images.length > 1 ? (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-950/70 px-1 text-[10px] font-bold text-white">
                          +{r.images.length - 1}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">⚙️</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {badge ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">New</span>
                    )}
                    {Number(r.is_match) ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">Matches your stock</span>
                    ) : null}
                    <span className="text-xs text-gray-400">{r.reference}</span>
                  </div>
                  <p className="mt-1.5 truncate text-base font-bold text-gray-900">{r.part_name}</p>
                  <p className="text-sm text-gray-500">
                    {[r.make, r.model, r.year, r.engine].filter(Boolean).join(" ")} · {r.city}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {r.my_offer_price != null ? (
                    <p className="font-bold text-slate-950">Your offer: {formatMAD(r.my_offer_price)}</p>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    {r.offer_count} {Number(r.offer_count) === 1 ? "offer" : "offers"} so far
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
