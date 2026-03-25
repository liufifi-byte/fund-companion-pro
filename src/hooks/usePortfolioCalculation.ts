import { useMemo } from "react";
import { Transaction, CurrentPrice, PortfolioPosition } from "@/types/transaction";

export function calculatePositions(
  transactions: Transaction[],
  currentPrices: Record<string, CurrentPrice>
): PortfolioPosition[] {
  // Group transactions by assetCode
  const grouped = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = grouped.get(tx.assetCode) || [];
    list.push(tx);
    grouped.set(tx.assetCode, list);
  }

  const positions: PortfolioPosition[] = [];

  for (const [code, txs] of grouped) {
    // Sort by date
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));

    let totalBuyQuantity = 0;
    let totalBuyAmount = 0; // sum of (price * quantity) for buys
    let realizedPnL = 0;
    let totalSellQuantity = 0;

    for (const tx of sorted) {
      if (tx.type === "BUY") {
        totalBuyQuantity += tx.quantity;
        totalBuyAmount += tx.price * tx.quantity;
      } else {
        // SELL
        const avgCostAtSell = totalBuyQuantity > 0 ? totalBuyAmount / totalBuyQuantity : 0;
        realizedPnL += (tx.price - avgCostAtSell) * tx.quantity - tx.fee;
        totalSellQuantity += tx.quantity;
      }
    }

    // Subtract buy fees from realized PnL proportionally is complex;
    // simpler: deduct all buy fees from total
    const totalBuyFees = sorted.filter(t => t.type === "BUY").reduce((s, t) => s + t.fee, 0);

    const quantity = totalBuyQuantity - totalSellQuantity;
    const weightedAvgCost = totalBuyQuantity > 0 ? totalBuyAmount / totalBuyQuantity : 0;

    const priceInfo = currentPrices[code];
    const currentPrice = priceInfo?.price ?? weightedAvgCost;
    const unrealizedPnL = (currentPrice - weightedAvgCost) * quantity - totalBuyFees;
    const unrealizedPnLPercent = weightedAvgCost > 0
      ? ((currentPrice - weightedAvgCost) / weightedAvgCost) * 100
      : 0;

    const assetName = sorted[0]?.assetName ?? code;

    positions.push({
      assetCode: code,
      assetName: assetName,
      quantity,
      weightedAvgCost,
      currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL,
      totalBuyAmount,
      totalBuyQuantity,
      dayChangePercent: priceInfo?.dayChangePercent ?? 0,
      currency: priceInfo?.currency,
      updatedAt: priceInfo?.updatedAt ?? "",
      transactions: sorted,
    });
  }

  return positions;
}

export function usePortfolioCalculation(
  transactions: Transaction[],
  currentPrices: Record<string, CurrentPrice>
): PortfolioPosition[] {
  return useMemo(
    () => calculatePositions(transactions, currentPrices),
    [transactions, currentPrices]
  );
}
