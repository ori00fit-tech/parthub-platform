import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function VehicleSelectorPage() {
  const [makes, setMakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await apiGet("/api/v1/vehicles/makes");
        if (!active) return;
        setMakes(res?.data || []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load makes");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6 pb-10">
      <div className="rounded-3xl bg-blue-600 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Vehicle Selector</h1>
        <p className="mt-2 text-sm text-blue-100">
          Cloudflare Pages deploy test
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading makes...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Loaded makes: {makes.length}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {makes.slice(0, 12).map((make) => (
                <div
                  key={make.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-semibold text-gray-900">{make.name}</p>
                  <p className="text-sm text-gray-500">{make.slug}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
