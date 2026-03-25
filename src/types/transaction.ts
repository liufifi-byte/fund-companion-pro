export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  assetCode: string;
  assetName: string;
  type: TransactionType;
  price: number;
  quantity: number;
  fee: number;
  date: string; // ISO date string
}

export interface CurrentPrice {
  code: string;
  price: number;
  dayChangePercent: number;
  currency?: string;
  updatedAt: string;
}

export interface PortfolioPosition {
  assetCode: string;
  assetName: string;
  quantity: number;
  weightedAvgCost: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalBuyAmount: number;
  totalBuyQuantity: number;
  dayChangePercent: number;
  currency?: string;
  updatedAt: string;
  transactions: Transaction[];
}
