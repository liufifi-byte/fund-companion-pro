import { FundHolding } from "@/types/fund";

interface FundData {
  fundcode: string;
  name: string;
  jzrq: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
}

function fetchJsonp(url: string, callbackName: string): Promise<FundData> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("请求超时"));
    }, 8000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      script.remove();
    }

    (window as any)[callbackName] = (data: FundData) => {
      cleanup();
      resolve(data);
    };

    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error("请求失败"));
    };
    document.head.appendChild(script);
  });
}

export async function fetchFundInfo(code: string): Promise<{
  name: string;
  nav: number;
  estimatedNav: number;
  changePercent: number;
  updateTime: string;
} | null> {
  try {
    const cbName = `jsonpgz`;
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    const data = await fetchJsonp(url, cbName);
    if (!data || !data.fundcode) return null;
    return {
      name: data.name,
      nav: parseFloat(data.dwjz),
      estimatedNav: parseFloat(data.gsz),
      changePercent: parseFloat(data.gszzl),
      updateTime: data.gztime,
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
