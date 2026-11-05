// Ratings shown to buyers: approved reviews only (admin moderates each one).
import type { Env } from "../types";

export type RatingSummary = { count: number; average: number | null };
export type PublicReview = {
  id: number;
  rating: number;
  body: string | null;
  author: string;
  verified: boolean;
  created_at: string;
  part_title?: string;
  part_slug?: string;
};

// "Youssef Benali" → "Youssef B." — enough to feel real, not enough to identify.
export function shortName(name: string | null | undefined): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

function toSummary(row: { n: number; avg: number | null } | null): RatingSummary {
  const count = Number(row?.n || 0);
  return { count, average: count ? Math.round(Number(row?.avg) * 10) / 10 : null };
}

export async function partRating(env: Env, partId: number): Promise<RatingSummary> {
  const row = await env.DB.prepare(
    "select count(*) as n, avg(rating) as avg from reviews where part_id = ?1 and status = 'approved'"
  )
    .bind(partId)
    .first<{ n: number; avg: number | null }>();
  return toSummary(row);
}

export async function sellerRating(env: Env, sellerId: number): Promise<RatingSummary> {
  const row = await env.DB.prepare(
    `select count(*) as n, avg(r.rating) as avg
     from reviews r join parts p on p.id = r.part_id
     where p.seller_id = ?1 and r.status = 'approved'`
  )
    .bind(sellerId)
    .first<{ n: number; avg: number | null }>();
  return toSummary(row);
}

type ReviewRow = {
  id: number; rating: number; body: string | null; buyer_name: string | null;
  is_verified_purchase: number; created_at: string; part_title?: string; part_slug?: string;
};

function toPublic(rows: ReviewRow[]): PublicReview[] {
  return rows.map((r) => ({
    id: r.id,
    rating: Number(r.rating),
    body: r.body,
    author: shortName(r.buyer_name),
    verified: Boolean(r.is_verified_purchase),
    created_at: r.created_at,
    ...(r.part_title ? { part_title: r.part_title, part_slug: r.part_slug } : {}),
  }));
}

export async function partReviews(env: Env, partId: number, limit = 5): Promise<PublicReview[]> {
  const res = await env.DB.prepare(
    `select r.id, r.rating, r.body, r.is_verified_purchase, r.created_at, u.name as buyer_name
     from reviews r join users u on u.id = r.buyer_id
     where r.part_id = ?1 and r.status = 'approved'
     order by r.created_at desc limit ?2`
  )
    .bind(partId, limit)
    .all<ReviewRow>();
  return toPublic(res.results || []);
}

export async function sellerReviews(env: Env, sellerId: number, limit = 5): Promise<PublicReview[]> {
  const res = await env.DB.prepare(
    `select r.id, r.rating, r.body, r.is_verified_purchase, r.created_at, u.name as buyer_name,
            p.title as part_title, p.slug as part_slug
     from reviews r
     join parts p on p.id = r.part_id
     join users u on u.id = r.buyer_id
     where p.seller_id = ?1 and r.status = 'approved'
     order by r.created_at desc limit ?2`
  )
    .bind(sellerId, limit)
    .all<ReviewRow>();
  return toPublic(res.results || []);
}
