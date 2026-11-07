// Reasons a buyer can give for a problem with a delivered part, and who pays
// for the return under the returns policy (null: PartHub decides when the
// buyer and the seller disagree). Same list as workers/api/src/utils/issues.ts.
// Labels are English source text, translated in each app.
export const ISSUE_REASONS: ReadonlyArray<{ id: string; label: string; pays: "seller" | "buyer" | null }> = [
  { id: "not_as_described", label: "The part is different from its description", pays: "seller" },
  { id: "damaged", label: "The part was damaged on arrival", pays: "seller" },
  { id: "not_compatible", label: "It does not fit, although the listing said it would", pays: "seller" },
  { id: "hidden_defect", label: "Used part with a hidden defect", pays: "seller" },
  { id: "not_received", label: "I did not receive the part, although it is marked delivered", pays: "seller" },
  { id: "wrong_part_ordered", label: "I ordered the wrong part", pays: "buyer" },
  { id: "changed_mind", label: "I changed my mind", pays: "buyer" },
  { id: "other", label: "Something else", pays: null },
];

export function issueReasonLabel(id: string): string {
  return ISSUE_REASONS.find((r) => r.id === id)?.label ?? "Something else";
}
