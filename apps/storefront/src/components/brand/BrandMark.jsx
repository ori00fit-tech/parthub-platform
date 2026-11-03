// PartHub logo mark: a gear on a navy tile. Drawn in SVG so it stays crisp
// at any size and matches the industrial theme.
function gearPath(cx, cy, teeth, outer, inner) {
  const step = (Math.PI * 2) / teeth;
  const points = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [r, ang] of [
      [inner, a],
      [outer, a + step * 0.18],
      [outer, a + step * 0.5],
      [inner, a + step * 0.68],
    ]) {
      points.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`);
    }
  }
  return `M${points.join("L")}Z`;
}

const GEAR = gearPath(20, 20, 10, 15, 12);

export default function BrandMark({ className = "h-10 w-10" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="#0B1A45" stroke="rgba(255,255,255,.25)" />
      <path d={GEAR} fill="#DBE4FF" />
      <circle cx="20" cy="20" r="5.5" fill="#0B1A45" />
      <circle cx="20" cy="20" r="2" fill="#DBE4FF" />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span className={`font-display text-[26px] font-extrabold uppercase leading-none tracking-[0.02em] text-white ${className}`}>
      Part<span className="font-semibold text-navy-ink">Hub</span>
    </span>
  );
}
