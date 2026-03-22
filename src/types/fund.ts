export type AssetType = "fund" | "stock";

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
  buyAmount: number;
  buyNav: number;
  currentNav: number;
  dayChangePercent: number;
  updatedAt: string;
  currency?: string;
  topHoldings?: FundTopHolding[];
}
