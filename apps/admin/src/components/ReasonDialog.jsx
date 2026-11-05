import { useCallback, useEffect, useRef, useState } from "react";
import { t, useT } from "../i18n";

export const MIN_REASON = 10;
const MAX_REASON = 500;

// English keys; ReasonDialog shows them translated.
export const REASON_PRESETS = {
  partRejected: [
    "Photos don't show the actual part. Please upload real photos.",
    "Title or description doesn't match the part shown.",
    "Price looks wrong. Check it's entered in MAD.",
    "Add vehicle compatibility for this vehicle-specific part.",
    "This item isn't allowed on PartHub.",
  ],
  partArchived: ["Duplicate of another listing.", "Out of stock for a long time."],
  sellerRejected: [
    "Store details are incomplete or unclear. Add a clear name, city and description.",
    "We couldn't verify your contact number.",
    "This store looks like a duplicate of an existing account.",
  ],
  sellerSuspended: [
    "Repeated buyer complaints about delivered parts.",
    "Listings don't match the parts delivered.",
    "Breach of the PartHub seller policy.",
  ],
};

// Modal asking the admin why they reject/suspend/archive something.
// The seller sees this text, so it should say what to fix.
function ReasonDialog({ open, title, description, confirmLabel, tone, required, presets, onConfirm, onCancel }) {
  const t = useT();
  const [text, setText] = useState("");
  const textRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setText("");
    const t = setTimeout(() => textRef.current?.focus(), 30);
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const trimmed = text.trim();
  const tooShort = required && trimmed.length < MIN_REASON;
  const confirmClass =
    tone === "danger" ? "bg-red-600 hover:bg-red-700 disabled:bg-red-300" : "bg-gray-900 hover:bg-black disabled:bg-gray-300";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 p-4 sm:items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reason-dialog-title" className="text-xl font-bold text-gray-900">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}

        {presets?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setText(t(p));
                  textRef.current?.focus();
                }}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-start text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-100"
              >
                {t(p)}
              </button>
            ))}
          </div>
        ) : null}

        <label htmlFor="reason-text" className="mt-4 block text-sm font-semibold text-gray-800">
          Message to the seller {required ? <span className="text-red-600">*</span> : <span className="font-normal text-gray-500">(optional)</span>}
        </label>
        <textarea
          id="reason-text"
          ref={textRef}
          rows={4}
          maxLength={MAX_REASON}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("Say what's wrong and what to change.")}
          className="mt-1.5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{tooShort ? t("At least {n} characters.", { n: MIN_REASON }) : t("The seller sees this message.")}</span>
          <span>
            {text.length}/{MAX_REASON}
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={tooShort}
            onClick={() => onConfirm(trimmed)}
            className={["h-11 rounded-2xl px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed", confirmClass].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// const { ask, dialog } = useReasonDialog();
// const reason = await ask({ title, confirmLabel, required, presets }); // null = cancelled
export function useReasonDialog() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(options);
      }),
    []
  );

  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  const dialog = (
    <ReasonDialog
      open={Boolean(state)}
      title={state?.title}
      description={state?.description}
      confirmLabel={state?.confirmLabel || t("Confirm")}
      tone={state?.tone || "danger"}
      required={state?.required ?? true}
      presets={state?.presets}
      onConfirm={(text) => close(text)}
      onCancel={() => close(null)}
    />
  );

  return { ask, dialog };
}

// Which decisions need a message, and how to ask for it.
export function reasonPromptFor(kind, status, name) {
  if (kind === "seller" && status === "rejected") {
    return { title: name ? t("Reject {name}?", { name }) : t("Reject this store?"), description: t("The seller can fix the issue and ask for a new review."), confirmLabel: t("Reject store"), presets: REASON_PRESETS.sellerRejected, required: true };
  }
  if (kind === "seller" && status === "suspended") {
    return { title: name ? t("Suspend {name}?", { name }) : t("Suspend this store?"), description: t("Their parts are hidden from buyers until you reactivate the store."), confirmLabel: t("Suspend store"), presets: REASON_PRESETS.sellerSuspended, required: true };
  }
  if (kind === "part" && status === "rejected") {
    return { title: name ? t("Reject {name}?", { name }) : t("Reject this part?"), description: t("The seller can edit the listing and send it back for review."), confirmLabel: t("Reject part"), presets: REASON_PRESETS.partRejected, required: true };
  }
  if (kind === "part" && status === "archived") {
    return { title: name ? t("Archive {name}?", { name }) : t("Archive this part?"), confirmLabel: t("Archive part"), presets: REASON_PRESETS.partArchived, required: false, tone: "neutral" };
  }
  return null;
}
