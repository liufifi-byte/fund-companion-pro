import { FundHolding, Purchase } from "@/types/fund";

export interface HoldingCalc {
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentValue: number;
  holdingPnlAmount: number;
  holdingPnlPercent: number;
  todayPnlAmount: number;
  realizedPnl: number;
}

function getToday(): string {
  // Beijing time date string YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

export function calcHolding(h: FundHolding): HoldingCalc {
  const purchases = h.purchases || [];
  let realizedPnl = h.realizedPnl || 0;

  let runningShares = 0;
  let runningCost = 0;

  for (const p of purchases) {
    const txType = p.type || "buy";
    if (txType === "buy") {
      const shares = p.buyNav > 0 ? p.amount / p.buyNav : 0;
      runningShares += shares;
      runningCost += p.amount;
    } else {
      const sellShares = p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0);
      const avgCostAtSale = runningShares > 0 ? runningCost / runningShares : 0;
      runningShares = Math.max(0, runningShares - sellShares);
      runningCost = runningShares > 0 ? runningShares * avgCostAtSale : 0;
    }
  }

  const totalShares = runningShares;
  const totalCost = runningCost;
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const currentValue = totalShares * h.currentNav;
  const holdingPnlAmount = currentValue - totalCost;
  const holdingPnlPercent = totalCost > 0 ? holdingPnlAmount / totalCost : 0;

  const dayChange = h.dayChangePercent / 100;
  const yesterdayClose = h.currentNav / (1 + dayChange);
  const todayPnlAmount = (h.currentNav - yesterdayClose) * totalShares;

  if (import.meta.env.DEV) {
    console.log("持仓调试", {
      name: h.name,
      currentPrice: h.currentNav,
      prevClosePrice: yesterdayClose,
      dailyChangePct: h.dayChangePercent,
      currentValue,
      todayPnl: todayPnlAmount,
    });
  }

  return {
    totalShares,
    totalCost,
    avgCost,
    currentValue,
    holdingPnlAmount,
    holdingPnlPercent,
    todayPnlAmount,
    realizedPnl,
  };
}
