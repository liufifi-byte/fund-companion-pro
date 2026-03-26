import { FundHolding } from "@/types/fund";

export interface HoldingCalc {
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentValue: number;
  holdingPnlAmount: number;
  holdingPnlPercent: number;
  todayPnlAmount: number;
  todayPnlPercent: number;
  realizedPnl: number;
}

function getToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

export function calcHolding(h: FundHolding): HoldingCalc {
  const purchases = h.purchases || [];
  const realizedPnl = h.realizedPnl || 0;
  const today = getToday();

  // dayChangePercent is a percentage number e.g. -2.5 means -2.5%
  const dayChangeFrac = h.dayChangePercent / 100;
  // yesterdayClose price per share
  const prevClose = dayChangeFrac !== -1 ? h.currentNav / (1 + dayChangeFrac) : h.currentNav;

  let runningShares = 0;
  let runningCost = 0;
  let todayPnlAmount = 0;

  for (const p of purchases) {
    const txType = p.type || "buy";

    if (txType === "buy") {
      const shares = p.buyNav > 0 ? p.amount / p.buyNav : 0;

      if (p.date === today) {
        // Bought today: PnL = (currentPrice - buyPrice) * shares
        todayPnlAmount += (h.currentNav - p.buyNav) * shares;
      } else {
        // Bought before today: PnL = (currentPrice - prevClose) * shares
        todayPnlAmount += (h.currentNav - prevClose) * shares;
      }

      runningShares += shares;
      runningCost += p.amount;
    } else {
      // sell
      const sellShares = p.shares ?? (p.buyNav > 0 ? p.amount / p.buyNav : 0);
      const avgCostAtSale = runningShares > 0 ? runningCost / runningShares : 0;

      if (p.date === today) {
        // Sold today: PnL = (sellPrice - prevClose) * sellShares
        todayPnlAmount += (p.buyNav - prevClose) * sellShares;
      }
      // Shares sold before today don't contribute to today's PnL

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

  // Derive today's PnL % from the actual PnL amount
  const prevValue = currentValue - todayPnlAmount;
  const todayPnlPercent = prevValue > 0 ? (todayPnlAmount / prevValue) * 100 : 0;

  return {
    totalShares,
    totalCost,
    avgCost,
    currentValue,
    holdingPnlAmount,
    holdingPnlPercent,
    todayPnlAmount,
    todayPnlPercent,
    realizedPnl,
  };
}
