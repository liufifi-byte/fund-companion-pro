/** Unified PnL color: red for positive (profit), green for negative (loss) — A-share convention */
export function pnlColorClass(value: number): string {
  if (value > 0) return "fund-rise";
  if (value < 0) return "fund-fall";
  return "text-muted-foreground";
}

export function formatPnl(value: number, sym: string, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatPnlPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
