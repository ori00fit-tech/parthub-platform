// ============================
// Seller Types
// ============================

export type SellerStatus = "pending" | "active" | "suspended" | "rejected";

export interface Seller {
  id: number;
  user_id: number;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  status: SellerStatus;
  rating_avg: number | null;
  rating_count: number;
  parts_count: number;
  joined_at: string;
}

export interface SellerDashboardStats {
  total_parts: number;
  active_parts: number;
  pending_orders: number;
  total_orders: number;
  total_revenue: number;
  avg_rating: number | null;
  this_month_orders: number;
  this_month_revenue: number;
}
