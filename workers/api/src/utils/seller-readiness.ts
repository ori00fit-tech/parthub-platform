// ============================================================
// Seller store readiness — what a seller still has to do before their
// listings can sell. Shown as a checklist in the seller portal.
// ============================================================

export type ReadinessStatus =
  | "no_store" // signed up as seller, store not created yet
  | "setup" // store exists, required steps missing
  | "pending_review" // required steps done, waiting for PartHub approval
  | "active" // approved and selling
  | "suspended"
  | "rejected";

export type ChecklistItem = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  required: boolean;
  action: { label: string; to: string } | null;
};

type SellerRow = {
  id: number;
  name: string | null;
  slug: string | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  moderation_note: string | null;
};

type PartStats = {
  total: number;
  with_photo: number;
  with_fitment: number;
  active: number;
};

const filled = (v: string | null | undefined, min = 1) => typeof v === "string" && v.trim().length >= min;

export const MIN_DESCRIPTION_LENGTH = 40;

export function buildChecklist(seller: SellerRow | null, parts: PartStats): ChecklistItem[] {
  const hasStore = Boolean(seller);
  return [
    {
      id: "store",
      label: "Create your store",
      hint: "Store name, web address and city.",
      done: hasStore && filled(seller?.name) && filled(seller?.slug) && filled(seller?.location),
      required: true,
      action: { label: hasStore ? "Edit store" : "Create store", to: "/store-settings" },
    },
    {
      id: "contact",
      label: "Add a phone or WhatsApp number",
      hint: "Buyers who accept your offers contact you on this number.",
      done: hasStore && (filled(seller?.phone, 6) || filled(seller?.whatsapp, 6)),
      required: true,
      action: { label: "Add number", to: "/store-settings" },
    },
    {
      id: "description",
      label: "Describe your store",
      hint: `What you sell, which brands, delivery options (at least ${MIN_DESCRIPTION_LENGTH} characters).`,
      done: hasStore && filled(seller?.description, MIN_DESCRIPTION_LENGTH),
      required: true,
      action: { label: "Write description", to: "/store-settings" },
    },
    {
      id: "first_part",
      label: "List your first part",
      hint: "Title, price in MAD, condition and stock.",
      done: parts.total > 0,
      required: true,
      action: { label: "Add part", to: "/parts/new" },
    },
    {
      id: "photos",
      label: "Add photos to your parts",
      hint: "Listings with photos get far more clicks.",
      done: parts.total > 0 && parts.with_photo > 0,
      required: false,
      action: { label: "Open inventory", to: "/parts" },
    },
    {
      id: "fitment",
      label: "Add vehicle compatibility",
      hint: "Make, model and years, so buyers searching for their car find your parts.",
      done: parts.total > 0 && parts.with_fitment > 0,
      required: false,
      action: { label: "Open inventory", to: "/parts" },
    },
    {
      id: "logo",
      label: "Add a store logo",
      hint: "Shown on your public store page.",
      done: hasStore && filled(seller?.logo_url),
      required: false,
      action: { label: "Add logo", to: "/store-settings" },
    },
  ];
}

export function readinessStatus(seller: SellerRow | null, items: ChecklistItem[]): ReadinessStatus {
  if (!seller) return "no_store";
  if (seller.status === "suspended") return "suspended";
  if (seller.status === "rejected") return "rejected";
  if (seller.status === "active") return "active";
  return items.filter((i) => i.required).every((i) => i.done) ? "pending_review" : "setup";
}

export function readinessPercent(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export async function loadReadiness(DB: D1Database, userId: number) {
  const seller = await DB.prepare(
    `select id, name, slug, phone, whatsapp, location, description, logo_url, status, moderation_note
     from sellers where user_id = ?1 limit 1`
  )
    .bind(userId)
    .first<SellerRow>();

  let parts: PartStats = { total: 0, with_photo: 0, with_fitment: 0, active: 0 };
  if (seller) {
    const row = await DB.prepare(
      `select
         count(*) as total,
         sum(case when exists (select 1 from part_images pi where pi.part_id = p.id) then 1 else 0 end) as with_photo,
         sum(case when exists (select 1 from part_compatibility pc where pc.part_id = p.id) then 1 else 0 end) as with_fitment,
         sum(case when p.status = 'active' then 1 else 0 end) as active
       from parts p where p.seller_id = ?1`
    )
      .bind(seller.id)
      .first<Record<keyof PartStats, number | null>>();
    parts = {
      total: Number(row?.total ?? 0),
      with_photo: Number(row?.with_photo ?? 0),
      with_fitment: Number(row?.with_fitment ?? 0),
      active: Number(row?.active ?? 0),
    };
  }

  const items = buildChecklist(seller, parts);
  return {
    seller,
    parts,
    items,
    status: readinessStatus(seller, items),
    percent: readinessPercent(items),
  };
}
