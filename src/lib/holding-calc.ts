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

export function calcHolding(h: FundHolding): HoldingCalc {
  const purchases = h.purchases || [];
  let totalShares = 0;
  let totalCost = 0;
  let realizedPnl = h.realizedPnl || 0;

  // Process transactions in order
  let runningShares = 0;
  let runningCost = 0;

  for (const p of purchases) {
    const txType = p.type || "buy"; // backward compat
    if (txType === "buy") {
      const shares = p.buyNav > 0 ? p.amount / p.buyNav : 0;
      runningShares += shares;
      runningCost += p.amount;
    } else {
      // sell
      const sellShares = p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0);
      const avgCostAtSale = runningShares > 0 ? runningCost / runningShares : 0;
      const costBasis = sellShares * avgCostAtSale;
      const sellProceeds = sellShares * p.buyNav;
      // realized PnL already accumulated in h.realizedPnl via state updates
      runningShares = Math.max(0, runningShares - sellShares);
      runningCost = runningShares > 0 ? runningShares * avgCostAtSale : 0;
    }
  }

  totalShares = runningShares;
  totalCost = runningCost;

  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const currentValue = totalShares * h.currentNav;
  const holdingPnlAmount = currentValue - totalCost;
  const holdingPnlPercent = totalCost > 0 ? holdingPnlAmount / totalCost : 0;

  const dayChange = h.dayChangePercent / 100;
  const todayPnlAmount = currentValue * dayChange / (1 + dayChange);

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
