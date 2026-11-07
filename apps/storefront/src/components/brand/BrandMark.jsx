// PartHub logo for the storefront's dark header and footer. The mark and
// colors are shared by the three apps: packages/shared/src/brand
// (guidelines: infra/docs/brand.md).
import { LogoMark, LogoWordmark } from "@parthub/shared/brand";

export default function BrandMark({ className = "h-10 w-10" }) {
  return <LogoMark variant="white" className={className} />;
}

export function Wordmark({ className = "" }) {
  return <LogoWordmark onDark className={`text-[26px] ${className}`} />;
}
