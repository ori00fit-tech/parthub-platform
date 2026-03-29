// ============================
// Order Types
// ============================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type ShippingStatus =
  | "pending"
  | "packed"
  | "shipped"
  | "delivered"
  | "returned";

export interface Order {
  id: number;
  reference: string; // e.g. PH-2024-00123
  buyer_id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  part_id: number;
  seller_id: number;
  title: string;
  sku: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  thumbnail: string | null;
}

export interface OrderAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

export interface OrderDetails extends Order {
  items: OrderItem[];
  shipping_address: OrderAddress;
  buyer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  timeline: OrderEvent[];
}

export interface OrderEvent {
  id: number;
  order_id: number;
  event: string;
  note: string | null;
  created_at: string;
  created_by: string;
}
