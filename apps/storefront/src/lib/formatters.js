export function formatPriceGBP(value) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}
