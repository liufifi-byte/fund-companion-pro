// Mock exchange rates: 1 unit of foreign currency = X CNY
export const RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.23,
  HKD: 0.92,
};

export function toCNY(amount: number, currency: string = "CNY"): number {
  return amount * (RATES[currency] ?? 1);
}

export function currencySymbol(currency: string = "CNY"): string {
  if (currency === "USD") return "$";
  if (currency === "HKD") return "HK$";
  return "¥";
}
