import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CandlestickChart, { type OHLCPoint } from "@/components/CandlestickChart";
import MacroCockpit from "@/components/MacroCockpit";

interface MarketIndex {
  symbol: string;
  label: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  ohlc: OHLCPoint[];
  loading: boolean;
  isCustom?: boolean;
}

const DEFAULT_INDICES = [
  { symbol: "DX-Y.NYB", label: "美元指数" },
  { symbol: "GC=F", label: "黄金" },
  { symbol: "BZ=F", label: "布伦特原油" },
  { symbol: "BTC-USD", label: "比特币" },
  { symbol: "^KS11", label: "韩国综合指数" },
  { symbol: "^IXIC", label: "纳斯达克指数" },
];

const DEFAULT_SYMBOLS = new Set(DEFAULT_INDICES.map((i) => i.symbol));

const CUSTOM_STORAGE_KEY = "market-custom-symbols";

function loadCustomSymbols(): { symbol: string; label: string }[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomSymbols(list: { symbol: string; label: string }[]) {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
}

const RANGES = [
  { value: "1d", label: "1天" },
  { value: "5d", label: "1周" },
  { value: "1mo", label: "1月" },
  { value: "3mo", label: "3月" },
] as const;

export default function Market() {
  const { toast } = useToast();
  const [customSymbols, setCustomSymbols] = useState(loadCustomSymbols);
  const allIndices = [...DEFAULT_INDICES, ...customSymbols.map((s) => ({ ...s, isCustom: true }))];

  const [indices, setIndices] = useState<MarketIndex[]>(
    allIndices.map((i) => ({
      ...i,
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      ohlc: [],
      loading: true,
      isCustom: !DEFAULT_SYMBOLS.has(i.symbol),
    }))
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [range, setRange] = useState<string>("1mo");
  const [showAddInput, setShowAddInput] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const lastUpdatedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const macroCockpitRef = useRef<{ refresh: () => Promise<void> }>(null);

  const fetchAll = useCallback(async () => {
    const currentIndices = [...DEFAULT_INDICES, ...loadCustomSymbols()];
    setRefreshing(true);
    setRefreshError(false);
    let hasError = false;

    const results = await Promise.all(
      currentIndices.map(async (idx) => {
        try {
          const { data, error } = await supabase.functions.invoke("yahoo-finance", {
            body: { symbol: idx.symbol, range, _t: Date.now() },
          });
          if (error || !data || data.error) {
            hasError = true;
            return { ...idx, price: null, previousClose: null, change: null, changePercent: null, ohlc: [], loading: false, isCustom: !DEFAULT_SYMBOLS.has(idx.symbol) };
          }
          return {
            ...idx,
            price: data.price,
            previousClose: data.previousClose ?? data.price,
            change: data.change,
            changePercent: data.changePercent,
            ohlc: (data.ohlc || []) as OHLCPoint[],
            loading: false,
            isCustom: !DEFAULT_SYMBOLS.has(idx.symbol),
          };
        } catch {
          hasError = true;
          return { ...idx, price: null, previousClose: null, change: null, changePercent: null, ohlc: [], loading: false, isCustom: !DEFAULT_SYMBOLS.has(idx.symbol) };
        }
      })
    );
    setIndices(results);
    setRefreshing(false);

    if (hasError) {
      setRefreshError(true);
      toast({ title: "部分数据更新失败", variant: "destructive" });
      setTimeout(() => setRefreshError(false), 3000);
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setLastUpdated(timeStr);
      if (lastUpdatedTimerRef.current) clearTimeout(lastUpdatedTimerRef.current);
      lastUpdatedTimerRef.current = setTimeout(() => setLastUpdated(null), 2000);
    }
  }, [range, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    // Refresh both charts and macro cockpit
    const cockpitRefresh = macroCockpitRef.current?.refresh();
    await Promise.all([fetchAll(), cockpitRefresh].filter(Boolean));
  };

  const handleAddSymbol = async () => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;
    if ([...DEFAULT_INDICES, ...customSymbols].some((i) => i.symbol.toUpperCase() === sym)) {
      setNewSymbol("");
      setShowAddInput(false);
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("yahoo-finance", {
        body: { symbol: sym, range, _t: Date.now() },
      });
      if (error || !data || data.error) {
        toast({
          title: "未找到该代码",
          description: "请检查拼写。加密货币需加 -USD 后缀（如 SOL-USD），A股需加 .SS 或 .SZ 后缀。",
          variant: "destructive",
        });
        setAdding(false);
        return;
      }
      const entry = { symbol: data.symbol || sym, label: data.name || sym };
      const updated = [...customSymbols, entry];
      setCustomSymbols(updated);
      saveCustomSymbols(updated);
      setIndices((prev) => [
        ...prev,
        {
          ...entry,
          price: data.price,
          previousClose: data.previousClose ?? data.price,
          change: data.change,
          changePercent: data.changePercent,
          ohlc: (data.ohlc || []) as OHLCPoint[],
          loading: false,
          isCustom: true,
        },
      ]);
    } catch { /* ignore */ }
    setAdding(false);
    setNewSymbol("");
    setShowAddInput(false);
  };

  const removeCustom = (symbol: string) => {
    const updated = customSymbols.filter((s) => s.symbol !== symbol);
    setCustomSymbols(updated);
    saveCustomSymbols(updated);
    setIndices((prev) => prev.filter((i) => i.symbol !== symbol));
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "--";
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number | null) => {
    if (change === null) return "--";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}`;
  };

  const formatPercent = (pct: number | null) => {
    if (pct === null) return "";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  };

  const chartHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 180 : 220;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground tracking-tight">全球行情</h1>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground animate-in fade-in-0 duration-300">
                已更新 {lastUpdated}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className={`text-xs h-8 transition-colors ${refreshError ? "text-destructive hover:text-destructive" : ""}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              {refreshError ? "部分失败" : "刷新"}
            </Button>
          </div>
        </div>

        <MacroCockpit ref={macroCockpitRef} />

        {/* Deep Charts section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-muted-foreground tracking-wide">深度图表</h2>
          {!showAddInput && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowAddInput(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加图表
            </Button>
          )}
        </div>

        {/* Inline add input */}
        {showAddInput && (
          <div className="flex gap-2 mb-3 items-center animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <Input
              placeholder="输入代码，如 AAPL、000001.SS"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
              className="h-8 text-xs flex-1"
              autoFocus
            />
            <Button size="sm" className="h-8 text-xs px-3" onClick={handleAddSymbol} disabled={adding}>
              {adding ? "..." : "添加"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowAddInput(false); setNewSymbol(""); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1 mb-4">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3">
          {indices.map((idx) => {
            const isUp = (idx.change ?? 0) >= 0;

            return (
              <Card key={idx.symbol} className="overflow-hidden relative">
                {idx.isCustom && (
                  <button
                    onClick={() => removeCustom(idx.symbol)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-muted/80 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    aria-label="删除"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{idx.label}</p>
                      <p className="text-xs text-muted-foreground">{idx.symbol}</p>
                    </div>
                    {idx.loading ? (
                      <div className="h-10 w-24 animate-pulse rounded bg-muted" />
                    ) : (
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {formatPrice(idx.price)}
                        </p>
                        <p
                          className={`text-xs font-medium tabular-nums ${
                            idx.change === null
                              ? "text-muted-foreground"
                              : isUp
                              ? "text-[hsl(var(--fund-rise))]"
                              : "text-[hsl(var(--fund-fall))]"
                          }`}
                        >
                          {formatChange(idx.change)} {formatPercent(idx.changePercent)}
                        </p>
                      </div>
                    )}
                  </div>

                  {idx.loading ? (
                    <div className="h-[180px] sm:h-[220px] w-full animate-pulse rounded bg-muted" />
                  ) : idx.ohlc.length > 1 ? (
                    <CandlestickChart
                      data={idx.ohlc}
                      previousClose={idx.previousClose}
                      height={chartHeight}
                    />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
