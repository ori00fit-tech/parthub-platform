import { useEffect, useRef, useState } from "react";

// One conversation about an order (utils/order-messages.ts in the API):
// the messages, oldest first, and a box to write. Used by the storefront
// (buyer, order tracking page) and the seller portal (order page).
// props: messages [{id, sender, body, created_at}], me ("buyer"|"seller"),
// otherName, onSend(body) → Promise<message>, t, intro (text above the box).
const MAX = 1000;

function when(iso) {
  if (!iso) return "";
  const d = new Date(`${String(iso).replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function MessageThread({ messages = [], me, otherName, onSend, t, intro }) {
  const [list, setList] = useState(messages);
  const [text, setText] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  const end = useRef(null);

  useEffect(() => setList(messages), [messages]);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [list.length]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setState({ busy: true, error: "" });
    try {
      const message = await onSend(body);
      if (message) setList((l) => [...l, message]);
      setText("");
      setState({ busy: false, error: "" });
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }

  return (
    <div className="space-y-3">
      {list.length ? (
        <ol className="max-h-96 space-y-2 overflow-y-auto rounded-2xl bg-gray-50 p-3" aria-label={t("Messages")}>
          {list.map((m) => {
            const mine = m.sender === me;
            const who = mine ? t("You") : m.sender === "admin" ? "PartHub" : otherName;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-900"}`}>
                  <p className={`text-xs font-semibold ${mine ? "text-blue-100" : "text-gray-500"}`}>{who} · {when(m.created_at)}</p>
                  <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </li>
            );
          })}
          <li ref={end} aria-hidden="true" />
        </ol>
      ) : null}
      <form onSubmit={send} className="space-y-2">
        {intro ? <p className="text-xs text-gray-500">{intro}</p> : null}
        <label className="block text-sm font-semibold text-gray-800">
          {t("Your message")}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            rows={3}
            dir="auto"
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{text.length}/{MAX}</span>
          <button type="submit" disabled={state.busy || !text.trim()} className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            {state.busy ? t("Please wait...") : t("Send")}
          </button>
        </div>
        {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
      </form>
    </div>
  );
}
