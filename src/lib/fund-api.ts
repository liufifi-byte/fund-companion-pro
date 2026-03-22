import { FundHolding } from "@/types/fund";

const FUND_API = "https://fundgz.1702.top/api/v2/fund";

interface FundApiResponse {
  code: number;
  data: {
    fundcode: string;
    name: string;
    dwjz: string;    // 单位净值
    gsz: string;     // 估算净值
    gszzl: string;   // 估算涨跌幅
    gztime: string;  // 估算时间
  };
}

export async function fetchFundInfo(code: string): Promise<{
  name: string;
  nav: number;
  estimatedNav: number;
  changePercent: number;
  updateTime: string;
} | null> {
  try {
    const res = await fetch(`${FUND_API}/${code}`);
    if (!res.ok) return null;
    const json: FundApiResponse = await res.json();
    if (json.code !== 200 || !json.data) return null;
    const d = json.data;
    return {
      name: d.name,
      nav: parseFloat(d.dwjz),
      estimatedNav: parseFloat(d.gsz),
      changePercent: parseFloat(d.gszzl),
      updateTime: d.gztime,
    };
  } catch {
    return null;
  }
}

export function calcProfitLoss(holding: FundHolding) {
  const shares = holding.buyAmount / holding.buyNav;
  const currentValue = shares * holding.currentNav;
  const profit = currentValue - holding.buyAmount;
  const profitPercent = (profit / holding.buyAmount) * 100;
  return { profit, profitPercent, currentValue, shares };
}
