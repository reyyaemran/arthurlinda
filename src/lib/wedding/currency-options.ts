/** Preset ISO 4217 codes for dashboard formatting (budget, overview). */
export type DashboardCurrencyOption = {
  code: string;
  label: string;
};

export const DASHBOARD_CURRENCY_OPTIONS: DashboardCurrencyOption[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "KRW", label: "South Korean Won" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "MYR", label: "Malaysian Ringgit" },
  { code: "THB", label: "Thai Baht" },
  { code: "VND", label: "Vietnamese Dong" },
  { code: "IDR", label: "Indonesian Rupiah" },
  { code: "PHP", label: "Philippine Peso" },
  { code: "KHR", label: "Cambodian Riel" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "TWD", label: "Taiwan Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "INR", label: "Indian Rupee" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "PLN", label: "Polish Zloty" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "ZAR", label: "South African Rand" },
  { code: "BDT", label: "Bangladeshi Taka" },
  { code: "PKR", label: "Pakistani Rupee" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "EGP", label: "Egyptian Pound" },
];

const CODES = new Set(DASHBOARD_CURRENCY_OPTIONS.map((c) => c.code));

export function dashboardCurrencyMeta(code: string): DashboardCurrencyOption {
  const upper = code.trim().toUpperCase().slice(0, 3) || "USD";
  const found = DASHBOARD_CURRENCY_OPTIONS.find((c) => c.code === upper);
  if (found) return found;
  return { code: upper, label: upper };
}

export function isPresetDashboardCurrency(code: string): boolean {
  return CODES.has(code.trim().toUpperCase().slice(0, 3));
}

/** Narrow currency glyph(s) for menus — uses `Intl` (en-US, symbol display) so $ variants differ (e.g. A$, CA$). */
export function getDashboardCurrencySymbol(isoCode: string): string {
  const code = isoCode.trim().toUpperCase().slice(0, 3) || "USD";
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const cur = parts.find((p) => p.type === "currency");
    if (cur?.value) return cur.value;
  } catch {
    /* invalid ISO 4217 */
  }
  return "¤";
}
