/** Unified PnL color: red for positive (profit), green for negative (loss) — A-share convention */
export function pnlColorClass(value: number): string {
  if (value > 0) return "fund-rise";
  if (value < 0) return "fund-fall";
  return "text-muted-foreground";
}

export function formatPnl(value: number, sym: string, decimals = 2): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${sign}${sym}${abs}`;
}

export function formatPnlPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/** Unified format: ±¥xxx.xx（±x.xx%） */
export function formatPnlFull(amount: number, percent: number, sym: string): string {
  return `${formatPnl(amount, sym)}（${formatPnlPercent(percent)}）`;
}

/** Format update time: today → "HH:MM", other days → "M/D HH:MM" */
export function formatUpdateTime(timestamp: string): string {
  if (!timestamp) return "";
  
  // Try parsing various formats
  let date: Date;
  // If it's already a short time like "15:00", just return it
  if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  
  date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    // Try treating as a time-only string for today
    return timestamp;
  }

  const now = new Date();
  const beijing = (d: Date) => {
    const s = d.toLocaleString("en-CA", { timeZone: "Asia/Shanghai", hour12: false });
    return s;
  };
  
  const nowBJ = beijing(now).split(",")[0]?.trim() || beijing(now).split(" ")[0];
  const dateBJ = beijing(date).split(",")[0]?.trim() || beijing(date).split(" ")[0];
  
  const hours = date.toLocaleString("en-US", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });
  
  if (nowBJ === dateBJ) {
    return hours;
  }
  
  const month = date.toLocaleString("en-US", { timeZone: "Asia/Shanghai", month: "numeric" });
  const day = date.toLocaleString("en-US", { timeZone: "Asia/Shanghai", day: "numeric" });
  return `${month}/${day} ${hours}`;
}
