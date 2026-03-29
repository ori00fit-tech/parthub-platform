import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/parts")
      .then((res) => {
        setParts(res?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading parts...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Auto Parts</h1>

      <div className="grid grid-cols-2 gap-4">
        {parts.map((p) => (
          <div key={p.id} className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold">{p.title}</h2>

            <p className="text-sm text-gray-500 mt-1">
              {p.brand_name} • {p.category_name}
            </p>

            <p className="text-lg font-bold mt-3">
              {formatPriceGBP(p.price)}
            </p>

            <p className="text-xs text-gray-400">
              {p.seller_location}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
