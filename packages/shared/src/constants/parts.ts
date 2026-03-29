import type { PartCondition, PartStatus } from "../types/parts";

export const PART_CONDITIONS: PartCondition[] = ["new", "used", "refurbished"];

export const PART_STATUSES: PartStatus[] = [
  "draft",
  "pending",
  "active",
  "rejected",
  "archived",
];

export const PART_CONDITION_LABELS: Record<PartCondition, string> = {
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
};

export const PART_STATUS_LABELS: Record<PartStatus, string> = {
  draft: "Draft",
  pending: "Pending Review",
  active: "Active",
  rejected: "Rejected",
  archived: "Archived",
};

export const DEFAULT_PART_IMAGE = "/assets/placeholder-part.webp";
export const MAX_PART_IMAGES = 8;
export const MAX_IMAGE_SIZE_MB = 5;
