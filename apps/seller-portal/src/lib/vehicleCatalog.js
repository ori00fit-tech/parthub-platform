import { useEffect, useState } from "react";
import { api } from "./api";

// Vehicle catalog lists (makes → models → generations → engines), cached for
// the session so several fitment rows don't refetch the same lists.
const cache = new Map();

function cached(key, path) {
  if (!cache.has(key)) {
    cache.set(
      key,
      api
        .get(path)
        .then((res) => (Array.isArray(res?.data) ? res.data : []))
        .catch(() => {
          cache.delete(key);
          return [];
        })
    );
  }
  return cache.get(key);
}

export const loadMakes = () => cached("makes", "/api/v1/vehicles/makes");
export const loadModels = (makeSlug) => cached(`models:${makeSlug}`, `/api/v1/vehicles/models?make=${encodeURIComponent(makeSlug)}`);
export const loadGenerations = (makeSlug, modelSlug) =>
  cached(`gens:${makeSlug}:${modelSlug}`, `/api/v1/vehicles/generations?make=${encodeURIComponent(makeSlug)}&model=${encodeURIComponent(modelSlug)}`);
export const loadEngines = (generationId) => cached(`engines:${generationId}`, `/api/v1/vehicles/engines?generation_id=${generationId}`);

// The list for a key, [] while loading or when the key is empty.
export function useCatalogList(loader, ...args) {
  const ready = args.every((a) => a !== undefined && a !== null && a !== "");
  const [state, setState] = useState({ key: "", list: [] });
  const key = args.join("|");
  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    loader(...args).then((list) => active && setState({ key, list }));
    return () => {
      active = false;
    };
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return ready && state.key === key ? state.list : [];
}

// "2012–2019", "2019 →"
export function yearsLabel(from, to) {
  if (!from) return "";
  return to ? (to === from ? String(from) : `${from}–${to}`) : `${from} →`;
}
