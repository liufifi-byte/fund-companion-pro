import { useState, useEffect, useRef } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import AddFundForm from "@/components/AddFundForm";
import FundCard from "@/components/FundCard";
import FundListItem from "@/components/FundListItem";
import PortfolioSummary from "@/components/PortfolioSummary";
import { fetchFundInfo, fetchStockInfo, fetchFundHoldings } from "@/lib/fund-api";
import { RefreshCw, BarChart3, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "fund-holdings";

function migrateHolding(h: any): FundHolding {
  if (h.purchases && h.purchases.length > 0) {
    const migrated = h.purchases.map((p: any) => ({ ...p, type: p.type || "buy" }));
    return { ...h, purchases: migrated } as FundHolding;
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...h,
    purchases: [{
      date: h.costPrice ? today : today,
      amount: h.buyAmount || 0,
      buyNav: h.costPrice || h.buyNav || h.currentNav || 1,
      type: "buy" as const,
    }],
  };
}

function loadHoldings(): FundHolding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map(migrateHolding);
  } catch { return []; }
}

function saveHoldings(h: FundHolding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
}

type HoldingTab = "all" | "cn_fund" | "cn_stock" | "hk" | "us";

const TABS: { value: HoldingTab; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cn_fund", label: "场外基金" },
  { value: "cn_stock", label: "A股" },
  { value: "hk", label: "港股" },
  { value: "us", label: "美股" },
];

function inferTab(h: FundHolding): HoldingTab {
  if (h.type === "fund") return "cn_fund";
  const code = h.code.toUpperCase();
  if (code.endsWith(".SS") || code.endsWith(".SZ")) return "cn_stock";
  if (code.endsWith(".HK")) return "hk";
  return "us";
}

const EMPTY_HINTS: Record<Exclude<HoldingTab, "all">, { sub: string }> = {
  cn_fund: { sub: "输入基金代码和买入净值开始记录" },
  cn_stock: { sub: "输入股票代码和买入价格开始记录" },
  hk: { sub: "输入港股代码和买入价格(HK$)开始记录" },
  us: { sub: "输入美股代码和买入价格($)开始记录" },
};

export default function Index() {
  const [holdings, setHoldings] = useState<FundHolding[]>(loadHoldings);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HoldingTab>("all");
  const isMobile = useIsMobile();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveHoldings(holdings); }, [holdings]);

  const addHolding = (h: FundHolding) => setHoldings((prev) => [h, ...prev]);
  const updatePurchases = (id: string, purchases: Purchase[], realizedPnl?: number) => {
    setHoldings((prev) => prev.map((h) => h.id !== id ? h : { ...h, purchases, ...(realizedPnl !== undefined ? { realizedPnl } : {}) }));
  };
  const removeHolding = (id: string) => setHoldings((prev) => prev.filter((h) => h.id !== id));

  const refreshAll = async () => {
    if (holdings.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(
      holdings.map(async (h) => {
        if (h.type === "stock") {
          const info = await fetchStockInfo(h.code);
          if (!info) return h;
          return { ...h, currentNav: info.price, dayChangePercent: info.changePercent, updatedAt: info.updateTime };
        } else {
          const [info, topHoldings] = await Promise.all([fetchFundInfo(h.code), fetchFundHoldings(h.code)]);
          if (!info) return h;
          return { ...h, currentNav: info.estimatedNav, dayChangePercent: info.changePercent, updatedAt: info.updateTime, topHoldings: topHoldings.length > 0 ? topHoldings : h.topHoldings };
        }
      })
    );
    setHoldings(updated);
    setRefreshing(false);
    toast.success("已刷新全部数据");
  };

  const filtered = activeTab === "all" ? holdings : holdings.filter((h) => inferTab(h) === activeTab);

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = formRef.current?.querySelector("input");
      input?.focus();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky mobile header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b md:border-b-0 md:static md:bg-transparent md:backdrop-blur-none">
        <div className="max-w-3xl mx-auto px-4 py-3 md:py-8 flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-xl font-bold text-foreground tracking-tight">投资助手</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">实时跟踪基金与股票涨跌盈亏</p>
          </div>
          {holdings.length > 0 && (
            <Button variant="ghost" size="sm" onClick={refreshAll} disabled={refreshing} className="text-xs h-8 shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 md:pt-0">
        {/* Add form */}
        <div ref={formRef} className="mb-4 fade-in-up">
          <AddFundForm onAdd={addHolding} />
        </div>

        {/* Summary */}
        <div className="mb-4">
          <PortfolioSummary holdings={holdings} />
        </div>

        {/* Holdings header with tabs */}
        {holdings.length > 0 && (
          <div className="mb-3 fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-muted-foreground">持仓 · {holdings.length} 只</h2>
            </div>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Holdings list */}
        {holdings.length > 0 ? (
          filtered.length > 0 ? (
            isMobile ? (
              <div className="space-y-2">
                {filtered.map((h) => (
                  <FundListItem key={h.id} holding={h} onRemove={removeHolding} onUpdatePurchases={updatePurchases} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((h, i) => (
                  <FundCard key={h.id} holding={h} onRemove={removeHolding} onUpdatePurchases={updatePurchases} index={i} />
                ))}
              </div>
            )
          ) : (
            /* Empty state for specific tab */
            activeTab !== "all" && (
              <div className="text-center py-12 fade-in-up">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">还没有添加持仓</p>
                <p className="text-xs text-muted-foreground/70 mb-4">{EMPTY_HINTS[activeTab].sub}</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={focusForm}>
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  添加第一笔
                </Button>
              </div>
            )
          )
        ) : (
          <div className="text-center py-12 fade-in-up">
            <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">选择基金或股票，输入代码和买入金额开始跟踪</p>
          </div>
        )}
      </div>
    </div>
  );
}
