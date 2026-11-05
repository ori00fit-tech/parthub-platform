import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "../../i18n";

// A short guided tour of the seller portal, shown once per account on the
// dashboard and available again from "Take the tour". It points at the real
// elements (data-tour="…"); a step whose element isn't on screen is skipped.
const STEPS = [
  {
    targets: ["status"],
    title: "Your store status",
    text: "This tells you whether buyers can see your store. New stores are reviewed by PartHub before going live.",
  },
  {
    targets: ["checklist"],
    title: "Finish these steps",
    text: "The required steps make your store ready for review. The recommended ones bring you more buyers.",
  },
  {
    targets: ["add-part", "add-part-hero"],
    title: "Add your parts",
    text: "Five short steps: the part, photos, price, the vehicles it fits, then publish. You can do it from your phone.",
  },
  {
    targets: ["requests"],
    title: "Buyers looking for parts",
    text: "Buyers post the parts they can't find. Send an offer; if they accept, you get their contact.",
  },
  {
    targets: ["language"],
    title: "Your language",
    text: "Switch between Arabic, French and English at any time.",
  },
];

const PAD = 8;

export function tourStorageKey(userId) {
  return `ph_seller_tour_done_${userId || "anon"}`;
}

export function hasSeenTour(userId) {
  try {
    return localStorage.getItem(tourStorageKey(userId)) === "1";
  } catch {
    return true; // storage blocked: don't keep showing it
  }
}

function findTarget(names) {
  for (const name of names) {
    const el = document.querySelector(`[data-tour="${name}"]`);
    if (el && el.getClientRects().length && el.offsetParent !== null) return el;
  }
  return null;
}

export default function SellerTour({ open, userId, onClose }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [steps, setSteps] = useState([]);
  const cardRef = useRef(null);

  // Steps whose element exists right now.
  useEffect(() => {
    if (!open) return;
    setSteps(STEPS.filter((s) => findTarget(s.targets)));
    setIndex(0);
  }, [open]);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = findTarget(step.targets);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    const el = findTarget(step.targets);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(measure, 350);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(tourStorageKey(userId), "1");
    } catch {
      // ignore
    }
    onClose?.();
  }, [userId, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    cardRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") finish();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, index, finish]);

  if (!open || !step) return null;

  const last = index === steps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 640;
  const cardWidth = Math.min(360, vw - 32);
  // Below the highlighted element if there is room, else above it.
  let cardStyle;
  if (narrow || !rect) {
    cardStyle = { left: 16, right: 16, bottom: 16 };
  } else {
    const below = rect.top + rect.height + 12;
    const top = below + 220 < vh ? below : Math.max(16, rect.top - 12 - 220);
    const left = Math.min(Math.max(16, rect.left), vw - cardWidth - 16);
    cardStyle = { top, left, width: cardWidth };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dim everything except the highlighted element. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-4 ring-blue-400 transition-all duration-200"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(15,23,42,.6)" }}
          aria-hidden="true"
        />
      ) : (
        <div className="fixed inset-0 bg-slate-900/60" aria-hidden="true" />
      )}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="fixed rounded-3xl bg-white p-5 shadow-2xl outline-none"
        style={cardStyle}
      >
        <p className="text-xs font-semibold text-blue-700">
          {t("Step {n} of {total}", { n: index + 1, total: steps.length })}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg font-bold text-gray-900">
          {t(step.title)}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-gray-600">{t(step.text)}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={finish} className="me-auto text-sm font-semibold text-gray-500 hover:text-gray-800">
            {t("Skip tour")}
          </button>
          {index > 0 ? (
            <button type="button" onClick={() => setIndex((i) => i - 1)} className="h-10 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {t("Back")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (last ? finish() : setIndex((i) => i + 1))}
            className="h-10 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {last ? t("Got it") : t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
