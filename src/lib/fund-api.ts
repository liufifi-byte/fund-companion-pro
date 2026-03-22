import { FundHolding } from "@/types/fund";
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

/** Convert stock symbol input: A-share codes get .SS/.SZ suffix */
export function normalizeStockSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  // Already has suffix like AAPL, 0700.HK, 600519.SS
  if (/[A-Z]/.test(s) && !/^\d{6}$/.test(s)) return s;
  // Pure 6-digit number → A-share stock
  if (/^\d{6}$/.test(s)) {
    // 6/9 → Shanghai, 0/3 → Shenzhen
    return s.startsWith("6") || s.startsWith("9") ? `${s}.SS` : `${s}.SZ`;
  }
  return s;
}

export function calcProfitLoss(holding: FundHolding) {
  const shares = holding.buyAmount / holding.buyNav;
  const currentValue = shares * holding.currentNav;
  const profit = currentValue - holding.buyAmount;
  const profitPercent = (profit / holding.buyAmount) * 100;
  return { profit, profitPercent, currentValue, shares };
}
