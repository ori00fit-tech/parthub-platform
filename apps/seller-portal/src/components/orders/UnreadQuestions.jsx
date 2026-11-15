import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// Orders with buyer questions not read yet (API: GET
// /api/v1/marketplace/me/messages/unread). Nothing shown when there are none.
export default function UnreadQuestions() {
  const t = useT();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/api/v1/marketplace/me/messages/unread").then((r) => setRows(Array.isArray(r?.data) ? r.data : [])).catch(() => setRows([]));
  }, []);

  if (!rows.length) return null;
  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5" role="status">
      <p className="text-sm font-bold text-blue-900">{t("Buyers are waiting for your answer")}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {rows.map((r) => (
          <li key={r.order_id}>
            <Link to={`/orders/${r.order_id}#questions`} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-blue-800 shadow-sm hover:underline">
              <span dir="ltr" className="font-mono">{r.reference}</span>
              <span className="rounded-full bg-blue-600 px-2 text-xs text-white">{t("{n} new", { n: r.unread })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
