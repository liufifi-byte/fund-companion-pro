import { FundHolding, Purchase } from "@/types/fund";

export interface HoldingCalc {
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentValue: number;
  holdingPnlAmount: number;
  holdingPnlPercent: number;
  todayPnlAmount: number;
}

export function calcHolding(h: FundHolding): HoldingCalc {
  const purchases = h.purchases || [];
  let totalShares = 0;
  let totalCost = 0;

  for (const p of purchases) {
    if (p.buyNav > 0) {
      totalShares += p.amount / p.buyNav;
    }
    totalCost += p.amount;
  }

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
  };
}
