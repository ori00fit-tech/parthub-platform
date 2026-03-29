import type { OrderStatus, PaymentStatus, ShippingStatus } from "../types/orders";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "unpaid",
  "paid",
  "refunded",
  "failed",
];

export const SHIPPING_STATUSES: ShippingStatus[] = [
  "pending",
  "packed",
  "shipped",
  "delivered",
  "returned",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "yellow",
  confirmed: "blue",
  processing: "indigo",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
};
