import { useState, useEffect } from "react";
import { FundHolding } from "@/types/fund";
import AddFundForm from "@/components/AddFundForm";
import FundCard from "@/components/FundCard";
import PortfolioSummary from "@/components/PortfolioSummary";
import { fetchFundInfo } from "@/lib/fund-api";
import { RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STORAGE_KEY = "fund-holdings";

function loadHoldings(): FundHolding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHoldings(h: FundHolding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
}

export default function Index() {
  const [holdings, setHoldings] = useState<FundHolding[]>(loadHoldings);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  const addHolding = (h: FundHolding) => {
    setHoldings((prev) => [h, ...prev]);
  };

  const removeHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const refreshAll = async () => {
    if (holdings.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(
      holdings.map(async (h) => {
        const info = await fetchFundInfo(h.code);
        if (!info) return h;
        return {
          ...h,
          currentNav: info.estimatedNav,
          dayChangePercent: info.changePercent,
          updatedAt: info.updateTime,
        };
      })
    );
    setHoldings(updated);
    setRefreshing(false);
    toast.success("已刷新全部基金数据");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 fade-in-up">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">基金助手</h1>
            <p className="text-xs text-muted-foreground">实时跟踪基金涨跌与盈亏</p>
          </div>
        </div>

        {/* Add form */}
        <div className="mb-6 fade-in-up" style={{ animationDelay: "100ms" }}>
          <AddFundForm onAdd={addHolding} />
        </div>

        {/* Summary */}
        <div className="mb-6">
          <PortfolioSummary holdings={holdings} />
        </div>

        {/* Holdings header */}
        {holdings.length > 0 && (
          <div className="flex items-center justify-between mb-4 fade-in-up" style={{ animationDelay: "150ms" }}>
            <h2 className="text-sm font-medium text-muted-foreground">
              持仓 · {holdings.length} 只
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAll}
              disabled={refreshing}
              className="text-xs h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        )}

        {/* Holdings grid */}
        {holdings.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {holdings.map((h, i) => (
              <FundCard key={h.id} holding={h} onRemove={removeHolding} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 fade-in-up" style={{ animationDelay: "200ms" }}>
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              输入基金代码和买入金额，开始跟踪
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
