// ============================
// Part Types
// ============================

export interface Part {
  id: number;
  slug: string;
  seller_id: number;
  category_id: number;
  brand_id: number | null;
  title: string;
  description: string | null;
  sku: string | null;
  price: number;
  compare_price: number | null;
  condition: PartCondition;
  quantity: number;
  status: PartStatus;
  weight_kg: number | null;
  featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export type PartCondition = "new" | "used" | "refurbished";
export type PartStatus = "draft" | "pending" | "active" | "rejected" | "archived";

export interface PartCardItem {
  id: number;
  slug: string;
  title: string;
  price: number;
  compare_price: number | null;
  condition: PartCondition;
  status: PartStatus;
  thumbnail: string | null;
  seller_name: string;
  seller_slug: string;
  rating_avg: number | null;
  rating_count: number;
  compatible_makes: string[];
}

export interface PartDetails extends Part {
  seller: {
    id: number;
    slug: string;
    name: string;
    logo_url: string | null;
    rating_avg: number | null;
    rating_count: number;
    location: string | null;
  };
  category: {
    id: number;
    slug: string;
    name: string;
  };
  brand: {
    id: number;
    slug: string;
    name: string;
  } | null;
  images: PartImage[];
  compatibility: CompatibilityItem[];
  specs: PartSpec[];
}

export interface PartImage {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_featured: boolean;
}

export interface PartSpec {
  id: number;
  label: string;
  value: string;
}

export interface CompatibilityItem {
  id: number;
  make: string;
  model: string;
  year_start: number;
  year_end: number | null;
  engine: string | null;
  trim: string | null;
  notes: string | null;
}

export interface PartFilters {
  category_id?: number;
  brand_id?: number;
  condition?: PartCondition;
  min_price?: number;
  max_price?: number;
  make?: string;
  model?: string;
  year?: number;
  search?: string;
  seller_id?: number;
  featured?: boolean;
  sort?: PartSortOption;
  page?: number;
  limit?: number;
}

export type PartSortOption =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "popular";
