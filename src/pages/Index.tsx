import { useState, useEffect } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import AddFundForm from "@/components/AddFundForm";
import FundCard from "@/components/FundCard";
import FundListItem from "@/components/FundListItem";
import PortfolioSummary from "@/components/PortfolioSummary";
import { fetchFundInfo, fetchStockInfo, fetchFundHoldings } from "@/lib/fund-api";
import { RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "fund-holdings";

function migrateHolding(h: any): FundHolding {
  if (h.purchases && h.purchases.length > 0) {
    // Ensure all purchases have a type field
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

export default function Index() {
  const [holdings, setHoldings] = useState<FundHolding[]>(loadHoldings);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useIsMobile();

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
        <div className="mb-4 fade-in-up">
          <AddFundForm onAdd={addHolding} />
        </div>

        {/* Summary */}
        <div className="mb-4">
          <PortfolioSummary holdings={holdings} />
        </div>

        {/* Holdings header */}
        {holdings.length > 0 && (
          <div className="flex items-center justify-between mb-3 fade-in-up">
            <h2 className="text-xs font-medium text-muted-foreground">持仓 · {holdings.length} 只</h2>
          </div>
        )}

        {/* Holdings: list on mobile, grid on desktop */}
        {holdings.length > 0 ? (
          isMobile ? (
            <div className="space-y-2">
              {holdings.map((h) => (
                <FundListItem key={h.id} holding={h} onRemove={removeHolding} onUpdatePurchases={updatePurchases} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {holdings.map((h, i) => (
                <FundCard key={h.id} holding={h} onRemove={removeHolding} onUpdatePurchases={updatePurchases} index={i} />
              ))}
            </div>
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
