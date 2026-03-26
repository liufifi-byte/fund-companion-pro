import { FundHolding, Purchase } from "@/types/fund";

// ─── 基础计算 ───────────────────────

export function calcShares(buyAmount: number, buyPrice: number): number {
  if (buyPrice <= 0) return 0;
  return buyAmount / buyPrice;
}

export function calcCurrentValue(shares: number, currentPrice: number): number {
  return shares * currentPrice;
}

export function calcHoldingPnl(currentValue: number, totalCost: number): number {
  return currentValue - totalCost;
}

export function calcHoldingPnlPct(holdingPnl: number, totalCost: number): number {
  if (totalCost === 0) return 0;
  return (holdingPnl / totalCost) * 100;
}

/**
 * 今日盈亏金额（基于当前市值和今日涨跌幅）
 * dailyChangePct 是百分比数值，如 -2.5 表示跌2.5%
 */
export function calcTodayPnl(currentValue: number, dailyChangePct: number): number {
  const pct = dailyChangePct / 100;
  if (pct === 0) return 0;
  const prevValue = currentValue / (1 + pct);
  return currentValue - prevValue;
}

/** 今日盈亏率 = API 返回的 dayChangePercent，直接透传 */
export function calcTodayPnlPct(dailyChangePct: number): number {
  return dailyChangePct;
}

// ─── 汇总持仓计算 ──────────────────────

export interface HoldingResult {
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentValue: number;
  holdingPnl: number;
  holdingPnlPct: number;
  todayPnl: number;
  todayPnlPct: number;
  realizedPnl: number;
}

/** 从交易流水中汇总计算持仓各项指标 */
export function calcHoldingFromTx(h: FundHolding): HoldingResult {
  const purchases = h.purchases || [];
  const realizedPnl = h.realizedPnl || 0;

  let runningShares = 0;
  let runningCost = 0;

  for (const p of purchases) {
    const txType = p.type || "buy";
    if (txType === "buy") {
      const shares = calcShares(p.amount, p.buyNav);
      runningShares += shares;
      runningCost += p.amount;
    } else {
      const sellShares = p.shares || calcShares(p.amount, p.buyNav);
      const avgCostAtSale = runningShares > 0 ? runningCost / runningShares : 0;
      runningShares = Math.max(0, runningShares - sellShares);
      runningCost = runningShares > 0 ? runningShares * avgCostAtSale : 0;
    }
  }

  const totalShares = runningShares;
  const totalCost = runningCost;
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const currentValue = calcCurrentValue(totalShares, h.currentNav);
  const holdingPnl = calcHoldingPnl(currentValue, totalCost);
  const holdingPnlPct = calcHoldingPnlPct(holdingPnl, totalCost);
  const todayPnl = calcTodayPnl(currentValue, h.dayChangePercent);
  const todayPnlPct = calcTodayPnlPct(h.dayChangePercent);

  if (import.meta.env.DEV) {
    console.log('持仓调试', {
      name: h.name,
      currentPrice: h.currentNav,
      dailyChangePct: h.dayChangePercent,
      currentValue,
      totalCost,
      holdingPnl,
      holdingPnlPct,
      todayPnl,
      todayPnlPct,
    });
  }

  return {
    totalShares,
    totalCost,
    avgCost,
    currentValue,
    holdingPnl,
    holdingPnlPct,
    todayPnl,
    todayPnlPct,
    realizedPnl,
  };
}

// ─── 格式化 ──────────────────────────

export function formatPnlAmount(value: number, currency: string = "¥", decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value).toLocaleString("zh-CN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${currency}${abs}`;
}

export function formatPnlPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

/** 统一格式：±¥xxx.xx（±x.xx%） */
export function formatPnlFull(amount: number, pct: number, currency: string = "¥"): string {
  return `${formatPnlAmount(amount, currency)}（${formatPnlPct(pct)}）`;
}

/** 格式化更新时间：今天 → "HH:MM"，其他 → "M/D HH:MM" */
export function formatUpdateTime(timestamp: string): string {
  if (!timestamp) return "";
  if (/^\d{1,2}:\d{2}$/.test(timestamp)) return timestamp;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;

  const now = new Date();
  const bj = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const isToday = bj(now) === bj(date);

  const hh = date.toLocaleString("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });

  if (isToday) return hh;

  const month = date.toLocaleString("en-US", { timeZone: "Asia/Shanghai", month: "numeric" });
  const day = date.toLocaleString("en-US", { timeZone: "Asia/Shanghai", day: "numeric" });
  return `${month}/${day} ${hh}`;
}

// ─── PnL 颜色 ──────────────────────

/** A股惯例: 红涨绿跌 */
export function pnlColorClass(value: number): string {
  if (value > 0) return "fund-rise";
  if (value < 0) return "fund-fall";
  return "text-muted-foreground";
}
