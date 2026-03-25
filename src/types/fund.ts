export type AssetType = "fund" | "stock";

export interface Purchase {
  date: string;       // e.g. '2026-01-15'
  amount: number;     // 买入本金
  buyNav: number;     // 买入净值/价格
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
  // Legacy fields kept for migration
  buyAmount?: number;
  buyNav?: number;
  costPrice?: number;
}
