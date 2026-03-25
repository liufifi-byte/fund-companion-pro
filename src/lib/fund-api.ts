import { FundHolding, FundTopHolding } from "@/types/fund";
import { supabase } from "@/integrations/supabase/client";

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

/** Fetch A-share mutual fund info via Tiantian Fund JSONP */
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

/** Fetch fund top holdings via edge function */
export async function fetchFundHoldings(fundCode: string): Promise<FundTopHolding[]> {
  try {
    const { data, error } = await supabase.functions.invoke("fund-holdings", {
      body: { fundCode },
    });
    if (error || !data) return [];
    return data.holdings || [];
  } catch {
    return [];
  }
}

/** Fetch stock/ETF info via Yahoo Finance (proxied through edge function) */
export async function fetchStockInfo(symbol: string): Promise<{
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  currency: string;
  updateTime: string;
} | null> {
  try {
    const { data, error } = await supabase.functions.invoke("yahoo-finance", {
      body: { symbol },
    });
    if (error || !data || data.error) return null;
    return {
      name: data.name,
      price: data.price,
      previousClose: data.previousClose,
      changePercent: data.changePercent,
      currency: data.currency || "USD",
      updateTime: new Date(data.marketTime * 1000).toLocaleString("zh-CN"),
    };
  } catch {
    return null;
  }
}

/** Convert stock symbol input based on selected market */
export function normalizeStockSymbol(input: string, market: string): string {
  const s = input.trim().toUpperCase();
  if (s.includes(".")) return s;

  switch (market) {
    case "cn_stock": {
      const code = s.replace(/\D/g, "").padStart(6, "0");
      return code.startsWith("6") || code.startsWith("9") ? `${code}.SS` : `${code}.SZ`;
    }
    case "hk": {
      const num = parseInt(s.replace(/\D/g, ""), 10);
      if (isNaN(num)) return `${s}.HK`;
      return `${num.toString().padStart(4, "0")}.HK`;
    }
    case "us":
    default:
      return s;
  }
}

// Legacy calc functions removed — use calcHolding from @/lib/holding-calc instead
