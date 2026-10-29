const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "2026-11-04" -> "Nov 4". Deterministic, no local timezone. */
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatCurrency = (n: number) => money.format(n);
