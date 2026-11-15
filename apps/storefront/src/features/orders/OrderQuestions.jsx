import { useEffect, useState } from "react";
import MessageThread from "@parthub/shared/messages";
import { apiGet, apiPost } from "../../lib/api";
import { useT } from "../../i18n";

// "Questions to the seller" on the order tracking page (API: GET/POST
// /api/v1/commerce/orders/:reference/messages): one conversation per seller.
export default function OrderQuestions({ reference }) {
  const t = useT();
  const [threads, setThreads] = useState(null);

  useEffect(() => {
    apiGet(`/api/v1/commerce/orders/${encodeURIComponent(reference)}/messages`, undefined, { auth: true })
      .then((r) => setThreads(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setThreads([]));
  }, [reference]);

  if (!threads || !threads.length) return null;
  return (
    <section id="questions" className="scroll-mt-24 rounded-3xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-bold text-ink">{t("Questions to the seller")}</h2>
      <p className="mt-1 text-sm text-muted">{t("Ask about the part, the delivery or a return. The seller gets your message on WhatsApp and answers here.")}</p>
      <div className="mt-4 space-y-6">
        {threads.map((th) => (
          <div key={th.seller_id}>
            {threads.length > 1 ? <h3 className="mb-2 text-sm font-semibold text-ink">{th.seller_name}</h3> : null}
            <MessageThread
              t={t}
              me="buyer"
              otherName={th.seller_name}
              messages={th.messages}
              onSend={(body) => apiPost(`/api/v1/commerce/orders/${encodeURIComponent(reference)}/messages`, { seller_id: th.seller_id, body }, { auth: true }).then((r) => r?.data)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
