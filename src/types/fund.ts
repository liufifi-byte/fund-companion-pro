export type AssetType = "fund" | "stock";

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
}
