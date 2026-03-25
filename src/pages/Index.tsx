import { useState, useEffect } from "react";
import { FundHolding, Purchase } from "@/types/fund";
import { Transaction, CurrentPrice } from "@/types/transaction";
import AddFundForm from "@/components/AddFundForm";
import FundCard from "@/components/FundCard";
import FundListItem from "@/components/FundListItem";
import PortfolioSummary from "@/components/PortfolioSummary";
import AddTransactionModal from "@/components/AddTransactionModal";
import PositionCard from "@/components/PositionCard";
import { usePortfolioCalculation } from "@/hooks/usePortfolioCalculation";
import { fetchFundInfo, fetchStockInfo, fetchFundHoldings } from "@/lib/fund-api";
import { RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mockTransactions } from "@/data/mockTransactions";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "fund-holdings";
const TX_STORAGE_KEY = "transaction-ledger";

function migrateHolding(h: any): FundHolding {
  if (h.purchases && h.purchases.length > 0) return h as FundHolding;
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...h,
    purchases: [{
      date: h.costPrice ? today : today,
      amount: h.buyAmount || 0,
      buyNav: h.costPrice || h.buyNav || h.currentNav || 1,
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

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TX_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(mockTransactions));
    return mockTransactions;
  } catch { return mockTransactions; }
}

function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(txs));
}

const MOCK_PRICES: Record<string, CurrentPrice> = {
  CRWV: { code: "CRWV", price: 56.80, dayChangePercent: 1.25, currency: "USD", updatedAt: new Date().toLocaleString("zh-CN") },
  "110011": { code: "110011", price: 5.38, dayChangePercent: -0.56, currency: "CNY", updatedAt: new Date().toLocaleString("zh-CN") },
  "BTC-USD": { code: "BTC-USD", price: 87350.00, dayChangePercent: 2.10, currency: "USD", updatedAt: new Date().toLocaleString("zh-CN") },
  AAPL: { code: "AAPL", price: 195.20, dayChangePercent: 0.85, currency: "USD", updatedAt: new Date().toLocaleString("zh-CN") },
};

export default function Index() {
  const [holdings, setHoldings] = useState<FundHolding[]>(loadHoldings);
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [currentPrices] = useState<Record<string, CurrentPrice>>(MOCK_PRICES);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useIsMobile();

  const positions = usePortfolioCalculation(transactions, currentPrices);

  useEffect(() => { saveHoldings(holdings); }, [holdings]);
  useEffect(() => { saveTransactions(transactions); }, [transactions]);

  const addHolding = (h: FundHolding) => setHoldings((prev) => [h, ...prev]);
  const updatePurchases = (id: string, purchases: Purchase[]) => {
    setHoldings((prev) => prev.map((h) => h.id !== id ? h : { ...h, purchases }));
    toast.success("买入记录已更新");
  };
  const addTransaction = (tx: Transaction) => setTransactions((prev) => [...prev, tx]);
  const removePosition = (code: string) => setTransactions((prev) => prev.filter((tx) => tx.assetCode !== code));
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

        {/* Transaction-based positions */}
        <div className="flex items-center justify-between mb-3 mt-8 fade-in-up">
          <h2 className="text-xs font-medium text-muted-foreground">交易账本 · {positions.filter(p => p.quantity > 0).length} 只持仓</h2>
          <AddTransactionModal onAdd={addTransaction} />
        </div>

        {positions.filter(p => p.quantity > 0).length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {positions.filter((p) => p.quantity > 0).map((p, i) => (
              <PositionCard key={p.assetCode} position={p} onRemove={removePosition} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 fade-in-up">
            <p className="text-xs text-muted-foreground">点击"记一笔"添加交易记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
