// Shipment statuses (same list as workers/api/src/utils/carriers.ts) and
// their labels, English source text translated in each app.
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  created: "Shipment created",
  picked_up: "Picked up by the carrier",
  in_transit: "On the way",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed_attempt: "Delivery attempt failed",
  returning: "Being returned to the seller",
  returned: "Returned to the seller",
  cancelled: "Shipment cancelled",
  unknown: "Update from the carrier",
};

export function shipmentStatusLabel(status: string | null | undefined): string {
  return SHIPMENT_STATUS_LABELS[String(status || "")] || SHIPMENT_STATUS_LABELS.unknown!;
}

// Who wrote an event of the timeline.
export const SHIPMENT_SOURCE_LABELS: Record<string, string> = {
  carrier: "Carrier",
  seller: "Seller",
  admin: "PartHub",
};
