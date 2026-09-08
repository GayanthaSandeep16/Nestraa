// Not modeled in the schema (no company-settings table) — this is the one
// legal entity Nestraa operates as, so a static constant is fine here rather
// than a database row that would only ever have a single value.
export const COMPANY = {
  name: "Nestraa Private Limited",
  addressLines: ["11/A Manthanne, Kirawanagama,", "Haldummulla, Sri Lanka"],
  phone: "+94 77 080 2174",
  email: "nestraa.info@gmail.com",
  currency: "LKR",
} as const;

export function formatMoney(value: number | string) {
  return `${COMPANY.currency} ${formatAmount(value)}`;
}

// No currency prefix — for narrow table cells where "LKR 2,000.00" wraps.
// Pair with a "(amounts in LKR)" note near the table.
export function formatAmount(value: number | string) {
  return Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
