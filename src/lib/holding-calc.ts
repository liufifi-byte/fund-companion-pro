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

  // --- Time-aware today PnL ---
  const dayChange = h.dayChangePercent / 100;
  const yesterdayClose = h.currentNav / (1 + dayChange);
  const today = getToday();
  let todayPnlAmount = 0;

  // Rebuild running state to know shares held at each tx point
  let sharesBeforeTx = 0;
  let costBeforeTx = 0;

  for (const p of purchases) {
    const txType = p.type || "buy";
    if (txType === "buy") {
      const shares = p.buyNav > 0 ? p.amount / p.buyNav : 0;
      if (p.date === today) {
        // 情形 B: today buy — PnL from buyPrice to currentPrice
        todayPnlAmount += (h.currentNav - p.buyNav) * shares;
      }
      // else: 情形 A handled after loop via remaining historic shares
      sharesBeforeTx += shares;
      costBeforeTx += p.amount;
    } else {
      const sellShares = p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0);
      if (p.date === today) {
        // 情形 C: today sell — PnL from yesterdayClose to sellPrice
        todayPnlAmount += (p.buyNav - yesterdayClose) * sellShares;
      }
      const avgAtSale = sharesBeforeTx > 0 ? costBeforeTx / sharesBeforeTx : 0;
      sharesBeforeTx = Math.max(0, sharesBeforeTx - sellShares);
      costBeforeTx = sharesBeforeTx > 0 ? sharesBeforeTx * avgAtSale : 0;
    }
  }

  // 情形 A: historic shares (bought before today, still held) enjoy full day change
  const todayBoughtShares = purchases
    .filter((p) => p.date === today && (p.type || "buy") === "buy")
    .reduce((s, p) => s + (p.buyNav > 0 ? p.amount / p.buyNav : 0), 0);
  const todaySoldShares = purchases
    .filter((p) => p.date === today && p.type === "sell")
    .reduce((s, p) => s + (p.shares || (p.buyNav > 0 ? p.amount / p.buyNav : 0)), 0);
  const historicSharesStillHeld = totalShares - todayBoughtShares;
  if (historicSharesStillHeld > 0) {
    todayPnlAmount += (h.currentNav - yesterdayClose) * historicSharesStillHeld;
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
