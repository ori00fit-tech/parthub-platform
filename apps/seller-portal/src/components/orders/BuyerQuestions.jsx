import { useEffect, useState } from "react";
import MessageThread from "@parthub/shared/messages";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// The buyer's questions about this order (API: GET/POST
// /api/v1/marketplace/me/orders/:id/messages). Opening the page marks them
// read; the buyer gets the answer on WhatsApp.
export default function BuyerQuestions({ orderId, buyerName }) {
  const t = useT();
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    api
      .get(`/api/v1/marketplace/me/orders/${orderId}/messages`)
      .then((r) => setMessages(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setMessages([]));
  }, [orderId]);

  if (messages === null) return null;
  return (
    <section id="questions" className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{t("Buyer's questions")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {messages.length ? t("Answer here: the buyer gets your answer on WhatsApp.") : t("No question yet. You can write to the buyer here too.")}
      </p>
      <div className="mt-4">
        <MessageThread
          t={t}
          me="seller"
          otherName={buyerName || t("Buyer")}
          messages={messages}
          onSend={(body) => api.post(`/api/v1/marketplace/me/orders/${orderId}/messages`, { body }).then((r) => r?.data)}
        />
      </div>
    </section>
  );
}
