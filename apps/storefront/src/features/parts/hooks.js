import { useState, useEffect, useCallback } from "react";
import { partsApi } from "./api";

export function useParts(initialFilters = {}) {
  const [parts, setParts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await partsApi.list(filters);
      setParts(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  return { parts, pagination, loading, error, filters, setFilters, refetch: fetch };
}

export function usePart(slug) {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    partsApi.getBySlug(slug)
      .then((res) => setPart(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return { part, loading, error };
}

export function useSimilarParts(slug) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    partsApi.getSimilar(slug)
      .then((res) => setParts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return { parts, loading };
}

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partsApi.getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
