// ============================
// Review Types
// ============================

export interface Review {
  id: number;
  part_id: number;
  buyer_id: number;
  order_item_id: number | null;
  rating: number; // 1–5
  body: string | null;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  created_at: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewWithAuthor extends Review {
  buyer_name: string;
  buyer_avatar: string | null;
  images: string[];
}

export interface ReviewSummary {
  avg: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
