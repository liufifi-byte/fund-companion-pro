export type AssetType = "fund" | "stock";
export type TransactionType = "buy" | "sell";

export interface Purchase {
  date: string;       // e.g. '2026-01-15'
  amount: number;     // 买入本金 (buy) or 卖出金额 (sell, = shares * price)
  buyNav: number;     // 成交净值/价格
  type: TransactionType; // 'buy' or 'sell'
  shares?: number;    // 卖出时的份额（股票卖出时用 shares * price 计算）
}

export interface FundTopHolding {
  name: string;
  code: string;
  percent: number;
  changePercent: number;
}

export interface FundHolding {
  id: string;
  code: string;
  name: string;
  type: AssetType;
  purchases: Purchase[];
  currentNav: number;
  dayChangePercent: number;
  updatedAt: string;
  currency?: string;
  topHoldings?: FundTopHolding[];
  realizedPnl?: number; // 累计已实现盈亏
  // Legacy fields kept for migration
  buyAmount?: number;
  buyNav?: number;
  costPrice?: number;
}
